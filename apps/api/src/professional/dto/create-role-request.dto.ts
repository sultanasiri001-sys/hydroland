import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateRoleRequestDto {
  @IsString()
  @Length(2, 80)
  roleKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  applicantNote?: string;
}
