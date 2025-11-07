import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

/**
 * DTO for creating a new intersection
 */
export class CreateIntersectionDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for updating intersection information
 */
export class UpdateIntersectionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
