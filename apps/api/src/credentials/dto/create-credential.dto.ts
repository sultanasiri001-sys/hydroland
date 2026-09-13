import { IsDateString, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateCredentialDto {
  @IsString()
  @Length(2, 80)
  credentialType!: string;

  @IsString()
  @Length(2, 160)
  title!: string;

  @IsString()
  @Length(2, 160)
  issuerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  credentialNumber?: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  roleRequestPublicId?: string;
}
