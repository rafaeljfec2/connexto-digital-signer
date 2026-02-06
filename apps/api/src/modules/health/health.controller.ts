import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@connexto/shared';
import { HealthService } from './health.service';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  readiness() {
    return this.healthService.readiness();
  }

  @Get('live')
  liveness() {
    return this.healthService.liveness();
  }
}
