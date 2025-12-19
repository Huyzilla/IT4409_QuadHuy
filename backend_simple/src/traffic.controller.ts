import { Controller, Get } from '@nestjs/common';
import { TrafficStateService } from './traffic_state.service';

@Controller('traffic')
export class TrafficController {
  constructor(private readonly stateService: TrafficStateService) {}

  @Get('snapshot')
  getSnapshot() {
    return this.stateService.getState();
  }

  @Get('decisions')
  getDecisions() {
    return this.stateService.getDecisionLogs();
  }
}
