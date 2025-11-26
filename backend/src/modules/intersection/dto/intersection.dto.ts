import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new intersection
 */
export class CreateIntersectionDto {
  @ApiProperty({ 
    description: 'Intersection name', 
    example: 'Cau Giay Intersection' 
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Intersection latitude coordinate', 
    example: 21.0285 
  })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({ 
    description: 'Intersection longitude coordinate', 
    example: 105.8542 
  })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @ApiProperty({ 
    description: 'Additional description or notes', 
    example: 'Major intersection with 4 roads',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for updating intersection information
 */
export class UpdateIntersectionDto {
  @ApiProperty({ 
    description: 'Intersection name', 
    example: 'Cau Giay Intersection',
    required: false 
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ 
    description: 'Intersection latitude coordinate', 
    example: 21.0285,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ 
    description: 'Intersection longitude coordinate', 
    example: 105.8542,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ 
    description: 'Additional description or notes', 
    example: 'Major intersection with 4 roads',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;
}
