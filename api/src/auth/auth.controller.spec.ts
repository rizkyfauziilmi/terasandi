import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import type { User } from '../../db/schema.js';
import { AuthController } from './auth.controller.js';
import { CredentialsService } from './credentials.service.js';
import { TokenService } from '@nestjs/authentication';

const user: User = {
  id: 'a40890cc-d300-412b-9e3e-b760003170eb',
  username: 'rizky',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AuthController', () => {
  let controller: AuthController;
  let credentialsService: {
    register: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };
  let tokenService: {
    issue: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    credentialsService = {
      register: vi.fn(),
      verify: vi.fn(),
    };
    tokenService = {
      issue: vi.fn().mockResolvedValue({
        accessToken: 'token-123',
        expiresIn: 900,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: CredentialsService, useValue: credentialsService },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('signUp', () => {
    it('registers and issues a token', async () => {
      credentialsService.register.mockResolvedValue(user);

      const result = await controller.signUp({
        username: 'rizky',
        password: 'correct horse battery staple',
      });

      expect(credentialsService.register).toHaveBeenCalledWith(
        'rizky',
        'correct horse battery staple',
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
  });

  describe('signIn', () => {
    it('returns user and token for valid credentials', async () => {
      credentialsService.verify.mockResolvedValue(user);

      const result = await controller.signIn({
        username: 'rizky',
        password: 'correct horse battery staple',
      });

      expect(credentialsService.verify).toHaveBeenCalledWith(
        'rizky',
        'correct horse battery staple',
      );
      expect(result).toEqual({
        user,
        accessToken: 'token-123',
        expiresIn: 900,
      });
    });

    it('throws UnauthorizedException for invalid credentials', async () => {
      credentialsService.verify.mockResolvedValue(null);

      await expect(
        controller.signIn({ username: 'rizky', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
