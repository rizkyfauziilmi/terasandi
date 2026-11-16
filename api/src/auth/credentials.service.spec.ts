import { PasswordHasher } from '@nestjs/authentication';
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
