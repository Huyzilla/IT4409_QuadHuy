import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
} from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  //  Thêm @IsOptional() để cho phép không gửi code (nếu dùng link)
  @IsString()
  @IsOptional()
  @Length(6, 6)
  code?: string;

  // Thêm trường token để Backend nhận diện được link xác thực
  @IsString()
  @IsOptional()
  token?: string;
}
