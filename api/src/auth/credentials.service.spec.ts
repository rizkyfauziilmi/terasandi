import { PasswordHasher } from '@nestjs/authentication';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { testUser, testUserRow } from '../../test/fixtures/auth.fixture.js';
import { UsersService } from '../users/users.service.js';
import { CredentialsService } from './credentials.service.js';

const password = 'password-12345';
const storedCredentials = {
  user: testUser,
  passwordHash: testUserRow.passwordHash,
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
      usersService.create.mockResolvedValue(testUser);

      await expect(
        service.register(testUser.username, password),
      ).resolves.toBe(testUser);
      expect(passwordHasher.hash).toHaveBeenCalledWith(password);
      expect(usersService.create).toHaveBeenCalledWith({
        username: testUser.username,
        passwordHash: 'hashed-password',
      });
    });

    it('rejects a username that is already taken', async () => {
      usersService.findByUsername.mockResolvedValue(testUser);

      await expect(
        service.register(testUser.username, password),
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
        service.register(testUser.username, password),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a top-level unique violation to a conflict', async () => {
      usersService.findByUsername.mockResolvedValue(undefined);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      usersService.create.mockRejectedValue({ code: '23505' });

      await expect(
        service.register(testUser.username, password),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows an unrelated insert error unchanged', async () => {
      const error = new Error('connection lost');
      usersService.findByUsername.mockResolvedValue(undefined);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      usersService.create.mockRejectedValue(error);

      await expect(service.register(testUser.username, password)).rejects.toBe(
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
        service.register(testUser.username, password),
      ).rejects.not.toBeInstanceOf(ConflictException);
    });
  });

  describe('verify', () => {
    it('returns the user when the password matches', async () => {
      usersService.findCredentials.mockResolvedValue(storedCredentials);
      passwordHasher.verify.mockResolvedValue(true);
      passwordHasher.needsRehash.mockReturnValue(false);

      await expect(service.verify(testUser.username, password)).resolves.toBe(
        testUser,
      );
      expect(passwordHasher.verify).toHaveBeenCalledWith(
        password,
        storedCredentials.passwordHash,
      );
      expect(usersService.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('returns null when the password does not match', async () => {
      usersService.findCredentials.mockResolvedValue(storedCredentials);
      passwordHasher.verify.mockResolvedValue(false);

      await expect(
        service.verify(testUser.username, 'wrong-password'),
      ).resolves.toBeNull();
    });

    it('returns null when the username is unknown', async () => {
      usersService.findCredentials.mockResolvedValue(undefined);
      passwordHasher.verify.mockResolvedValue(false);

      await expect(service.verify('unknown', password)).resolves.toBeNull();
      expect(passwordHasher.verify).toHaveBeenCalledWith(password, undefined);
    });

    it('upgrades a stored hash that uses outdated cost settings', async () => {
      usersService.findCredentials.mockResolvedValue(storedCredentials);
      passwordHasher.verify.mockResolvedValue(true);
      passwordHasher.needsRehash.mockReturnValue(true);
      passwordHasher.hash.mockResolvedValue('new-hash');

      await expect(service.verify(testUser.username, password)).resolves.toBe(
        testUser,
      );
      expect(usersService.updatePasswordHash).toHaveBeenCalledWith(
        testUser.id,
        'new-hash',
      );
    });
  });
});
