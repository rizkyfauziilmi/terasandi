import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
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
    refresh: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      isOnboarding: vi.fn(),
      onboarding: vi.fn(),
      signIn: vi.fn(),
      refresh: vi.fn(),
      signOut: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([])],
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

  describe('refresh', () => {
    it('exchanges the refresh token for a new pair', async () => {
      const body = { refreshToken: testTokens.refreshToken };
      authService.refresh.mockResolvedValue(testTokens);

      await expect(controller.refresh(body)).resolves.toEqual(testTokens);
      expect(authService.refresh).toHaveBeenCalledWith(body.refreshToken);
    });
  });

  describe('signOut', () => {
    it('revokes the token family', async () => {
      const body = { refreshToken: testTokens.refreshToken };

      await controller.signOut(body);

      expect(authService.signOut).toHaveBeenCalledWith(body.refreshToken);
    });
  });
});
