import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const apiPrefix = 'digital-signer/v1';
  app.setGlobalPrefix(apiPrefix);
  const allowedOriginsRaw = process.env['CORS_ALLOWED_ORIGINS'] ?? '';
  const allowedOrigins = allowedOriginsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
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
  if (process.env['NODE_ENV'] !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Digital Signer API')
      .setDescription('Connexto Digital Signer API')
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
  }
  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
}

void bootstrap();
