import { IsOptional, IsInt, IsString } from 'class-validator';

/**
 * DTO for querying traffic logs
 */
export class TrafficLogsQueryDto {
  @IsOptional()
  @IsInt()
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  offset?: number = 0;
}

/**
 * DTO for querying traffic statistics
 */
export class TrafficStatsQueryDto {
  @IsOptional()
  @IsInt()
  cameraId?: number;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
