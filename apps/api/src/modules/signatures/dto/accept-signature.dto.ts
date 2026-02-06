import { IsString } from 'class-validator';

export class AcceptSignatureDto {
  @IsString()
  consent!: string;
}
