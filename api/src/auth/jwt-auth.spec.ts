import { AuthenticationRegistry } from '@nestjs/authentication';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { testUser as user } from '../../test/fixtures/auth.fixture.js';
import { UsersService } from '../users/users.service.js';
import { JwtAuth } from './jwt-auth.provider.js';

describe('JwtAuth', () => {
  let provider: JwtAuth;
  let usersService: { findById: ReturnType<typeof vi.fn> };
  let registry: { registerProvider: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    usersService = { findById: vi.fn() };
    registry = { registerProvider: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuth,
        { provide: UsersService, useValue: usersService },
        { provide: AuthenticationRegistry, useValue: registry },
      ],
    }).compile();

    provider = module.get<JwtAuth>(JwtAuth);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('registers itself with the authentication registry', () => {
    expect(registry.registerProvider).toHaveBeenCalledWith(provider);
  });

  it('returns the user matching the token subject', async () => {
    usersService.findById.mockResolvedValue(user);

    await expect(provider.validate({ sub: user.id })).resolves.toBe(user);
    expect(usersService.findById).toHaveBeenCalledWith(user.id);
  });

  it('returns null when the subject no longer has a user', async () => {
    usersService.findById.mockResolvedValue(undefined);

    await expect(provider.validate({ sub: 'deleted-user' })).resolves.toBe(
      null,
    );
    expect(usersService.findById).toHaveBeenCalledWith('deleted-user');
  });

  it('returns null without a query when the token has no subject', async () => {
    await expect(provider.validate({})).resolves.toBe(null);
    expect(usersService.findById).not.toHaveBeenCalled();
  });
});
