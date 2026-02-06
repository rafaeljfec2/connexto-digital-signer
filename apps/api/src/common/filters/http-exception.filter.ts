import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';

type ErrorResponse = {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
};

type HttpExceptionResponse = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

const DEFAULT_ERROR_MESSAGE = 'Internal server error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const timestamp = new Date().toISOString();

    if (exception instanceof QueryFailedError) {
      const { statusCode, message } = mapQueryFailedError(exception);
      response.status(statusCode).json({
        statusCode,
        message,
        error: 'DatabaseError',
        timestamp,
      } satisfies ErrorResponse);
      return;
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = normalizeHttpException(exception.getResponse(), exception.name);
      response.status(statusCode).json({
        statusCode,
        message: payload.message,
        error: payload.error,
        timestamp,
      } satisfies ErrorResponse);
      return;
    }

    response.status(500).json({
      statusCode: 500,
      message: DEFAULT_ERROR_MESSAGE,
      error: 'InternalServerError',
      timestamp,
    } satisfies ErrorResponse);
  }
}

function normalizeHttpException(
  response: string | object,
  fallbackError: string
): { message: string | string[]; error: string } {
  if (typeof response === 'string') {
    return { message: response, error: fallbackError };
  }
  const payload = response as HttpExceptionResponse;
  return {
    message: payload.message ?? DEFAULT_ERROR_MESSAGE,
    error: payload.error ?? fallbackError,
  };
}

function mapQueryFailedError(exception: QueryFailedError): {
  statusCode: number;
  message: string;
} {
  const errorCode = (exception as { code?: string }).code;
  const detail = (exception as { detail?: string }).detail;
  if (errorCode === '23505') {
    return { statusCode: 409, message: detail ?? 'Duplicate key violation' };
  }
  if (errorCode === '23503') {
    return { statusCode: 409, message: detail ?? 'Foreign key violation' };
  }
  if (errorCode === '23502') {
    return { statusCode: 400, message: detail ?? 'Missing required field' };
  }
  if (errorCode === '22P02') {
    return { statusCode: 400, message: detail ?? 'Invalid input syntax' };
  }
  return { statusCode: 500, message: detail ?? DEFAULT_ERROR_MESSAGE };
}
