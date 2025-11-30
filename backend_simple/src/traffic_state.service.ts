import { Injectable } from '@nestjs/common';
import { TrafficState, defaultTrafficState } from './traffic_state';

@Injectable()
export class TrafficStateService {
  private state: TrafficState = defaultTrafficState();

  // Map 1..4 → hướng
  private readonly roadMap: Record<number, keyof TrafficState> = {
    1: 'north',
    2: 'east',
    3: 'south',
    4: 'west',
  };

  getState(): TrafficState {
    return this.state;
  }

  // Nhận payload signal_decision từ AI và cập nhật state
  applyDecision(payload: any): void {
    const { decision, trafficStatus } = payload || {};
    if (!decision || !trafficStatus) return;

    const greenRoadId = Number(decision.greenRoadId);
    const duration = Number(decision.duration ?? 0);

    // 1) Cập nhật số xe, emergency
    for (const [roadIdStr, statusAny] of Object.entries(trafficStatus as any)) {
      const roadId = Number(roadIdStr);
      const dir = this.roadMap[roadId];
      if (!dir) continue;

      const status = statusAny as any;
      const vehicles = Number(status.vehicles ?? 0);
      const isEmergency =
        status.isEmergency ?? status.is_emergency ?? false;

      this.state[dir].vehicles = vehicles;
      this.state[dir].isEmergency = Boolean(isEmergency);
    }

    // 2) Gán đèn: đường được chọn → GREEN, còn lại RED
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
  }
}
