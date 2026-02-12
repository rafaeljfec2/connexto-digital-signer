import { PartialType } from '@nestjs/swagger';
import { CreateTenantSignerDto } from './create-tenant-signer.dto';

export class UpdateTenantSignerDto extends PartialType(CreateTenantSignerDto) {}
