import {
  OrderNotification,
  OrderSharedNotification,
  OutboxItem,
} from "@/types/notification";
import type { CacheService } from "@config/cache";

/* -----------------------------
   Retry + Circuit Breaker Utils
----------------------------- */

type RetryOpts = {
  attempts?: number;
  initialDelayMs?: number;
  factor?: number;
  maxDelayMs?: number;
  jitter?: boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class CircuitBreaker {
  private failureCount = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  private nextAttempt = Date.now();

  constructor(private threshold = 3, private cooldownMs = 10_000) {}

  canAttempt() {
    if (this.state === "open" && Date.now() < this.nextAttempt) return false;
    if (this.state === "open" && Date.now() >= this.nextAttempt) {
      this.state = "half-open";
      return true;
    }
    return true;
  }

  success() {
    this.failureCount = 0;
    this.state = "closed";
  }

  fail() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = "open";
      this.nextAttempt = Date.now() + this.cooldownMs;
      console.warn(`🚨 Redis circuit opened for ${this.cooldownMs / 1000}s`);
    }
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  breaker: CircuitBreaker,
  opts: RetryOpts = {}
): Promise<T> {
  const {
    attempts = 5,
    initialDelayMs = 200,
    factor = 2,
    maxDelayMs = 10_000,
    jitter = true,
  } = opts;

  if (!breaker.canAttempt()) {
    throw new Error("CircuitBreaker: Redis temporarily disabled");
  }

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    attempt++;
    try {
      const res = await fn();
      breaker.success();
      return res;
    } catch (err) {
      breaker.fail();
      if (attempt >= attempts) throw err;
      const jitterMs = jitter
        ? Math.floor(Math.random() * Math.min(1000, delay))
        : 0;
      const waitMs = Math.min(maxDelayMs, delay) + jitterMs;
      console.warn(
        `Redis op failed (attempt ${attempt}) — retrying in ${waitMs}ms`,
        err
      );
      await sleep(waitMs);
      delay = Math.min(maxDelayMs, delay * factor);
    }
  }
}

/* -----------------------------
   Notification Service
----------------------------- */

export class NotificationService {
  private readonly hashKey = "admin:active_orders";
  private readonly channel = "admin:notifications";
  private readonly outboxKey = "outbox:notifications";
  private readonly deadLetterKey = "outbox:dead_letter";
  private readonly maxRetries = 5;
  private readonly maxOutboxAge = 86400000; // 24 hours in ms
  private readonly breaker = new CircuitBreaker();

  constructor(private cache: CacheService) {}

  /**
   * Add new confirmed order notification.
   * Uses Redis if available, otherwise outbox fallback.
   */
  async notifyConfirmedOrder(data: OrderNotification["data"]): Promise<void> {
    const notification: OrderNotification = {
      type: "ORDER_CONFIRMED",
      data,
      timestamp: new Date().toISOString(),
    };

    try {
      await withRetry(
        () =>
          this.cache.hset(this.hashKey, data.id, JSON.stringify(notification)),
        this.breaker
      );
      await withRetry(
        () =>
          this.cache.publish(
            this.channel,
            JSON.stringify({ action: "new", notification })
          ),
        this.breaker
      );

      console.log(`📢 New order notification saved + published: ${data.id}`);
    } catch (err) {
      console.error("❌ Failed to send notification — queued in outbox", err);
      await this.addToOutbox({
        id: `${data.id}-${Date.now()}`,
        action: "new",
        payload: notification,
        channel: this.channel,
        createdAt: Date.now(),
        retryCount: 0,
      });
    }
  }

  /**
   * Mark order as shared with rider.
   * Publishes event to grey out UI for all admins.
   */
  async notifyOrderShared(data: {
    id: string;
    payment_reference: string;
    shared_by: string;
  }): Promise<void> {
    const notification: OrderSharedNotification = {
      type: "ORDER_SHARED",
      data,
      timestamp: new Date().toISOString(),
    };

    try {
      // Update the order in hash with shared flag
      const existingOrder = await withRetry(
        () => this.cache.hget(this.hashKey, data.id),
        this.breaker
      );

      if (existingOrder) {
        const parsed = JSON.parse(existingOrder);
        parsed.shared_with_rider = true;
        parsed.shared_by = data.shared_by;
        parsed.shared_at = new Date().toISOString();

        await withRetry(
          () => this.cache.hset(this.hashKey, data.id, JSON.stringify(parsed)),
          this.breaker
        );
      }

      // Publish to all connected admins
      await withRetry(
        () =>
          this.cache.publish(
            this.channel,
            JSON.stringify({ action: "shared", notification })
          ),
        this.breaker
      );

      console.log(`📤 Order marked as shared: ${data.id} by ${data.shared_by}`);
    } catch (err) {
      console.error("❌ Failed to mark as shared — queued in outbox", err);
      await this.addToOutbox({
        id: `shared-${data.id}-${Date.now()}`,
        action: "shared",
        payload: notification,
        channel: this.channel,
        createdAt: Date.now(),
        retryCount: 0,
      });
    }
  }

  /**
   * Remove order when admin accepts/declines it.
   */
  async removeOrder(orderId: string): Promise<void> {
    try {
      await withRetry(
        () => this.cache.hdel(this.hashKey, orderId),
        this.breaker
      );
      await withRetry(
        () =>
          this.cache.publish(
            this.channel,
            JSON.stringify({ action: "removed", orderId })
          ),
        this.breaker
      );
      console.log(`🗑️ Removed order from active list: ${orderId}`);
    } catch (err) {
      console.error("❌ Failed to remove order — queued in outbox", err);
      await this.addToOutbox({
        id: `remove-${orderId}-${Date.now()}`,
        action: "removed",
        payload: {
          type: "ORDER_REMOVED",
          data: { id: orderId },
          timestamp: new Date().toISOString(),
        },
        channel: this.channel,
        createdAt: Date.now(),
        retryCount: 0,
      });
    }
  }

  /**
   * Add item to outbox with metadata.
   */
  private async addToOutbox(item: OutboxItem): Promise<void> {
    try {
      await this.cache.rpush(this.outboxKey, JSON.stringify(item));
      console.log(`📥 Added to outbox: ${item.id}`);
    } catch (err) {
      console.error("❌ CRITICAL: Failed to add to outbox", err);
    }
  }

  /**
   * Retrieve all active orders.
   */
  async getActiveOrders(): Promise<OrderNotification[]> {
    const entries = await withRetry(
      () => this.cache.hgetall(this.hashKey),
      this.breaker
    );

    if (!entries || Object.keys(entries).length === 0) {
      return [];
    }

    return Object.values(entries).map((raw) => JSON.parse(raw));
  }

  /**
   * Cleanup stale entries older than X hours.
   */
  async cleanupOldOrders(maxAgeHours = 12): Promise<void> {
    const now = Date.now();
    const entries = await withRetry(
      () => this.cache.hgetall(this.hashKey),
      this.breaker
    );

    if (!entries || Object.keys(entries).length === 0) {
      console.log("✅ No orders to clean up");
      return;
    }

    let cleanedCount = 0;

    for (const [id, raw] of Object.entries(entries)) {
      try {
        const notif = JSON.parse(raw) as OrderNotification;
        const age = (now - new Date(notif.timestamp).getTime()) / 3600000;
        if (age > maxAgeHours) {
          await this.cache.hdel(this.hashKey, id);
          cleanedCount++;
          console.log(`🧹 Cleaned stale order ${id} (${age.toFixed(1)}h old)`);
        }
      } catch {
        await this.cache.hdel(this.hashKey, id);
        cleanedCount++;
        console.log(`🧹 Removed corrupted entry: ${id}`);
      }
    }

    if (cleanedCount > 0) {
      console.log(`✅ Cleanup completed: ${cleanedCount} orders removed`);
    }
  }

  /**
   * Process outbox with improved retry logic and dead letter queue.
   */
  async processOutboxBatch(maxItems = 20): Promise<{
    processed: number;
    failed: number;
    movedToDeadLetter: number;
  }> {
    let processed = 0;
    let failed = 0;
    let movedToDeadLetter = 0;

    for (let i = 0; i < maxItems; i++) {
      const raw = await this.cache.lpop(this.outboxKey);
      if (!raw) break;

      let item: OutboxItem;
      try {
        item = JSON.parse(raw);
      } catch (err) {
        console.error("❌ Invalid JSON in outbox, discarding:", err);
        failed++;
        continue;
      }

      // Check if item is too old
      const age = Date.now() - item.createdAt;
      if (age > this.maxOutboxAge) {
        console.warn(
          `⏰ Outbox item expired: ${item.id} (${(age / 3600000).toFixed(
            1
          )}h old)`
        );
        await this.moveToDeadLetter(item, "Expired");
        movedToDeadLetter++;
        continue;
      }

      // Check retry limit
      if (item.retryCount >= this.maxRetries) {
        console.warn(`🚫 Max retries exceeded for: ${item.id}`);
        await this.moveToDeadLetter(item, "Max retries exceeded");
        movedToDeadLetter++;
        continue;
      }

      // Try to process
      try {
        if (item.action === "new") {
          await withRetry(
            () =>
              this.cache.hset(
                this.hashKey,
                item.payload.data.id,
                JSON.stringify(item.payload)
              ),
            this.breaker
          );
        }

        await withRetry(
          () =>
            this.cache.publish(
              item.channel,
              JSON.stringify({ action: item.action, ...item.payload })
            ),
          this.breaker
        );

        processed++;
        console.log(
          `✅ Outbox: processed ${item.id} (attempt ${item.retryCount + 1})`
        );
      } catch (err) {
        console.error(`❌ Outbox processing failed for ${item.id}:`, err);

        // Increment retry count and requeue
        item.retryCount++;
        item.lastError = err instanceof Error ? err.message : String(err);

        // Exponential backoff: push to end of queue with delay
        await this.cache.rpush(this.outboxKey, JSON.stringify(item));
        failed++;
      }
    }

    return { processed, failed, movedToDeadLetter };
  }

  /**
   * Move failed items to dead letter queue for manual inspection.
   */
  private async moveToDeadLetter(
    item: OutboxItem,
    reason: string
  ): Promise<void> {
    try {
      const deadLetterItem = {
        ...item,
        movedAt: Date.now(),
        reason,
      };
      await this.cache.rpush(
        this.deadLetterKey,
        JSON.stringify(deadLetterItem)
      );
      console.log(`☠️ Moved to dead letter: ${item.id} - ${reason}`);
    } catch (err) {
      console.error("❌ Failed to move to dead letter:", err);
    }
  }

  /**
   * Cleanup old outbox items (last resort safety mechanism).
   */
  async cleanupOutbox(): Promise<void> {
    const length = await this.cache.llen(this.outboxKey);

    if (length === 0) {
      console.log("✅ Outbox is empty");
      return;
    }

    let cleaned = 0;
    const items = await this.cache.lrange(this.outboxKey, 0, -1);

    // Clear the list
    await this.cache.del(this.outboxKey);

    for (const raw of items) {
      if (!raw) continue;

      try {
        const item: OutboxItem = JSON.parse(raw);
        const age = Date.now() - item.createdAt;

        // Re-add items that aren't too old
        if (age < this.maxOutboxAge && item.retryCount < this.maxRetries) {
          await this.cache.rpush(this.outboxKey, raw);
        } else {
          await this.moveToDeadLetter(
            item,
            age > this.maxOutboxAge ? "Expired" : "Max retries"
          );
          cleaned++;
        }
      } catch (err) {
        cleaned++;
      }
    }

    console.log(
      `🧹 Outbox cleanup: ${cleaned} items removed, ${
        length - cleaned
      } retained`
    );
  }

  /**
   * Get statistics about the notification system.
   */
  async getStats(): Promise<{
    activeOrders: number;
    outboxSize: number;
    deadLetterSize: number;
    oldestOrderAge?: string;
  }> {
    const activeOrders = await this.getActiveOrders();
    const outboxSize = await this.cache.llen(this.outboxKey);
    const deadLetterSize = await this.cache.llen(this.deadLetterKey);

    const result: {
      activeOrders: number;
      outboxSize: number;
      deadLetterSize: number;
      oldestOrderAge?: string;
    } = {
      activeOrders: activeOrders.length,
      outboxSize,
      deadLetterSize,
    };

    if (activeOrders.length > 0) {
      const oldest = activeOrders.reduce((prev, curr) =>
        new Date(prev.timestamp) < new Date(curr.timestamp) ? prev : curr
      );
      const ageHours =
        (Date.now() - new Date(oldest.timestamp).getTime()) / 3600000;
      result.oldestOrderAge = `${ageHours.toFixed(1)}h`;
    }

    return result;
  }

  /**
   * Get dead letter queue items for inspection.
   */
  async getDeadLetterItems(limit = 50): Promise<any[]> {
    const items = await this.cache.lrange(this.deadLetterKey, 0, limit - 1);
    return items
      .map((raw) => {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Retry specific dead letter item.
   */
  async retryDeadLetterItem(itemId: string): Promise<boolean> {
    const items = await this.cache.lrange(this.deadLetterKey, 0, -1);

    for (const itemStr of items) {
      try {
        const item = JSON.parse(itemStr);
        if (item.id === itemId) {
          // Remove from dead letter
          await this.cache.lrem(this.deadLetterKey, 1, itemStr);

          // Reset retry count and re-add to outbox
          item.retryCount = 0;
          delete item.movedAt;
          delete item.reason;
          delete item.lastError;

          await this.addToOutbox(item);
          console.log(`🔄 Moved ${itemId} from dead letter back to outbox`);
          return true;
        }
      } catch (err) {
        continue;
      }
    }

    return false;
  }

  /**
   * Execute function with distributed lock
   */
  async withLock<T>(
    lockKey: string,
    ttlSeconds: number,
    fn: () => Promise<T>
  ): Promise<T | null> {
    const acquired = await this.cache.setNX(lockKey, "1", ttlSeconds);

    if (!acquired) {
      console.log(`🔒 Lock already held: ${lockKey}`);
      return null;
    }

    try {
      const result = await fn();
      return result;
    } catch (err) {
      console.error(`❌ Error while holding lock "${lockKey}":`, err);
      throw err;
    } finally {
      await this.cache.del(lockKey);
    }
  }
}
