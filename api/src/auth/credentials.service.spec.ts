import { PasswordHasher } from '@nestjs/authentication';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import type { User } from '../db/schema.js';
import { UsersService } from '../users/users.service.js';
import { CredentialsService } from './credentials.service.js';

const user: User = {
  id: 'a40890cc-d300-412b-9e3e-b760003170eb',
  username: 'rizky',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('CredentialsService', () => {
  let service: CredentialsService;
  let usersService: {
    findByUsername: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findCredentials: ReturnType<typeof vi.fn>;
    updatePasswordHash: ReturnType<typeof vi.fn>;
  };
  let passwordHasher: {
    hash: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
    needsRehash: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    usersService = {
      findByUsername: vi.fn(),
      create: vi.fn(),
      findCredentials: vi.fn(),
      updatePasswordHash: vi.fn(),
    };
    passwordHasher = {
      hash: vi.fn(),
      verify: vi.fn(),
      needsRehash: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: UsersService, useValue: usersService },
        { provide: PasswordHasher, useValue: passwordHasher },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
  });

  describe('register', () => {
    it('hashes the password and creates the user', async () => {
      usersService.findByUsername.mockResolvedValue(undefined);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      usersService.create.mockResolvedValue(user);

      await expect(service.register('rizky', 'password-12345')).resolves.toBe(
        user,
      );
      expect(passwordHasher.hash).toHaveBeenCalledWith('password-12345');
      expect(usersService.create).toHaveBeenCalledWith({
        username: 'rizky',
        passwordHash: 'hashed-password',
      });
    });

    it('rejects a username that is already taken', async () => {
      usersService.findByUsername.mockResolvedValue(user);

      await expect(
        service.register('rizky', 'password-12345'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(passwordHasher.hash).not.toHaveBeenCalled();
    });

    it('maps a unique violation raised during the insert to a conflict', async () => {
      usersService.findByUsername.mockResolvedValue(undefined);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      usersService.create.mockRejectedValue({
        cause: { code: '23505' },
      });

      await expect(
        service.register('rizky', 'password-12345'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a top-level unique violation to a conflict', async () => {
      usersService.findByUsername.mockResolvedValue(undefined);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      usersService.create.mockRejectedValue({ code: '23505' });

      await expect(
        service.register('rizky', 'password-12345'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows an unrelated insert error unchanged', async () => {
      const error = new Error('connection lost');
      usersService.findByUsername.mockResolvedValue(undefined);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      usersService.create.mockRejectedValue(error);

      await expect(service.register('rizky', 'password-12345')).rejects.toBe(
        error,
      );
    });

    it('does not walk an arbitrarily deep cause chain', async () => {
      // One level past the depth limit, so the code is never seen.
      usersService.findByUsername.mockResolvedValue(undefined);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      usersService.create.mockRejectedValue({
        cause: {
          cause: { cause: { cause: { code: '23505' } } },
        },
      });

      await expect(
        service.register('rizky', 'password-12345'),
      ).rejects.not.toBeInstanceOf(ConflictException);
    });
  });

  describe('verify', () => {
    it('returns the user when the password matches', async () => {
      usersService.findCredentials.mockResolvedValue({
        user,
        passwordHash: 'stored-hash',
      });
      passwordHasher.verify.mockResolvedValue(true);
      passwordHasher.needsRehash.mockReturnValue(false);

      await expect(service.verify('rizky', 'password-12345')).resolves.toBe(
        user,
      );
      expect(passwordHasher.verify).toHaveBeenCalledWith(
        'password-12345',
        'stored-hash',
      );
      expect(usersService.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('returns null when the password does not match', async () => {
      usersService.findCredentials.mockResolvedValue({
        user,
        passwordHash: 'stored-hash',
      });
      passwordHasher.verify.mockResolvedValue(false);

      await expect(service.verify('rizky', 'wrong-password')).resolves.toBe(
        null,
      );
    });

    it('returns null when the username is unknown', async () => {
      usersService.findCredentials.mockResolvedValue(undefined);
      passwordHasher.verify.mockResolvedValue(false);

      await expect(service.verify('unknown', 'password-12345')).resolves.toBe(
        null,
      );
      expect(passwordHasher.verify).toHaveBeenCalledWith(
        'password-12345',
        undefined,
      );
    });

    it('upgrades a stored hash that uses outdated cost settings', async () => {
      usersService.findCredentials.mockResolvedValue({
        user,
        passwordHash: 'old-hash',
      });
      passwordHasher.verify.mockResolvedValue(true);
      passwordHasher.needsRehash.mockReturnValue(true);
      passwordHasher.hash.mockResolvedValue('new-hash');

      await expect(service.verify('rizky', 'password-12345')).resolves.toBe(
        user,
      );
      expect(usersService.updatePasswordHash).toHaveBeenCalledWith(
        user.id,
        'new-hash',
      );
    });
  });
});
