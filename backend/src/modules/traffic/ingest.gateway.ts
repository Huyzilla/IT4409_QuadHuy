import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters } from '@nestjs/common';
import { TrafficService } from './traffic.service';
import { IngestTrafficDataDto } from './dto/ingest-traffic-data.dto';

/**
 * IngestGateway handles WebSocket connections from AI cameras.
 * Receives real-time traffic data and processes it through the traffic service.
 * 
 * Endpoint: ws://localhost:3000/ingest
 * Event: 'traffic_data'
 */
@WebSocketGateway({
  namespace: 'ingest',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class IngestGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(IngestGateway.name);

  constructor(private readonly trafficService: TrafficService) {}

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    this.logger.log(`AI Camera connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`AI Camera disconnected: ${client.id}`);
  }

  /**
   * Receive traffic data from AI camera
   * 
   * Expected payload:
   * {
   *   "cameraId": 1,
   *   "vehicles": 5,
   *   "isEmergency": false,
   *   "timestamp": 1763108805
   * }
   */
  @SubscribeMessage('traffic_data')
  async handleTrafficData(
    @MessageBody() data: IngestTrafficDataDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`Received traffic data from camera ${data.cameraId}: ${data.vehicles} vehicles`);

      // Process the incoming data
      const newState = await this.trafficService.processIncomingData(data);

      // Acknowledge receipt
      return {
        status: 'success',
        message: 'Traffic data processed',
        state: newState,
      };
    } catch (error) {
      this.logger.error(`Error processing traffic data: ${error.message}`);
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
}
