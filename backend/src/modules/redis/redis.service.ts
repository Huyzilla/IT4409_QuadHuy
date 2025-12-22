import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

/**
 * RedisService provides a centralized Redis client for caching and pub/sub.
 * Used for:
 * - Caching current traffic state
 * - Pub/sub for real-time events (traffic:update, traffic:light-change)
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private publisher: Redis;
  private subscriber: Redis;

  constructor() {
    // Initialize Redis clients in constructor to ensure they exist before any module uses them
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);

    this.client = new Redis({ host, port });
    this.publisher = new Redis({ host, port });
    this.subscriber = new Redis({ host, port });

    this.logger.log(`Redis clients initialized: ${host}:${port}`);
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
  getClient(): Redis {
    return this.client;
  }

  /**
   * Get the publisher client for pub/sub
   */
  getPublisher(): Redis {
    return this.publisher;
  }

  /**
   * Get the subscriber client for pub/sub
   */
  getSubscriber(): Redis {
    return this.subscriber;
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
