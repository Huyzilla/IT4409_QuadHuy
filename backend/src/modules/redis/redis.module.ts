import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * RedisModule provides Redis client for caching and pub/sub.
 * Marked as Global to avoid re-importing in every module.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
