import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 80)
  firstName!: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  middleName?: string;

  @IsString()
  @Length(2, 80)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(2, 5)
  preferredLanguage?: string;
}
