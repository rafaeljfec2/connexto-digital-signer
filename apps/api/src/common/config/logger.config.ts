import type { Options } from 'pino-http';
import { stdSerializers } from 'pino-http';

function customLogLevel(
  _req: { method?: string },
  res: { statusCode: number },
  err?: Error
): 'info' | 'warn' | 'error' {
  if (err ?? res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return 'info';
}

function customSuccessMessage(
  req: { method?: string; url?: string; originalUrl?: string },
  _res: { statusCode: number }
): string {
  const method = req.method ?? 'GET';
  const url = req.url ?? req.originalUrl ?? '';
  return `request completed - ${method} ${url}`;
}

interface ReqLike {
  method?: string;
  url?: string;
  originalUrl?: string;
}

interface ResLike {
  statusCode: number;
}

const productionLoggerConfig: Options = {
  serializers: {
    req: (req: ReqLike) => ({
      method: req.method,
      url: req.url ?? req.originalUrl ?? '',
    }),
    res: (res: ResLike) => ({
      statusCode: res.statusCode,
    }),
    err: stdSerializers.err,
  },
  customLogLevel,
  customSuccessMessage,
};

const developmentLoggerConfig: Options = {
  ...productionLoggerConfig,
  formatters: {
    log: (object: Record<string, unknown> & { context?: unknown; msg?: unknown }) => {
      const ctx = object.context;
      const isEmptyOrUndefinedStr =
        ctx === undefined ||
        ctx === null ||
        (typeof ctx === 'string' && (ctx.trim() === '' || ctx === 'undefined'));
      if (isEmptyOrUndefinedStr) {
        const { context: _c, ...rest } = object;
        return { ...rest };
      }
      return object;
    },
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname,context',
      singleLine: true,
      hideObject: false,
      messageFormat: '{if context}[{context}] {end} {msg}{end}',
    },
  },
};

export function getLoggerConfig(): { pinoHttp: Options } {
  const pinoHttp =
    process.env['NODE_ENV'] === 'production' ? productionLoggerConfig : developmentLoggerConfig;
  return { pinoHttp };
}
