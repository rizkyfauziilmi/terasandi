import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: { check: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    healthService = { check: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the status reported by the service', () => {
    healthService.check.mockReturnValue({ status: 'ok' });

    expect(controller.check()).toEqual({ status: 'ok' });
    expect(healthService.check).toHaveBeenCalledTimes(1);
  });
});
