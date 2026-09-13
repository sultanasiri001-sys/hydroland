import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RequestUploadDto {
  @IsString()
  documentType!: string;

  @IsString()
  originalFileName!: string;

  @IsIn(['application/pdf', 'image/jpeg', 'image/png'])
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(26_214_400)
  byteSize!: number;

  @IsOptional()
  @IsString()
  credentialPublicId?: string;

  @IsOptional()
  @IsString()
  roleRequestPublicId?: string;
}
