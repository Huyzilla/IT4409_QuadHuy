// src/traffic.gateway.ts
import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { TrafficStateService } from './traffic_state.service';

@WebSocketGateway({
  namespace: '/traffic',  // FE connect ws://localhost:3000/traffic
  cors: { origin: '*' },
})
export class TrafficGateway {
  private readonly logger = new Logger(TrafficGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly stateService: TrafficStateService) {}

  // Gửi state hiện tại cho tất cả dashboard
  broadcastState(): void {
    const state = this.stateService.getState();
    this.server.emit('traffic_update', state);
    this.logger.log('Broadcasted traffic_update');
  }
}
