import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { TrafficService } from './traffic.service';

/**
 * TrafficController provides REST API endpoints for traffic data
 */
@Controller('traffic')
export class TrafficController {
  constructor(private readonly trafficService: TrafficService) {}

  /**
   * GET /traffic/logs?limit=20&offset=0
   * Get traffic signal logs with pagination
   */
  @Get('logs')
  async getTrafficLogs(
    @Query('limit', ParseIntPipe) limit: number = 20,
    @Query('offset', ParseIntPipe) offset: number = 0,
  ) {
    return this.trafficService.getTrafficLogs(limit, offset);
  }

  /**
   * GET /traffic/snapshot
   * Get current traffic state snapshot
   */
  @Get('snapshot')
  async getSnapshot() {
    return this.trafficService.getSnapshot();
  }

  /**
   * GET /traffic/stats?cameraId=1&from=...&to=...
   * Get traffic statistics for a camera within a time range
   */
  @Get('stats')
  async getStats(
    @Query('cameraId') cameraId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const cameraIdNum = cameraId ? parseInt(cameraId, 10) : undefined;
    return this.trafficService.getStats(cameraIdNum, from, to);
  }
}
