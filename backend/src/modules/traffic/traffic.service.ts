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

  // Realtime state for each intersection.
  // Key: intersectionId (number)
  private intersectionStates: Record<number, TrafficState> = {
    1: TrafficService.createDefaultIntersectionState(),
    2: TrafficService.createDefaultIntersectionState(),
  };

  private emergencyActive = new Map<number, boolean>();
  private lastEmergencyWriteAt = new Map<number, number>();
  private readonly EMERGENCY_COOLDOWN_MS = 10000;

  constructor(
    private readonly trafficRepository: TrafficRepository,
    private readonly trafficControlService: TrafficControlService,
    private readonly redisService: RedisService,
  ) {
    // Initialize with first road green for each intersection
    Object.keys(this.intersectionStates).forEach((key) => {
      const id = Number(key);
      this.intersectionStates[id].north.light = LightState.GREEN;
      this.intersectionStates[id].north.remaining = 10;
    });
  }

  private static createDefaultIntersectionState(): TrafficState {
    return {
      north: { vehicles: 0, light: LightState.RED, remaining: 0 },
      east: { vehicles: 0, light: LightState.RED, remaining: 0 },
      south: { vehicles: 0, light: LightState.RED, remaining: 0 },
      west: { vehicles: 0, light: LightState.RED, remaining: 0 },
    };
  }

  private getOrCreateIntersectionState(intersectionId: number): TrafficState {
    if (!this.intersectionStates[intersectionId]) {
      this.intersectionStates[intersectionId] =
        TrafficService.createDefaultIntersectionState();
      this.intersectionStates[intersectionId].north.light = LightState.GREEN;
      this.intersectionStates[intersectionId].north.remaining = 10;
    }
    return this.intersectionStates[intersectionId];
  }

  private resolveIntersectionAndDirection(cameraId: number): {
    intersectionId: number;
    direction: keyof TrafficState;
    localRoadId: 1 | 2 | 3 | 4;
  } {
    // Current demo mapping:
    // - Intersection 1 uses camera IDs 1-4
    // - Intersection 2 uses camera IDs 5-8
    // Each intersection uses 4 directions north/east/south/west.
    const intersectionId = cameraId >= 5 ? 2 : 1;
    const localRoadId = (((cameraId - 1) % 4) + 1) as 1 | 2 | 3 | 4;
    const directionMap: Record<1 | 2 | 3 | 4, keyof TrafficState> = {
      1: 'north',
      2: 'east',
      3: 'south',
      4: 'west',
    };
    return {
      intersectionId,
      direction: directionMap[localRoadId],
      localRoadId,
    };
  }

  /**
   * Process incoming traffic data from AI camera
   *
   * Steps:
   * 1. Validate DTO
   * 2. Update current state
   * 3. Cache in Redis
   * 4. Save to DB ONLY if emergency (cooldown)
   * 5. Broadcast to frontend (handled by gateway)
   */
  async processIncomingData(dto: IngestTrafficDataDto): Promise<TrafficState> {
    const { intersectionId, direction } = this.resolveIntersectionAndDirection(
      dto.cameraId,
    );

    this.logger.log(
      `Processing traffic data from camera ${dto.cameraId} (intersection=${intersectionId}, direction=${direction})`,
    );

    // Step 1: Update current state based on camera ID
    this.updateTrafficState(dto);

    // Step 2: Cache state in Redis
    await this.cacheCurrentState();

    // Step 3: Save to database ONLY when emergency (with anti-spam cooldown)
    await this.saveFrameStatIfEmergency(dto);

    return this.getOrCreateIntersectionState(intersectionId);
  }

  async applySignalDecision(payload: any): Promise<TrafficState> {
    const decision = payload?.decision;
    if (!decision) {
      throw new Error('Invalid signal decision payload');
    }

    const greenRoadId = decision.greenRoadId;
    const duration = decision.duration;
    const reason = decision.reason ?? 'AI_DECISION';

    const { intersectionId, localRoadId } = this.resolveIntersectionAndDirection(
      greenRoadId,
    );

    this.logger.log(
      `[AI] Apply signal decision: greenRoadId=${greenRoadId} (intersection=${intersectionId}), duration=${duration}, reason=${reason}`,
    );

    // 1. Apply light change to current state
    this.applyLightChange(intersectionId, localRoadId, duration);
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
      intersectionId,
      duration,
      reason,
      states: this.getAllCurrentStates(),
    });
    return this.getOrCreateIntersectionState(intersectionId);
  }

  private updateTrafficState(dto: IngestTrafficDataDto): void {
    const { intersectionId, direction } = this.resolveIntersectionAndDirection(
      dto.cameraId,
    );

    const state = this.getOrCreateIntersectionState(intersectionId);
    state[direction].vehicles = dto.vehicles;
    state[direction].isEmergency = dto.isEmergency;
  }

  // Save frame stat to DB ONLY when emergency.
  // Ghi khi: lần đầu emergency (false->true) hoặc đã quá cooldown
  // Không emergency: reset trạng thái để lần sau phát hiện lại ghi được ngay
  private async saveFrameStatIfEmergency(dto: IngestTrafficDataDto): Promise<void> {
    const cameraId = dto.cameraId;
    const isEmergency = Boolean(dto.isEmergency);

    if (!isEmergency) {
      this.emergencyActive.set(cameraId, false);
      return;
    }

    const now = Date.now();
    const wasActive = this.emergencyActive.get(cameraId) === true;
    const lastWrite = this.lastEmergencyWriteAt.get(cameraId) ?? 0;

    const shouldWrite =
      !wasActive || now - lastWrite >= this.EMERGENCY_COOLDOWN_MS;

    if (!shouldWrite) return;

    this.emergencyActive.set(cameraId, true);
    this.lastEmergencyWriteAt.set(cameraId, now);

    await this.trafficRepository.saveFrameStat(dto);

    this.logger.warn(
      `Emergency saved (camera=${cameraId}, vehicles=${dto.vehicles}, cooldown=${this.EMERGENCY_COOLDOWN_MS}ms)`,
    );
  }

  // Apply light change to current state
  private applyLightChange(
    intersectionId: number,
    localRoadId: 1 | 2 | 3 | 4,
    duration: number,
  ): void {
    const state = this.getOrCreateIntersectionState(intersectionId);
    const directionMap: Record<1 | 2 | 3 | 4, keyof TrafficState> = {
      1: 'north',
      2: 'east',
      3: 'south',
      4: 'west',
    };

    // Set all to RED
    (Object.keys(state) as Array<keyof TrafficState>).forEach((direction) => {
      state[direction].light = LightState.RED;
      state[direction].remaining = 0;
    });

    // Set green road to GREEN
    const greenDirection = directionMap[localRoadId];
    state[greenDirection].light = LightState.GREEN;
    state[greenDirection].remaining = duration;
  }

  // Save traffic signal log to database
  private async saveSignalLog(decision: any): Promise<void> {
    const { intersectionId } = this.resolveIntersectionAndDirection(
      decision.greenRoadId,
    );
    const logDto: CreateTrafficSignalLogDto = {
      timestamp: Math.floor(Date.now() / 1000),
      readableTime: new Date().toISOString(),
      event: 'signal_change',
      greenRoadId: decision.greenRoadId,
      duration: decision.duration,
      reason: decision.reason,
      trafficStatus: {
        intersectionId,
        state: this.getOrCreateIntersectionState(intersectionId),
      },
      cycleQueue: decision.nextQueue,
    };

    await this.trafficRepository.saveSignalLog(logDto);
  }

  async processMinuteSummary(dto: any): Promise<void> {
    await this.trafficRepository.upsertMinuteSummary(dto);
  }

  // Cache current state in Redis
  private async cacheCurrentState(): Promise<void> {
    const states = this.getAllCurrentStates();
    await this.redisService.cacheTrafficState('traffic:state:all', states, 60);
    await Promise.all(
      Object.entries(states).map(([intersectionId, state]) =>
        this.redisService.cacheTrafficState(
          `traffic:state:${intersectionId}`,
          state,
          60,
        ),
      ),
    );
  }

  // Get current traffic state for a single intersection
  getCurrentState(intersectionId: number = 1): TrafficState {
    const state = this.getOrCreateIntersectionState(intersectionId);
    return { ...state };
  }

  // Get traffic states for all intersections
  getAllCurrentStates(): Record<number, TrafficState> {
    const result: Record<number, TrafficState> = {};
    for (const [key, value] of Object.entries(this.intersectionStates)) {
      result[Number(key)] = { ...value };
    }
    return result;
  }

  // Get traffic logs with pagination
  async getTrafficLogs(limit: number = 20, offset: number = 0) {
    return this.trafficRepository.getTrafficLogs(limit, offset);
  }

  // Get traffic snapshot (current state from Redis or memory)  
  async getSnapshot(): Promise<Record<number, TrafficState>> {
    const cached = await this.redisService.getTrafficState('traffic:state:all');
    return cached || this.getAllCurrentStates();
  }

  // Get traffic statistics
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
