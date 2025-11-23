import { Redis } from "@upstash/redis/cloudflare";
import type { Env } from "../types/env";

export class CacheService {
  private redis: Redis;

  constructor(env: Env) {
    this.redis = Redis.fromEnv(env);
  }

  // Basic operations (you already have these)
  async get<T = string>(key: string): Promise<T | null> {
    return await this.redis.get<T>(key);
  }
  // config/cache.ts (add this method)
  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.redis.expire(key, seconds);
    return result === 1;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, { ex: ttlSeconds });
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  // Hash operations for notifications
  async hset(key: string, field: string, value: string): Promise<number> {
    return await this.redis.hset(key, { [field]: value });
  }

  async hget(key: string, field: string): Promise<string | null> {
    return await this.redis.hget<string>(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      const result = await this.redis.hgetall(key);

      // Handle null or non-object responses
      if (!result || typeof result !== "object" || Array.isArray(result)) {
        return {};
      }

      // Cast to the expected type since we control what we store
      return result as Record<string, string>;
    } catch (error) {
      console.error("Redis hgetall error:", error);
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<number> {
    return await this.redis.hdel(key, field);
  }

  // List operations for outbox
  async rpush(key: string, value: string): Promise<number> {
    return await this.redis.rpush(key, value);
  }

  async lpop(key: string): Promise<string | null> {
    return await this.redis.lpop(key);
  }

  async llen(key: string): Promise<number> {
    return await this.redis.llen(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.redis.lrange(key, start, stop);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    return await this.redis.lrem(key, count, value);
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    return await this.redis.publish(channel, message);
  }

  // Distributed lock support
  async setNX(
    key: string,
    value: string,
    ttlSeconds: number
  ): Promise<boolean> {
    const result = await this.redis.set(key, value, {
      ex: ttlSeconds,
      nx: true,
    });
    return result === "OK";
  }

  // Expose raw client for advanced operations
  get client() {
    return this.redis;
  }
}
