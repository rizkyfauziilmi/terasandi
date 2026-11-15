import type { LoggerService } from '@nestjs/common';

/** The parts of the Express request and response the middleware reads. */
interface RequestLike {
  method: string;
  originalUrl?: string;
  url?: string;
}

interface ResponseLike {
  statusCode: number;
  on(event: 'finish', listener: () => void): unknown;
}

const HEALTH_PATH = '/health';

/**
 * Logs one line per response: `debug` for success, `warn` for a 4xx and
 * `error` for a 5xx. Middleware rather than an interceptor, so requests that
 * never reach a handler (a guard rejecting a token, an unknown route) are
 * logged too. Successful health checks stay silent so polling does not flood
 * the development output.
 */
export function requestLoggingMiddleware(logger: LoggerService) {
  return (
    request: RequestLike,
    response: ResponseLike,
    next: () => void,
  ): void => {
    const method = request.method;
    const path = request.originalUrl ?? request.url ?? '';
    const startedAt = Date.now();

    response.on('finish', () => {
      const statusCode = response.statusCode;

      if (statusCode < 400 && path.startsWith(HEALTH_PATH)) {
        return;
      }

      const params = {
        method,
        path,
        statusCode,
        durationMs: Date.now() - startedAt,
      };

      if (statusCode >= 500) {
        logger.error('Request failed', params);
      } else if (statusCode >= 400) {
        logger.warn('Request failed', params);
      } else {
        logger.debug?.('Request completed', params);
      }
    });

    next();
  };
}
