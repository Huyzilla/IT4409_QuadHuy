import { Injectable } from '@nestjs/common';
import {
  TrafficState,
  defaultTrafficState,
  DecisionLogEntry,
  Direction,
} from './traffic_state';

@Injectable()
export class TrafficStateService {
  private state: TrafficState = defaultTrafficState();

  private readonly roadMap: Record<number, Direction> = {
    1: 'north',
    2: 'east',
    3: 'south',
    4: 'west',
  };

  private decisionLogs: DecisionLogEntry[] = [];

  getState(): TrafficState {
    return this.state;
  }

  getDecisionLogs(): DecisionLogEntry[] {
    return this.decisionLogs;
  }

  // Python → traffic_data: { cameraId, vehicles, isEmergency }
  updateFromTrafficData(payload: any): void {
    if (!payload) return;

    const roadId = Number(payload.cameraId);
    const dir = this.roadMap[roadId];
    if (!dir) return;

    const vehicles = Number(payload.vehicles ?? 0);
    const isEmergency = Boolean(payload.isEmergency);

    this.state[dir].vehicles = vehicles;
    this.state[dir].isEmergency = isEmergency;
    // Không đụng tới light/timeLeft ở đây
  }

  // Python → signal_decision: { decision: { greenRoadId, duration, reason } }
  applyDecision(payload: any): void {
    if (!payload?.decision) return;
    const decision = payload.decision;

    const greenRoadId = Number(decision.greenRoadId);
    const duration = Number(decision.duration ?? 0);
    const reason = decision.reason;

    // Cập nhật đèn: làn được chọn GREEN, còn lại RED
    for (const [idStr, dir] of Object.entries(this.roadMap)) {
      const id = Number(idStr);
      if (id === greenRoadId) {
        this.state[dir].light = 'GREEN';
        this.state[dir].timeLeft = duration;
      } else {
        this.state[dir].light = 'RED';
        this.state[dir].timeLeft = 0;
      }
    }

    // Ghi log
    const greenDir = this.roadMap[greenRoadId];
    if (!greenDir) return;

    const greenLane = this.state[greenDir];
    const reds: DecisionLogEntry['reds'] = [];

    for (const [idStr, dir] of Object.entries(this.roadMap)) {
      const id = Number(idStr);
      if (id === greenRoadId) continue;
      const lane = this.state[dir];
      reds.push({
        roadId: id,
        direction: dir,
        vehicles: lane.vehicles,
      });
    }

    const logEntry: DecisionLogEntry = {
      timestamp: Number(payload.timestamp ?? Date.now()),
      intersectionId: Number(payload.intersectionId ?? 1),
      green: {
        roadId: greenRoadId,
        direction: greenDir,
        vehicles: greenLane.vehicles,
        duration,
        reason,
      },
      reds,
    };

    this.decisionLogs.push(logEntry);
    if (this.decisionLogs.length > 1000) {
      this.decisionLogs.shift();
    }
  }
}
