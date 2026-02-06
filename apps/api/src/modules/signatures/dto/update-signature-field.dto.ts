import { PartialType } from '@nestjs/mapped-types';
import { CreateSignatureFieldDto } from './create-signature-field.dto';

export class UpdateSignatureFieldDto extends PartialType(CreateSignatureFieldDto) {}
