import { Logger } from '@nestjs/common';
import { vi } from 'vitest';
import { requestLoggingMiddleware } from './request-logging.middleware.js';

/** A response whose `finish` event the test fires by hand. */
function createResponse(statusCode: number) {
  let finish: (() => void) | undefined;

  const response = {
    statusCode,
    on: vi.fn((_event: 'finish', listener: () => void) => {
      finish = listener;
    }),
  };

  return {
    response,
    finish: () => {
      if (!finish) {
        throw new Error('the middleware never subscribed to `finish`');
      }
      finish();
    },
  };
}

function createRequest(method: string, path: string) {
  return { method, originalUrl: path };
}

describe('requestLoggingMiddleware', () => {
  let debug: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    debug = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs a successful request at debug with its status and duration', () => {
    const { response, finish } = createResponse(200);
    const next = vi.fn();

    requestLoggingMiddleware(new Logger('HTTP'))(
      createRequest('GET', '/users/me'),
      response,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    finish();

    expect(response.on).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(debug).toHaveBeenCalledWith(
      'Request completed',
      expect.objectContaining({
        method: 'GET',
        path: '/users/me',
        statusCode: 200,
        durationMs: expect.any(Number),
      }),
    );
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('falls back to request.url when originalUrl is missing', () => {
    const { response, finish } = createResponse(200);

    requestLoggingMiddleware(new Logger('HTTP'))(
      { method: 'POST', url: '/auth/sign-in' },
      response,
      vi.fn(),
    );
    finish();

    expect(debug).toHaveBeenCalledWith(
      'Request completed',
      expect.objectContaining({ method: 'POST', path: '/auth/sign-in' }),
    );
  });

  it('logs a 4xx at warn', () => {
    const { response, finish } = createResponse(401);

    requestLoggingMiddleware(new Logger('HTTP'))(
      createRequest('GET', '/users/me'),
      response,
      vi.fn(),
    );
    finish();

    expect(warn).toHaveBeenCalledWith(
      'Request failed',
      expect.objectContaining({
        method: 'GET',
        path: '/users/me',
        statusCode: 401,
      }),
    );
    expect(debug).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('logs a 5xx at error', () => {
    const { response, finish } = createResponse(500);

    requestLoggingMiddleware(new Logger('HTTP'))(
      createRequest('GET', '/users/me'),
      response,
      vi.fn(),
    );
    finish();

    expect(error).toHaveBeenCalledWith(
      'Request failed',
      expect.objectContaining({ statusCode: 500 }),
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not log successful health checks', () => {
    const { response, finish } = createResponse(200);

    requestLoggingMiddleware(new Logger('HTTP'))(
      createRequest('GET', '/health'),
      response,
      vi.fn(),
    );
    finish();

    expect(debug).not.toHaveBeenCalled();
  });

  it('still logs a failing health check', () => {
    const { response, finish } = createResponse(503);

    requestLoggingMiddleware(new Logger('HTTP'))(
      createRequest('GET', '/health'),
      response,
      vi.fn(),
    );
    finish();

    expect(error).toHaveBeenCalledTimes(1);
  });

  it('logs an unknown route', () => {
    const { response, finish } = createResponse(404);

    requestLoggingMiddleware(new Logger('HTTP'))(
      createRequest('GET', '/does-not-exist'),
      response,
      vi.fn(),
    );
    finish();

    expect(warn).toHaveBeenCalledWith(
      'Request failed',
      expect.objectContaining({ path: '/does-not-exist', statusCode: 404 }),
    );
  });
});
