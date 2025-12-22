// nhận dữ liệu theo phút
import { IsInt, IsNumber } from 'class-validator';

export class TrafficMinuteSummaryDto {
  @IsInt()
  cameraId: number;
  @IsInt()
  minuteStart: number;
  @IsInt()
  minuteEnd: number;
  @IsNumber()
  vehicles_avg: number;
  @IsInt()
  vehicles_max: number;
  @IsInt()
  samples: number;
  @IsInt()
  flow_count: number;
}
