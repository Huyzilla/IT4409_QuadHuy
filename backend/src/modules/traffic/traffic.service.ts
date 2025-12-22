import { Injectable, Logger } from '@nestjs/common';
import { TrafficRepository } from './traffic.repository';
import { TrafficControlService } from './traffic.control.service';
import { RedisService } from '../redis/redis.service';
import { IngestTrafficDataDto } from './dto/ingest-traffic-data.dto';
import { CreateTrafficSignalLogDto } from './dto/create-traffic-signal-log.dto';
import {
  TrafficState,
  LightState,
  RoadTrafficStatus,
} from './entities/traffic.entity';

/**
 * TrafficService orchestrates traffic management logic.
 * Handles incoming data, runs control algorithm, caches state, and broadcasts updates.
 */
@Injectable()
export class TrafficService {
  private readonly logger = new Logger(TrafficService.name);

  // Current traffic state for all roads
  private currentState: TrafficState = {
    north: { vehicles: 0, light: LightState.RED, remaining: 0 },
    east: { vehicles: 0, light: LightState.RED, remaining: 0 },
    south: { vehicles: 0, light: LightState.RED, remaining: 0 },
    west: { vehicles: 0, light: LightState.RED, remaining: 0 },
  };

  constructor(
    private readonly trafficRepository: TrafficRepository,
    private readonly trafficControlService: TrafficControlService,
    private readonly redisService: RedisService,
  ) {
    // Initialize with first road green
    this.currentState.north.light = LightState.GREEN;
    this.currentState.north.remaining = 10;
  }

  /**
   * Process incoming traffic data from AI camera
   *
   * Steps:
   * 1. Validate DTO
   * 2. Save to traffic_frame_stats table
   * 3. Update current state
   * 4. Cache in Redis
   * 5. Broadcast to frontend (handled by gateway)
   */
  async processIncomingData(dto: IngestTrafficDataDto): Promise<TrafficState> {
    this.logger.log(`Processing traffic data from camera ${dto.cameraId}`);

    // Step 1: Save to database
    await this.trafficRepository.saveFrameStat(dto);

    // Step 2: Update current state based on camera ID
    this.updateTrafficState(dto);

    // Step 3: Cache state in Redis
    await this.cacheCurrentState();

    return this.currentState;
  }

  async applySignalDecision(payload: any): Promise<TrafficState> {
    const decision = payload?.decision;
    if (!decision) {
      throw new Error('Invalid signal decision payload');
    }

    const greenRoadId = decision.greenRoadId;
    const duration = decision.duration;
    const reason = decision.reason ?? 'AI_DECISION';

    this.logger.log(
      `[AI] Apply signal decision: greenRoadId=${greenRoadId}, duration=${duration}, reason=${reason}`,
    );

    // 1. Apply light change to current state
    this.applyLightChange(greenRoadId, duration);
    // 2. Save signal log to db
    await this.saveSignalLog({
      greenRoadId,
      duration,
      reason,
      nextQueue: null,
    });
    // 3. Cache updated state
    await this.cacheCurrentState();
    //4. Publish light change event
    await this.redisService.publish('traffic:light-change', {
      greenRoadId,
      duration,
      reason,
      state: this.currentState,
    });
    return this.currentState;
  }

  /**
   * Update traffic state based on camera input
   * Camera IDs map to directions: 1=North, 2=East, 3=South, 4=West
   */
  private updateTrafficState(dto: IngestTrafficDataDto): void {
    const directionMap: { [key: number]: keyof TrafficState } = {
      1: 'north',
      2: 'east',
      3: 'south',
      4: 'west',
    };

    const direction = directionMap[dto.cameraId];
    if (direction) {
      this.currentState[direction].vehicles = dto.vehicles;
      this.currentState[direction].isEmergency = dto.isEmergency;
    }
  }

  /**
   * Apply light change to current state
   */
  private applyLightChange(greenRoadId: number, duration: number): void {
    const directionMap: { [key: number]: keyof TrafficState } = {
      1: 'north',
      2: 'east',
      3: 'south',
      4: 'west',
    };

    // Set all to RED
    Object.keys(this.currentState).forEach((key) => {
      const direction = key as keyof TrafficState;
      this.currentState[direction].light = LightState.RED;
      this.currentState[direction].remaining = 0;
    });

    // Set green road to GREEN
    const greenDirection = directionMap[greenRoadId];
    if (greenDirection) {
      this.currentState[greenDirection].light = LightState.GREEN;
      this.currentState[greenDirection].remaining = duration;
    }
  }

  /**
   * Save traffic signal log to database
   */
  private async saveSignalLog(decision: any): Promise<void> {
    const logDto: CreateTrafficSignalLogDto = {
      timestamp: Math.floor(Date.now() / 1000),
      readableTime: new Date().toISOString(),
      event: 'signal_change',
      greenRoadId: decision.greenRoadId,
      duration: decision.duration,
      reason: decision.reason,
      trafficStatus: this.currentState,
      cycleQueue: decision.nextQueue,
    };

    await this.trafficRepository.saveSignalLog(logDto);
  }

  async processMinuteSummary(dto: any): Promise<void> {
    await this.trafficRepository.upsertMinuteSummary(dto);
  }

  /**
   * Cache current state in Redis
   */
  private async cacheCurrentState(): Promise<void> {
    await this.redisService.cacheTrafficState(
      'traffic:state',
      this.currentState,
      60,
    );
  }

  /**
   * Get current traffic state (for API endpoints)
   */
  getCurrentState(): TrafficState {
    return { ...this.currentState };
  }

  /**
   * Get traffic logs with pagination
   */
  async getTrafficLogs(limit: number = 20, offset: number = 0) {
    return this.trafficRepository.getTrafficLogs(limit, offset);
  }

  /**
   * Get traffic snapshot (current state from Redis or memory)
   */
  async getSnapshot(): Promise<TrafficState> {
    const cachedState =
      await this.redisService.getTrafficState('traffic:state');
    return cachedState || this.currentState;
  }

  /**
   * Get traffic statistics
   */
  async getStats(cameraId?: number, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.trafficRepository.getTrafficStats(cameraId, fromDate, toDate);
  }

  async getMinuteStats(cameraIds?: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const idsArray = cameraIds
      ? cameraIds
          .split(',')
          .map((id) => parseInt(id, 10))
          .filter((id) => !isNaN(id))
      : [];

    return this.trafficRepository.getMinuteSummary(idsArray, fromDate, toDate);
  }
}
