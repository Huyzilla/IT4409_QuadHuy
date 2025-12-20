import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TrafficService } from './traffic.service';

/**
 * TrafficController provides REST API endpoints for traffic data
 */
@ApiTags('traffic')
@Controller('traffic')
export class TrafficController {
  constructor(private readonly trafficService: TrafficService) {}

  /**
   * GET /api/traffic/logs?limit=20&offset=0
   * Get traffic signal logs with pagination
   */
  @Get('logs')
  @ApiOperation({ 
    summary: 'Get traffic signal logs', 
    description: 'Retrieve paginated traffic signal change logs with timestamps and reasons' 
  })
  @ApiQuery({ name: 'limit', type: 'number', required: false, description: 'Number of logs to return', example: 20 })
  @ApiQuery({ name: 'offset', type: 'number', required: false, description: 'Offset for pagination', example: 0 })
  @ApiResponse({ status: 200, description: 'Traffic logs retrieved successfully' })
  async getTrafficLogs(
    @Query('limit', ParseIntPipe) limit: number = 20,
    @Query('offset', ParseIntPipe) offset: number = 0,
  ) {
    return this.trafficService.getTrafficLogs(limit, offset);
  }

  /**
   * GET /api/traffic/snapshot
   * Get current traffic state snapshot
   */
  @Get('snapshot')
  @ApiOperation({ 
    summary: 'Get current traffic state', 
    description: 'Retrieve real-time snapshot of all road traffic states and light statuses' 
  })
  @ApiResponse({ status: 200, description: 'Current traffic state snapshot' })
  async getSnapshot() {
    return this.trafficService.getSnapshot();
  }

  /**
   * GET /api/traffic/stats?cameraId=1&from=...&to=...
   * Get traffic statistics for a camera within a time range
   */
  @Get('stats')
  @ApiOperation({ 
    summary: 'Get traffic statistics', 
    description: 'Retrieve aggregated traffic statistics for a specific camera and time range' 
  })
  @ApiQuery({ name: 'cameraId', type: 'string', required: false, description: 'Camera ID to filter by', example: '1' })
  @ApiQuery({ name: 'from', type: 'string', required: false, description: 'Start timestamp (ISO 8601)', example: '2025-11-25T00:00:00Z' })
  @ApiQuery({ name: 'to', type: 'string', required: false, description: 'End timestamp (ISO 8601)', example: '2025-11-25T23:59:59Z' })
  @ApiResponse({ status: 200, description: 'Traffic statistics retrieved successfully' })
  async getStats(
    @Query('cameraId') cameraId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const cameraIdNum = cameraId ? parseInt(cameraId, 10) : undefined;
    return this.trafficService.getStats(cameraIdNum, from, to);
  }

  @Get('minute-stats')
  @ApiOperation({ summary: 'Lấy thống kê lưu lượng theo phút cho nhiều camera' })
  async getMinuteStats(
    @Query('cameraIds') cameraIds?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.trafficService.getMinuteStats(cameraIds, from, to);
  }
}
