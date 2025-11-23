import { CacheService } from "@config/cache";
import { NotificationService } from "@services/notification";
import type { Env } from "../types/env";

export interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
  noRetry: () => void;
}

async function withLock<T>(
  cache: CacheService,
  lockKey: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T | null> {
  const acquired = await cache.setNX(lockKey, "1", ttlSeconds);
  if (!acquired) return null;

  try {
    return await fn();
  } finally {
    await cache.del(lockKey);
  }
}

export async function handleScheduled(
  event: ScheduledEvent,
  env: Env
): Promise<void> {
  const cache = new CacheService(env);
  const notifications = new NotificationService(cache);

  switch (event.cron) {
    // Process outbox every minute
    case "* * * * *": {
      const result = await withLock(cache, "lock:outbox", 120, async () => {
        return await notifications.processOutboxBatch(20);
      });

      if (
        result &&
        (result.processed > 0 ||
          result.failed > 0 ||
          result.movedToDeadLetter > 0)
      ) {
        console.log(
          `📤 [OUTBOX] Processed: ${result.processed}, Failed: ${result.failed}, Dead Letter: ${result.movedToDeadLetter}`
        );
      }
      break;
    }

    // Cleanup stale orders every 2 hours
    case "0 */2 * * *": {
      await withLock(cache, "lock:cleanup", 600, async () => {
        console.log("🧹 [CRON] Starting cleanup job");
        await notifications.cleanupOldOrders(12);
      });
      break;
    }

    // Cleanup outbox daily at 3 AM
    case "0 3 * * *": {
      await withLock(cache, "lock:outbox-cleanup", 600, async () => {
        console.log("🧹 [CRON] Starting outbox cleanup");
        await notifications.cleanupOutbox();
      });
      break;
    }

    // Log stats every 10 minutes
    case "*/10 * * * *": {
      const stats = await notifications.getStats();
      const parts = [
        `Active: ${stats.activeOrders}`,
        `Outbox: ${stats.outboxSize}`,
        `Dead Letter: ${stats.deadLetterSize}`,
      ];

      if (stats.oldestOrderAge) {
        parts.push(`Oldest: ${stats.oldestOrderAge}`);
      }

      if (stats.deadLetterSize > 10) {
        console.warn(
          `⚠️ [ALERT] Dead letter queue has ${stats.deadLetterSize} items!`
        );
      }

      console.log(`📊 [STATS] ${parts.join(", ")}`);
      break;
    }
  }
}
