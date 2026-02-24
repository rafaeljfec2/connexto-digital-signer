import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { ApiRequestLog } from '../entities/api-request-log.entity';
import { ApiLogsQueryDto } from '../dto/api-logs-query.dto';

export interface ApiLogStats {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgDuration: number;
  topEndpoints: Array<{ path: string; method: string; count: number }>;
  requestsByDay: Array<{ date: string; count: number }>;
}

@Injectable()
export class ApiRequestLogsService {
  constructor(
    @InjectRepository(ApiRequestLog)
    private readonly logRepository: Repository<ApiRequestLog>,
  ) {}

  async findAll(
    tenantId: string,
    query: ApiLogsQueryDto,
  ): Promise<{ data: ApiRequestLog[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: FindOptionsWhere<ApiRequestLog> = { tenantId };
    if (query.method) where.method = query.method.toUpperCase();
    if (query.statusCode) where.statusCode = query.statusCode;
    if (query.path) where.path = ILike(`%${query.path}%`);
    if (query.dateFrom && query.dateTo) {
      where.createdAt = Between(new Date(query.dateFrom), new Date(query.dateTo));
    }

    const [data, total] = await this.logRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async getStats(tenantId: string): Promise<ApiLogStats> {
    const [totalResult, successResult, errorResult, avgResult] = await Promise.all([
      this.logRepository.count({ where: { tenantId } }),
      this.logRepository
        .createQueryBuilder('log')
        .where('log.tenant_id = :tenantId', { tenantId })
        .andWhere('log.status_code >= 200')
        .andWhere('log.status_code < 400')
        .getCount(),
      this.logRepository
        .createQueryBuilder('log')
        .where('log.tenant_id = :tenantId', { tenantId })
        .andWhere('log.status_code >= 400')
        .getCount(),
      this.logRepository
        .createQueryBuilder('log')
        .select('AVG(log.duration)', 'avg')
        .where('log.tenant_id = :tenantId', { tenantId })
        .getRawOne<{ avg: string | null }>(),
    ]);

    const topEndpoints = await this.logRepository
      .createQueryBuilder('log')
      .select('log.path', 'path')
      .addSelect('log.method', 'method')
      .addSelect('COUNT(*)', 'count')
      .where('log.tenant_id = :tenantId', { tenantId })
      .groupBy('log.path')
      .addGroupBy('log.method')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ path: string; method: string; count: string }>();

    const requestsByDay = await this.logRepository
      .createQueryBuilder('log')
      .select("TO_CHAR(log.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('log.tenant_id = :tenantId', { tenantId })
      .andWhere('log.created_at >= NOW() - INTERVAL \'30 days\'')
      .groupBy("TO_CHAR(log.created_at, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: string }>();

    return {
      totalRequests: totalResult,
      successCount: successResult,
      errorCount: errorResult,
      avgDuration: Math.round(Number(avgResult?.avg ?? 0)),
      topEndpoints: topEndpoints.map((e) => ({
        path: e.path,
        method: e.method,
        count: Number(e.count),
      })),
      requestsByDay: requestsByDay.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
    };
  }
}
