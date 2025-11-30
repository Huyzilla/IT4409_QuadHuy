import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { TrafficStateService } from './traffic_state.service';
import { TrafficGateway } from './traffic.gateway';

@WebSocketGateway({
  namespace: '/ingest', // ws://localhost:3000/ingest
  cors: { origin: '*' },
})
export class AiGateway {
  private readonly logger = new Logger(AiGateway.name);

  constructor(
    private readonly stateService: TrafficStateService,
    private readonly dashboardGateway: TrafficGateway,
  ) {}

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any) {
    this.logger.log(`Received ping: ${JSON.stringify(data)}`);
    return 'pong';
  }

  // Python → traffic_data (realtime xe từng làn)
  @SubscribeMessage('traffic_data')
  handleTrafficData(@MessageBody() raw: any) {
    let data = raw;
    if (typeof raw === 'string') {
      try {
        data = JSON.parse(raw);
      } catch (e) {
        this.logger.error(`Invalid JSON for traffic_data: ${raw}`);
        return { status: 'error', msg: 'invalid JSON' };
      }
    }

    this.logger.log(`[AI] traffic_data: ${JSON.stringify(data)}`);

    this.stateService.updateFromTrafficData(data);
    this.dashboardGateway.broadcastState();

    return { status: 'ok' };
  }

  // Python → signal_decision (mỗi lần bắt đầu cycle mới)
  @SubscribeMessage('signal_decision')
  handleSignalDecision(@MessageBody() raw: any) {
    let data = raw;
    if (typeof raw === 'string') {
      try {
        data = JSON.parse(raw);
      } catch (e) {
        this.logger.error(`Invalid JSON for signal_decision: ${raw}`);
        return { status: 'error', msg: 'invalid JSON' };
      }
    }

    this.logger.log(
      `[AI] Signal Decision Received (parsed): ${JSON.stringify(
        data,
        null,
        2,
      )}`,
    );

    // Cập nhật state đèn + log
    this.stateService.applyDecision(data);

    // Log summary: làn xanh + làn đỏ
    const state = this.stateService.getState();
    const roadMap: Record<number, keyof typeof state> = {
      1: 'north',
      2: 'east',
      3: 'south',
      4: 'west',
    };
    const greenRoadId = Number(data.decision?.greenRoadId ?? 0);
    const duration = Number(data.decision?.duration ?? 0);
    const greenDir = roadMap[greenRoadId];

    if (greenDir) {
      const greenLane = state[greenDir];
      const reds: any[] = [];
      for (const [idStr, dir] of Object.entries(roadMap)) {
        const id = Number(idStr);
        if (id === greenRoadId) continue;
        reds.push({
          roadId: id,
          direction: dir,
          vehicles: state[dir].vehicles,
        });
      }
      this.logger.log(
        `[LOG] Decision summary: GREEN lane=${greenRoadId} (${greenDir}), ` +
          `vehicles=${greenLane.vehicles}, duration=${duration}s; ` +
          `RED lanes=${JSON.stringify(reds)}`,
      );
    }

    this.dashboardGateway.broadcastState();

    return { status: 'ok' };
  }
}
