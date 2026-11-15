import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '@nestjs/authentication';
import { vi } from 'vitest';
import type { User } from '../db/schema.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { CredentialsService } from './credentials.service.js';

const user: User = {
  id: 'a40890cc-d300-412b-9e3e-b760003170eb',
  username: 'rizky',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const credentials = {
  username: 'rizky',
  password: 'correct horse battery staple',
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { hasAnyUser: ReturnType<typeof vi.fn> };
  let credentialsService: {
    register: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };
  let tokenService: { issue: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    usersService = { hasAnyUser: vi.fn() };
    credentialsService = { register: vi.fn(), verify: vi.fn() };
    tokenService = {
      issue: vi.fn().mockResolvedValue({
        accessToken: 'token-123',
        expiresIn: 900,
      }),
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
      credentialsService.register.mockResolvedValue(user);

      const result = await service.onboarding(credentials);

      expect(credentialsService.register).toHaveBeenCalledWith(
        credentials.username,
        credentials.password,
      );
      expect(tokenService.issue).toHaveBeenCalledWith(user.id, {
        method: 'password',
      });
      expect(result).toEqual({
        user,
        accessToken: 'token-123',
        expiresIn: 900,
      });
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
      credentialsService.verify.mockResolvedValue(user);

      const result = await service.signIn(credentials);

      expect(credentialsService.verify).toHaveBeenCalledWith(
        credentials.username,
        credentials.password,
      );
      expect(result).toEqual({
        user,
        accessToken: 'token-123',
        expiresIn: 900,
      });
    });

    it('throws UnauthorizedException for invalid credentials', async () => {
      credentialsService.verify.mockResolvedValue(null);

      await expect(service.signIn(credentials)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
