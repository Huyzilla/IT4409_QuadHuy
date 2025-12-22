import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimitService {
  private readonly enabled: boolean;
  constructor(private readonly redisService: RedisService) {
    this.enabled = process.env.NODE_ENV !== 'development';
  }

  async check({
    key,
    limit,
    windowSeconds,
    blockSeconds,
    blockMsg,
  }: {
    key: string;
    limit: number;
    windowSeconds: number;
    blockSeconds?: number;
    blockMsg?: string;
  }) {
    if (!this.enabled) return;
    const redis = this.redisService.getClient();
    const blockKey = `rl:block:${key}`;
    const blocked = await redis.get(blockKey);
    if (blocked) {
      throw new BadRequestException(
        blockMsg || 'Too many requests, try again later.',
      );
    }
    const rlKey = `rl:count:${key}`;
    const count = await redis.incr(rlKey);
    if (count === 1) {
      await redis.expire(rlKey, windowSeconds);
    }
    if (count > limit) {
      if (blockSeconds) {
        await redis.set(blockKey, '1', 'EX', blockSeconds);
      }
      throw new BadRequestException(
        blockMsg || 'Too many requests, try again later.',
      );
    }
  }
}
