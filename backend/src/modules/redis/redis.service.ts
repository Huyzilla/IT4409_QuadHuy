import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<any>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<any>;
  on(event: 'message', listener: (channel: string, message: string) => void): any;
  quit(): Promise<any>;
};

class InMemoryRedis implements RedisLike {
  private readonly store = new Map<
    string,
    { value: string; expiresAt?: number; timer?: NodeJS.Timeout }
  >();

  private readonly subscribers = new Map<
    string,
    Set<(channel: string, message: string) => void>
  >();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() >= entry.expiresAt) {
      this.deleteKey(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
    // Support: set(key, value, 'EX', seconds)
    let ttlSeconds: number | undefined;
    if (args?.length >= 2 && String(args[0]).toUpperCase() === 'EX') {
      const parsed = Number(args[1]);
      if (Number.isFinite(parsed) && parsed > 0) ttlSeconds = parsed;
    }

    this.deleteKey(key);
    const entry: { value: string; expiresAt?: number; timer?: NodeJS.Timeout } = {
      value,
    };
    if (ttlSeconds) {
      entry.expiresAt = Date.now() + ttlSeconds * 1000;
      entry.timer = setTimeout(() => this.deleteKey(key), ttlSeconds * 1000);
    }
    this.store.set(key, entry);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.store.has(key)) {
        this.deleteKey(key);
        removed++;
      }
    }
    return removed;
  }

  async incr(key: string): Promise<number> {
    const currentRaw = await this.get(key);
    const current = currentRaw ? Number.parseInt(currentRaw, 10) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    await this.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    const ttl = Number(seconds);
    if (!Number.isFinite(ttl) || ttl <= 0) return 0;

    if (entry.timer) clearTimeout(entry.timer);
    entry.expiresAt = Date.now() + ttl * 1000;
    entry.timer = setTimeout(() => this.deleteKey(key), ttl * 1000);
    this.store.set(key, entry);
    return 1;
  }

  async publish(channel: string, message: string): Promise<number> {
    const subs = this.subscribers.get(channel);
    if (!subs || subs.size === 0) return 0;
    for (const handler of subs) handler(channel, message);
    return subs.size;
  }

  async subscribe(channel: string): Promise<'OK'> {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    return 'OK';
  }

  on(event: 'message', listener: (channel: string, message: string) => void) {
    if (event !== 'message') return this;

    // Attach the listener to all channels that currently exist.
    for (const handlers of this.subscribers.values()) {
      handlers.add(listener);
    }

    // Also remember it for future subscribe calls by wrapping subscribe.
    const originalSubscribe = this.subscribe.bind(this);
    this.subscribe = async (channel: string) => {
      const res = await originalSubscribe(channel);
      const handlers = this.subscribers.get(channel);
      if (handlers) handlers.add(listener);
      return res;
    };

    return this;
  }

  async quit(): Promise<void> {
    for (const key of Array.from(this.store.keys())) {
      this.deleteKey(key);
    }
    this.subscribers.clear();
  }

  private deleteKey(key: string) {
    const entry = this.store.get(key);
    if (entry?.timer) clearTimeout(entry.timer);
    this.store.delete(key);
  }
}

/**
 * RedisService provides a centralized Redis client for caching and pub/sub.
 * Used for:
 * - Caching current traffic state
 * - Pub/sub for real-time events (traffic:update, traffic:light-change)
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly enabled: boolean;
  private client: RedisLike;
  private publisher: RedisLike;
  private subscriber: RedisLike;

  constructor() {
    const redisUrl = (process.env.REDIS_URL || '').trim();
    const redisHost = (process.env.REDIS_HOST || '').trim();

    this.enabled = Boolean(redisUrl || redisHost);

    if (!this.enabled) {
      // Render/production without Redis should still boot.
      const inMemory = new InMemoryRedis();
      this.client = inMemory;
      this.publisher = inMemory;
      this.subscriber = inMemory;
      this.logger.warn(
        'Redis is disabled (no REDIS_URL/REDIS_HOST). Using in-memory cache/pubsub (single-instance only).',
      );
      return;
    }

    if (redisUrl) {
      this.client = new Redis(redisUrl);
      this.publisher = new Redis(redisUrl);
      this.subscriber = new Redis(redisUrl);
      this.logger.log('Redis clients initialized via REDIS_URL');
      return;
    }

    const port = Number.parseInt(process.env.REDIS_PORT || '6379', 10);
    this.client = new Redis({ host: redisHost, port });
    this.publisher = new Redis({ host: redisHost, port });
    this.subscriber = new Redis({ host: redisHost, port });
    this.logger.log(`Redis clients initialized: ${redisHost}:${port}`);
  }

  async onModuleInit() {
    // Clients are already initialized in constructor
    this.logger.log('RedisService module initialized');
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.publisher.quit();
    await this.subscriber.quit();
  }

  /**
   * Get the main Redis client for cache operations
   */
  getClient(): RedisLike {
    return this.client;
  }

  /**
   * Get the publisher client for pub/sub
   */
  getPublisher(): RedisLike {
    return this.publisher;
  }

  /**
   * Get the subscriber client for pub/sub
   */
  getSubscriber(): RedisLike {
    return this.subscriber;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Cache traffic state with TTL
   */
  async cacheTrafficState(
    key: string,
    data: any,
    ttlSeconds: number = 60,
  ): Promise<void> {
    await this.client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  }

  /**
   * Get cached traffic state
   */
  async getTrafficState(key: string): Promise<any | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Publish an event to a channel
   */
  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(
    channel: string,
    callback: (message: any) => void,
  ): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(JSON.parse(msg));
      }
    });
  }
}
