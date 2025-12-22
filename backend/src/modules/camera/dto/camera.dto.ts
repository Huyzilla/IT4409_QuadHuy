import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
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
}
