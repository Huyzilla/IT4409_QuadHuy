import { Module } from '@nestjs/common';
import { TrafficController } from './traffic.controller';
import { TrafficService } from './traffic.service';
import { TrafficControlService } from './traffic.control.service';
import { TrafficRepository } from './traffic.repository';
import { IngestGateway } from './ingest.gateway';
import { TrafficGateway } from './traffic.gateway';

/**
 * TrafficModule encapsulates all traffic management features:
 * - WebSocket gateway for AI camera ingestion
 * - WebSocket gateway for frontend broadcasting
 * - Traffic control algorithm
 * - REST API for historical data
 */
@Module({
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
