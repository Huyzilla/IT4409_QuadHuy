import { IsString, MinLength } from 'class-validator';

export class ChatQueryDto {
  @IsString()
  @MinLength(1)
  message: string;
}
