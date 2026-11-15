import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import type { User } from '../db/schema.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

const user: User = {
  id: 'a40890cc-d300-412b-9e3e-b760003170eb',
  username: 'rizky',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    isOnboarding: ReturnType<typeof vi.fn>;
    onboarding: ReturnType<typeof vi.fn>;
    signIn: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      isOnboarding: vi.fn(),
      onboarding: vi.fn(),
      signIn: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('isOnboarding', () => {
    it('returns the service result', async () => {
      authService.isOnboarding.mockResolvedValue(true);

      await expect(controller.isOnboarding()).resolves.toBe(true);
    });
  });

  describe('onboarding', () => {
    it('creates the first user and issues a token', async () => {
      authService.onboarding.mockResolvedValue({
        user,
        accessToken: 'token-123',
        expiresIn: 900,
      });

      const body = {
        username: 'rizky',
        password: 'correct horse battery staple',
      };

      const result = await controller.onboarding(body);

      expect(authService.onboarding).toHaveBeenCalledWith(body);
      expect(result).toEqual({
        user,
        accessToken: 'token-123',
        expiresIn: 900,
      });
    });
  });

  describe('signIn', () => {
    it('returns user and token for valid credentials', async () => {
      authService.signIn.mockResolvedValue({
        user,
        accessToken: 'token-123',
        expiresIn: 900,
      });

      const body = {
        username: 'rizky',
        password: 'correct horse battery staple',
      };

      const result = await controller.signIn(body);

      expect(authService.signIn).toHaveBeenCalledWith(body);
      expect(result).toEqual({
        user,
        accessToken: 'token-123',
        expiresIn: 900,
      });
    });
  });
});
