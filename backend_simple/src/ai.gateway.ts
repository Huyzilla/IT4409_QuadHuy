// src/ai.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { TrafficStateService } from './traffic_state.service';
import { TrafficGateway } from './traffic.gateway';

// Tạm thời mở CORS cho mọi nguồn để dev
@WebSocketGateway({
  namespace: '/ingest',   // ws://localhost:3000/ingest
  cors: { origin: '*' },
})
export class AiGateway {
  private readonly logger = new Logger(AiGateway.name);

  constructor(
    private readonly stateService: TrafficStateService,
    private readonly dashboardGateway: TrafficGateway,
  ) {}

  // Event test
  // src/ai.gateway.ts
  @SubscribeMessage('signal_decision')
  handleSignalDecision(@MessageBody() raw: any) {
    // 1) Parse nếu là string
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
      `[AI] Signal Decision Received (parsed): ${JSON.stringify(data, null, 2)}`,
    );

    // 2) Cập nhật state nội bộ
    this.stateService.applyDecision(data);

    // 3) Broadcast state cho dashboard
    this.dashboardGateway.broadcastState();

    return { status: 'ok' };
  }

}
