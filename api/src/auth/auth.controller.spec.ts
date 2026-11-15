import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import {
  testCredentials,
  testTokens,
  testUser,
} from '../../test/fixtures/auth.fixture.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

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
      const session = { user: testUser, ...testTokens };
      authService.onboarding.mockResolvedValue(session);

      const result = await controller.onboarding(testCredentials);

      expect(authService.onboarding).toHaveBeenCalledWith(testCredentials);
      expect(result).toEqual(session);
    });
  });

  describe('signIn', () => {
    it('returns user and token for valid credentials', async () => {
      const session = { user: testUser, ...testTokens };
      authService.signIn.mockResolvedValue(session);

      const result = await controller.signIn(testCredentials);

      expect(authService.signIn).toHaveBeenCalledWith(testCredentials);
      expect(result).toEqual(session);
    });
  });
});
