import { IsInt, IsOptional, IsString, Length, Matches, Max, Min, MaxLength } from 'class-validator';

export class RegisterDocumentDto {
  @IsString()
  @Length(2, 80)
  documentType!: string;

  @IsString()
  @Length(1, 255)
  originalFileName!: string;

  @IsString()
  @Length(3, 120)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(25 * 1024 * 1024)
  byteSize!: number;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/i)
  sha256Hex!: string;

  @IsString()
  @MaxLength(500)
  storageObjectKey!: string;

  @IsOptional()
  @IsString()
  credentialPublicId?: string;

  @IsOptional()
  @IsString()
  roleRequestPublicId?: string;
}
