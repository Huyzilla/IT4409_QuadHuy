import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new camera
 */
export class CreateCameraDto {
  @ApiProperty({
    description: 'Camera name',
    example: 'North Road Camera 1',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Video source URL or stream identifier',
    example: 'rtsp://192.168.1.100:554/stream1',
  })
  @IsNotEmpty()
  @IsString()
  videoSource: string;

  @ApiProperty({
    description: 'Camera latitude coordinate',
    example: 21.0285,
  })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Camera longitude coordinate',
    example: 105.8542,
  })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}

/**
 * DTO for updating camera information
 */
export class UpdateCameraDto {
  @ApiProperty({
    description: 'Camera name',
    example: 'North Road Camera 1',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Video source URL or stream identifier',
    example: 'rtsp://192.168.1.100:554/stream1',
    required: false,
  })
  @IsOptional()
  @IsString()
  videoSource?: string;

  @ApiProperty({
    description: 'Camera latitude coordinate',
    example: 21.0285,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    description: 'Camera longitude coordinate',
    example: 105.8542,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    description: 'Congestion threshold (density) used by frontend alerts',
    example: 0.7,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @ApiProperty({
    description: 'Max vehicles capacity used to normalize density (vehicles / maxVehicles)',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  maxVehicles?: number;

  @ApiProperty({
    description: 'Enable/disable AI counting and alerts for this camera',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;
}
