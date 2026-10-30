import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({ origin, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`API http://localhost:${port}`, 'Bootstrap');
}
await bootstrap();
