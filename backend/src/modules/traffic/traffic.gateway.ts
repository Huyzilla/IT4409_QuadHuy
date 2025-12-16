import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { TrafficService } from './traffic.service';
import { RedisService } from '../redis/redis.service';

/**
 * TrafficGateway broadcasts real-time traffic state to frontend dashboard.
 * Sends updates every second and whenever traffic lights change.
 * 
 * Endpoint: ws://localhost:3000/traffic
 * Event: 'traffic_update' (server → client)
 */
@WebSocketGateway({
  namespace: '/traffic',
  cors: { origin: '*', credentials: true },
})
export class TrafficGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrafficGateway.name);
  private updateInterval: NodeJS.Timeout;

  constructor(
    private readonly trafficService: TrafficService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Initialize WebSocket gateway
   * Start periodic updates and subscribe to Redis events
   */
  afterInit(server: Server) {
    this.logger.log('Traffic Gateway initialized');

    // Send updates every 1 second
    this.updateInterval = setInterval(() => {
      this.broadcastTrafficState();
    }, 1000);

    // Subscribe to light change events from Redis
    this.redisService.subscribe('traffic:light-change', (message) => {
      this.logger.log('Received light change event from Redis');
      this.broadcastTrafficState();
    });
  }

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    this.logger.log(`Frontend client connected: ${client.id}`);
    
    // Send current state immediately on connection
    const currentState = this.trafficService.getCurrentState();
    client.emit('traffic_update', currentState);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Frontend client disconnected: ${client.id}`);
  }

  /**
   * Broadcast current traffic state to all connected clients
   * 
   * Emits:
   * {
   *   "north": { "vehicles": 3, "light": "RED", "remaining": 10 },
   *   "east":  { "vehicles": 7, "light": "GREEN", "remaining": 10 },
   *   "south": { "vehicles": 2, "light": "RED", "remaining": 10 },
   *   "west":  { "vehicles": 6, "light": "RED", "remaining": 10 }
   * }
   */
  private broadcastTrafficState(): void {
    const currentState = this.trafficService.getCurrentState();
    this.server.emit('traffic_update', currentState);
  }

  /**
   * Clean up on module destroy
   */
  onModuleDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
