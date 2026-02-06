import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AcceptSignatureDto {
  @IsString()
  @ApiProperty({ example: 'I agree to sign this document' })
  readonly consent!: string;
}
