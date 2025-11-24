import { IsNotEmpty, IsNumber, IsBoolean, IsInt } from 'class-validator';

/**
 * DTO for incoming traffic data from AI camera
 * Matches the JSON structure sent by AI module
 */
export class IngestTrafficDataDto {
  @IsNotEmpty()
  @IsInt()
  cameraId: number;

  @IsNotEmpty()
  @IsInt()
  vehicles: number;

  @IsNotEmpty()
  @IsBoolean()
  isEmergency: boolean;

  @IsNotEmpty()
  @IsNumber()
  timestamp: number;
}
