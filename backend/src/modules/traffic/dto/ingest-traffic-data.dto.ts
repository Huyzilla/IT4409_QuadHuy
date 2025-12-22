import { IsNotEmpty, IsNumber, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for incoming traffic data from AI camera
 * Matches the JSON structure sent by AI module
 */
export class IngestTrafficDataDto {
  @ApiProperty({
    description: 'Camera ID that captured the traffic data',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  cameraId: number;

  @ApiProperty({
    description: 'Number of vehicles detected in the frame',
    example: 5,
  })
  @IsNotEmpty()
  @IsInt()
  vehicles: number;

  @ApiProperty({
    description:
      'Whether an emergency vehicle (ambulance, fire truck) was detected',
    example: false,
  })
  @IsNotEmpty()
  @IsBoolean()
  isEmergency: boolean;

  @ApiProperty({
    description: 'Unix timestamp when the data was captured',
    example: 1732500000,
  })
  @IsNotEmpty()
  @IsNumber()
  timestamp: number;
}
