import { Module } from '@nestjs/common';
import { TrafficController } from './traffic.controller';
import { TrafficService } from './traffic.service';
import { TrafficControlService } from './traffic.control.service';
import { TrafficRepository } from './traffic.repository';
import { IngestGateway } from './ingest.gateway';
import { TrafficGateway } from './traffic.gateway';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../database/prisma.module';
import { AuthModule } from '../auth/auth.module';

/**
 * TrafficModule encapsulates all traffic management features:
 * - WebSocket gateway for AI camera ingestion
 * - WebSocket gateway for frontend broadcasting
 * - Traffic control algorithm
 * - REST API for historical data
 */
@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [TrafficController],
  providers: [
    TrafficService,
    TrafficControlService,
    TrafficRepository,
    IngestGateway,
    TrafficGateway,
  ],
  exports: [TrafficService],
})
export class TrafficModule {}
