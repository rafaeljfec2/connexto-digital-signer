import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const apiPrefix = 'digital-signer/v1';
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
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
