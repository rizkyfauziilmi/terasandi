import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { AppLogger } from './logger/app-logger.js';
import { requestLoggingMiddleware } from './logger/request-logging.middleware.js';

async function bootstrap() {
  // Buffer the bootstrap logs until the application logger (which reads the
  // validated environment) is available.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(app.get(AppLogger));

  // Registered as middleware, not an interceptor, so requests rejected by a
  // guard or by the router itself are logged as well.
  app.use(requestLoggingMiddleware(new Logger('HTTP')));
  app.enableShutdownHooks();

  // Behind a reverse proxy the client address arrives in `X-Forwarded-For`.
  // Without this every request looks like it came from the proxy, and they
  // all share one rate-limit bucket.
  if (config.getOrThrow('TRUST_PROXY', { infer: true })) {
    const adapter = app.getHttpAdapter().getInstance() as {
      set(setting: string, value: unknown): void;
    };
    adapter.set('trust proxy', 1);
  }

  const port = config.getOrThrow('PORT', { infer: true });
  const env = config.getOrThrow('NODE_ENV', { infer: true });

  await app.listen(port);

  new Logger('Bootstrap').log('API listening', { port, env });
}

await bootstrap();
