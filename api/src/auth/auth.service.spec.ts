import { ConflictException, Logger, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService, RefreshTokenError } from '@nestjs/authentication';
import { vi } from 'vitest';
import {
  testCredentials as credentials,
  testTokens,
  testUser,
} from '../../test/fixtures/auth.fixture.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { CredentialsService } from './credentials.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { hasAnyUser: ReturnType<typeof vi.fn> };
  let credentialsService: {
    register: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };
  let tokenService: {
    issue: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
  };
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Keep the test output clean and let the logging tests inspect the calls.
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    debugSpy = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    usersService = { hasAnyUser: vi.fn() };
    credentialsService = { register: vi.fn(), verify: vi.fn() };
    tokenService = {
      issue: vi.fn().mockResolvedValue(testTokens),
      refresh: vi.fn(),
      revoke: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: CredentialsService, useValue: credentialsService },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isOnboarding', () => {
    it('is true while the API has no users', async () => {
      usersService.hasAnyUser.mockResolvedValue(false);

      await expect(service.isOnboarding()).resolves.toBe(true);
    });

    it('is false once a user exists', async () => {
      usersService.hasAnyUser.mockResolvedValue(true);

      await expect(service.isOnboarding()).resolves.toBe(false);
    });
  });

  describe('onboarding', () => {
    it('registers the first user and issues a token', async () => {
      usersService.hasAnyUser.mockResolvedValue(false);
      credentialsService.register.mockResolvedValue(testUser);

      const result = await service.onboarding(credentials);

      expect(credentialsService.register).toHaveBeenCalledWith(
        credentials.username,
        credentials.password,
      );
      expect(tokenService.issue).toHaveBeenCalledWith(testUser.id, {
        method: 'password',
      });
      expect(result).toEqual({ user: testUser, ...testTokens });
    });

    it('refuses to register once a user already exists', async () => {
      usersService.hasAnyUser.mockResolvedValue(true);

      await expect(service.onboarding(credentials)).rejects.toThrow(
        ConflictException,
      );
      expect(credentialsService.register).not.toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('returns the user and a token for valid credentials', async () => {
      credentialsService.verify.mockResolvedValue(testUser);

      const result = await service.signIn(credentials);

      expect(credentialsService.verify).toHaveBeenCalledWith(
        credentials.username,
        credentials.password,
      );
      expect(result).toEqual({ user: testUser, ...testTokens });
    });

    it('throws UnauthorizedException for invalid credentials', async () => {
      credentialsService.verify.mockResolvedValue(null);

      await expect(service.signIn(credentials)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('returns the rotated pair and logs the rotation', async () => {
      tokenService.refresh.mockResolvedValue(testTokens);

      await expect(service.refresh(testTokens.refreshToken)).resolves.toEqual(
        testTokens,
      );
      expect(tokenService.refresh).toHaveBeenCalledWith(
        testTokens.refreshToken,
      );
      expect(debugSpy).toHaveBeenCalledWith('Token refreshed');
      expect(JSON.stringify(debugSpy.mock.calls)).not.toContain(
        testTokens.refreshToken,
      );
    });

    it('warns about the reason and rethrows when a token cannot be refreshed', async () => {
      const error = new RefreshTokenError('reused');
      tokenService.refresh.mockRejectedValue(error);

      await expect(service.refresh('stale-token')).rejects.toBe(error);
      expect(warnSpy).toHaveBeenCalledWith('Token refresh failed', {
        reason: 'reused',
      });
      expect(debugSpy).not.toHaveBeenCalled();
      expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('stale-token');
    });
  });

  describe('signOut', () => {
    it('revokes the family and logs the outcome', async () => {
      tokenService.revoke.mockResolvedValue(true);

      await service.signOut(testTokens.refreshToken);

      expect(tokenService.revoke).toHaveBeenCalledWith(
        testTokens.refreshToken,
      );
      expect(logSpy).toHaveBeenCalledWith('User signed out', {
        revoked: true,
      });
    });
  });

  describe('logging', () => {
    it('logs a successful onboarding without the password', async () => {
      usersService.hasAnyUser.mockResolvedValue(false);
      credentialsService.register.mockResolvedValue(testUser);

      await service.onboarding(credentials);

      expect(logSpy).toHaveBeenCalledWith('User onboarded', {
        userId: testUser.id,
        username: testUser.username,
      });
      expect(JSON.stringify(logSpy.mock.calls)).not.toContain(
        credentials.password,
      );
    });

    it('warns when onboarding is already complete', async () => {
      usersService.hasAnyUser.mockResolvedValue(true);

      await expect(service.onboarding(credentials)).rejects.toThrow(
        ConflictException,
      );

      expect(warnSpy).toHaveBeenCalledWith(
        'Onboarding rejected: setup is already complete',
      );
    });

    it('logs a successful sign-in without the password', async () => {
      credentialsService.verify.mockResolvedValue(testUser);

      await service.signIn(credentials);

      expect(logSpy).toHaveBeenCalledWith('User signed in', {
        userId: testUser.id,
      });
      expect(JSON.stringify(logSpy.mock.calls)).not.toContain(
        credentials.password,
      );
    });

    it('warns on a failed sign-in without the password', async () => {
      credentialsService.verify.mockResolvedValue(null);

      await expect(service.signIn(credentials)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(warnSpy).toHaveBeenCalledWith('Sign-in failed', {
        username: credentials.username,
      });
      expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(
        credentials.password,
      );
    });
  });
});
