import { IsOptional, IsIn } from 'class-validator';

const SIGNING_LANGUAGES = ['pt-br', 'en'];
const REMINDER_INTERVALS = ['none', '1_day', '2_days', '3_days', '7_days'];
const CLOSURE_MODES = ['automatic', 'manual'];

export class UpdateDefaultsDto {
  @IsOptional()
  @IsIn(SIGNING_LANGUAGES)
  defaultSigningLanguage?: string;

  @IsOptional()
  @IsIn(REMINDER_INTERVALS)
  defaultReminderInterval?: string;

  @IsOptional()
  @IsIn(CLOSURE_MODES)
  defaultClosureMode?: string;
}
