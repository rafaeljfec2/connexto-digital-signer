import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiRequestLog } from '../entities/api-request-log.entity';

interface ApiRequestLogPayload {
  tenantId: string;
  apiKeyId: string | null;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  ip: string | null;
  userAgent: string | null;
  responseSize: number;
}

@Injectable()
@Processor('api-request-logs')
export class ApiRequestLogProcessor {
  constructor(
    @InjectRepository(ApiRequestLog)
    private readonly logRepository: Repository<ApiRequestLog>,
  ) {}

  @Process('save')
  async handleSave(job: Job<ApiRequestLogPayload>): Promise<void> {
    const log = this.logRepository.create(job.data);
    await this.logRepository.save(log);
  }
}
