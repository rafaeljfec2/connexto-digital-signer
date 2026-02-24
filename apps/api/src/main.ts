import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

const apiPrefix = 'digital-signer/v1';

const resolveAllowedOrigins = (): string[] => {
  const raw = process.env['CORS_ALLOWED_ORIGINS'] ?? '';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

const configureOpenApi = (app: Awaited<ReturnType<typeof NestFactory.create>>): void => {
  if (process.env['NODE_ENV'] === 'production') return;
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Digital Signer API')
    .setDescription('Nexosign Digital Signer API')
    .setVersion('v1')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/swagger`, app, swaggerDocument);
  app.use(
    `/${apiPrefix}/docs`,
    apiReference({
      content: swaggerDocument,
    })
  );
};

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.setGlobalPrefix(apiPrefix);
  const allowedOrigins = resolveAllowedOrigins();
  app.use(cookieParser());
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  configureOpenApi(app);

  await app.init();
  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);

  const shutdown = async (signal: string) => {
    app.get(Logger).log(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

void bootstrap();
