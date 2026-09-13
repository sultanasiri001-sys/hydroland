import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class ReviewRoleRequestDto {
  @IsIn(['INFO_REQUIRED', 'APPROVED', 'REJECTED'])
  decision!: 'INFO_REQUIRED' | 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @Length(2, 1000)
  reviewerNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  scopeRef?: string;
}
