import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateNotificationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emailSenderName?: string | null;
}
