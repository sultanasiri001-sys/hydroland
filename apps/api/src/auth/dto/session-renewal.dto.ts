import { IsString, MinLength } from 'class-validator';

export class SessionRenewalDto {
  @IsString()
  @MinLength(20)
  sessionCredential!: string;
}
