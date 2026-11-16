import {
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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
  let usersService: {
    hasAnyUser: ReturnType<typeof vi.fn>;
    createFirstAdmin: ReturnType<typeof vi.fn>;
  };
  let credentialsService: {
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

    usersService = { hasAnyUser: vi.fn(), createFirstAdmin: vi.fn() };
    credentialsService = { verify: vi.fn() };
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
    it('creates the first user as an admin and issues a token', async () => {
      usersService.hasAnyUser.mockResolvedValue(false);
      usersService.createFirstAdmin.mockResolvedValue(testUser);

      const result = await service.onboarding(credentials);

      expect(usersService.createFirstAdmin).toHaveBeenCalledWith(credentials);
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
      expect(usersService.createFirstAdmin).not.toHaveBeenCalled();
    });

    it('refuses when it loses the onboarding race', async () => {
      // Another request created the first user between the cheap check and
      // the transaction.
      usersService.hasAnyUser.mockResolvedValue(false);
      usersService.createFirstAdmin.mockResolvedValue(undefined);

      await expect(service.onboarding(credentials)).rejects.toThrow(
        ConflictException,
      );
      expect(tokenService.issue).not.toHaveBeenCalled();
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

    it('shares one rotation between concurrent calls for the same token', async () => {
      let release!: (tokens: typeof testTokens) => void;
      tokenService.refresh.mockReturnValue(
        new Promise((resolve) => {
          release = resolve;
        }),
      );

      const first = service.refresh(testTokens.refreshToken);
      const second = service.refresh(testTokens.refreshToken);

      // The second call joined the first instead of spending the token again.
      expect(tokenService.refresh).toHaveBeenCalledTimes(1);

      release(testTokens);

      await expect(Promise.all([first, second])).resolves.toEqual([
        testTokens,
        testTokens,
      ]);
      expect(tokenService.refresh).toHaveBeenCalledTimes(1);
    });

    it('rotates again once the previous rotation has finished', async () => {
      tokenService.refresh.mockResolvedValue(testTokens);

      await service.refresh(testTokens.refreshToken);
      await service.refresh(testTokens.refreshToken);

      expect(tokenService.refresh).toHaveBeenCalledTimes(2);
    });

    it('forgets a failed rotation so a retry reaches the token service', async () => {
      tokenService.refresh.mockRejectedValueOnce(
        new RefreshTokenError('expired'),
      );
      tokenService.refresh.mockResolvedValueOnce(testTokens);

      await expect(service.refresh('retry-token')).rejects.toThrow(
        RefreshTokenError,
      );
      await expect(service.refresh('retry-token')).resolves.toEqual(testTokens);

      expect(tokenService.refresh).toHaveBeenCalledTimes(2);
    });
  });

  describe('signOut', () => {
    it('revokes the family and logs the outcome', async () => {
      tokenService.revoke.mockResolvedValue(true);

      await service.signOut(testTokens.refreshToken);

      expect(tokenService.revoke).toHaveBeenCalledWith(testTokens.refreshToken);
      expect(logSpy).toHaveBeenCalledWith('User signed out', {
        revoked: true,
      });
    });
  });

  describe('logging', () => {
    it('logs a successful onboarding without the password', async () => {
      usersService.hasAnyUser.mockResolvedValue(false);
      usersService.createFirstAdmin.mockResolvedValue(testUser);

      await service.onboarding(credentials);

      expect(logSpy).toHaveBeenCalledWith('User onboarded', {
        userId: testUser.id,
        username: testUser.username,
        role: testUser.role,
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
