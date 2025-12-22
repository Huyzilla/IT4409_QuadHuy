import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsObject,
  IsArray,
  IsNumber,
} from 'class-validator';

/**
 * DTO for creating traffic signal log
 */
export class CreateTrafficSignalLogDto {
  @IsNotEmpty()
  @IsNumber()
  timestamp: number;

  @IsNotEmpty()
  @IsString()
  readableTime: string;

  @IsNotEmpty()
  @IsString()
  event: string;

  @IsNotEmpty()
  @IsInt()
  greenRoadId: number;

  @IsNotEmpty()
  @IsInt()
  duration: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsNotEmpty()
  @IsObject()
  trafficStatus: any;

  @IsNotEmpty()
  @IsArray()
  cycleQueue: number[];
}
