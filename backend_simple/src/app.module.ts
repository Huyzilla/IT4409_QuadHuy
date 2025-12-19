import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiGateway } from './ai.gateway';
import { TrafficGateway } from './traffic.gateway';
import { TrafficStateService } from './traffic_state.service';
import { TrafficController } from './traffic.controller';

@Module({
  imports: [],
  controllers: [AppController, TrafficController],
  providers: [AppService, AiGateway, TrafficGateway, TrafficStateService],
})
export class AppModule {}
