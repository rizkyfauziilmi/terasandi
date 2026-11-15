import { ConsoleLogger, filterLogLevels, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

/**
 * Keys masked by the built-in logger, at any depth, in text and JSON mode.
 * A safety net: application code should still never pass secrets to the logger.
 */
const REDACTED_KEYS = [
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'authorization',
  'secret',
  'token',
];

/**
 * The application logger: human-readable in development, one JSON record per
 * line in production, with log levels taken from the validated environment.
 */
@Injectable()
export class AppLogger extends ConsoleLogger {
  constructor(config: ConfigService<Env, true>) {
    const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
    const level =
      config.get('LOG_LEVEL', { infer: true }) ??
      (isProduction ? '>=log' : '>=debug');

    super({
      json: isProduction,
      colors: !isProduction,
      prefix: 'Terasandi',
      // A typo fails here, at boot, with the list of accepted levels.
      logLevels: filterLogLevels(level),
      redact: REDACTED_KEYS,
    });
  }
}
