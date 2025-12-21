import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  TrafficFrameStat,
  TrafficMinuteSummary,
  TrafficSignalLog,
} from '@prisma/client';
import { IngestTrafficDataDto } from './dto/ingest-traffic-data.dto';
import { CreateTrafficSignalLogDto } from './dto/create-traffic-signal-log.dto';
import { TrafficMinuteSummaryDto } from './dto/traffic-minute-summary.dto';

/**
 * TrafficRepository handles all database operations for traffic data
 */
@Injectable()
export class TrafficRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save traffic frame statistics from camera
   */
  async saveFrameStat(data: IngestTrafficDataDto): Promise<TrafficFrameStat> {
    return this.prisma.trafficFrameStat.create({
      data: {
        cameraId: data.cameraId,
        vehicles: data.vehicles,
        isEmergency: data.isEmergency,
        capturedAt: new Date(data.timestamp * 1000),
      },
    });
  }

  /**
   * Save traffic signal log
   */
  async saveSignalLog(data: CreateTrafficSignalLogDto): Promise<TrafficSignalLog> {
    return this.prisma.trafficSignalLog.create({
      data: {
        timestamp: BigInt(data.timestamp),
        readableTime: data.readableTime,
        event: data.event,
        greenRoadId: data.greenRoadId,
        duration: data.duration,
        reason: data.reason,
        trafficStatus: data.trafficStatus,
        cycleQueue: data.cycleQueue,
      },
    });
  }

  /**
   * Get traffic logs with pagination
   */
  async getTrafficLogs(limit: number = 20, offset: number = 0): Promise<TrafficSignalLog[]> {
    return this.prisma.trafficSignalLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get traffic statistics for a camera within a time range
   */
  async getTrafficStats(
    cameraId?: number,
    from?: Date,
    to?: Date,
  ): Promise<TrafficFrameStat[]> {
    const where: any = {};
    
    if (cameraId) {
      where.cameraId = cameraId;
    }
    
    if (from || to) {
      where.capturedAt = {};
      if (from) where.capturedAt.gte = from;
      if (to) where.capturedAt.lte = to;
    }

    return this.prisma.trafficFrameStat.findMany({
      where,
      orderBy: { capturedAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Get latest frame stats for all cameras
   */
  async getLatestFrameStats(): Promise<TrafficFrameStat[]> {
    return this.prisma.trafficFrameStat.findMany({
      orderBy: { capturedAt: 'desc' },
      take: 4, // Assuming 4 cameras for 4 directions
    });
  }

  async getMinuteSummary(cameraIds: number[], from?: Date, to?: Date): Promise<any[]> {
    const where: any = {};

    if (cameraIds.length > 0) {
      where.cameraId = { in: cameraIds };
    }

    if (from || to) {
      where.minuteStart = {};
      if (from) where.minuteStart.gte = Math.floor(from.getTime() / 1000);
      if (to) where.minuteStart.lte = Math.floor(to.getTime() / 1000);
    }

    return this.prisma.trafficMinuteSummary.findMany({
      where,
      orderBy: { minuteStart: 'asc' },
      take: (from || to) ? 2000 : 100,
    });
  }

  async upsertMinuteSummary(data: TrafficMinuteSummaryDto) {
    return this.prisma.trafficMinuteSummary.upsert({
      where: {
        cameraId_minuteStart: {
          cameraId: data.cameraId,
          minuteStart: data.minuteStart,
        },
      },
      update: {
        minuteEnd: data.minuteEnd,
        vehiclesAvg: data.vehicles_avg,
        vehiclesMax: data.vehicles_max,
        samples: data.samples,
        flowCount: data.flow_count,
      },
      create: {
        cameraId: data.cameraId,
        minuteStart: data.minuteStart,
        minuteEnd: data.minuteEnd,
        vehiclesAvg: data.vehicles_avg,
        vehiclesMax: data.vehicles_max,
        samples: data.samples,
        flowCount: data.flow_count,
      },
    });
  }
}
