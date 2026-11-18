import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import {
  testAdmin,
  testUser as user,
} from '../../test/fixtures/auth.fixture.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    list: ReturnType<typeof vi.fn>;
    findOrFail: ReturnType<typeof vi.fn>;
    createWithPassword: ReturnType<typeof vi.fn>;
    updateUsername: ReturnType<typeof vi.fn>;
    updateRole: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
    revokeSessions: ReturnType<typeof vi.fn>;
    deleteUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    usersService = {
      list: vi.fn(),
      findOrFail: vi.fn(),
      createWithPassword: vi.fn(),
      updateUsername: vi.fn(),
      updateRole: vi.fn(),
      resetPassword: vi.fn(),
      revokeSessions: vi.fn(),
      deleteUser: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('returns the current user from @CurrentUser() without a DB query', () => {
    expect(controller.me(user)).toBe(user);
    expect(controller.me(user)).toEqual({
      id: user.id,
      username: user.username,
      role: 'user',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  it('lists accounts with the parsed query', async () => {
    const query = { limit: 20, offset: 0 };
    const page = { items: [user], total: 1, limit: 20, offset: 0 };
    usersService.list.mockResolvedValue(page);

    await expect(controller.list(query)).resolves.toBe(page);
    expect(usersService.list).toHaveBeenCalledWith(query);
  });

  it('reads one account by id', async () => {
    usersService.findOrFail.mockResolvedValue(user);

    await expect(controller.findOne(user.id)).resolves.toBe(user);
    expect(usersService.findOrFail).toHaveBeenCalledWith(user.id);
  });

  it('creates an account on behalf of the signed-in admin', async () => {
    const body = { username: 'new-user', password: 'password-12345' };
    usersService.createWithPassword.mockResolvedValue(user);

    await expect(controller.create(testAdmin, body)).resolves.toBe(user);
    expect(usersService.createWithPassword).toHaveBeenCalledWith(
      body,
      testAdmin.id,
    );
  });

  it('renames an account on behalf of the signed-in admin', async () => {
    const renamed = { ...user, username: 'renamed' };
    usersService.updateUsername.mockResolvedValue(renamed);

    await expect(
      controller.updateUsername(testAdmin, user.id, { username: 'renamed' }),
    ).resolves.toBe(renamed);
    expect(usersService.updateUsername).toHaveBeenCalledWith(
      user.id,
      'renamed',
      testAdmin.id,
    );
  });

  it('changes a role on behalf of the signed-in admin', async () => {
    usersService.updateRole.mockResolvedValue({ ...user, role: 'admin' });

    await expect(
      controller.updateRole(testAdmin, user.id, { role: 'admin' }),
    ).resolves.toEqual({ ...user, role: 'admin' });
    expect(usersService.updateRole).toHaveBeenCalledWith(
      user.id,
      'admin',
      testAdmin.id,
    );
  });

  it('resets a password on behalf of the signed-in admin', async () => {
    usersService.resetPassword.mockResolvedValue(undefined);

    await expect(
      controller.resetPassword(testAdmin, user.id, {
        password: 'password-12345',
      }),
    ).resolves.toBeUndefined();
    expect(usersService.resetPassword).toHaveBeenCalledWith(
      user.id,
      'password-12345',
      testAdmin.id,
    );
  });

  it('revokes an account sessions on behalf of the signed-in admin', async () => {
    usersService.revokeSessions.mockResolvedValue(undefined);

    await expect(
      controller.revokeSessions(testAdmin, user.id),
    ).resolves.toBeUndefined();
    expect(usersService.revokeSessions).toHaveBeenCalledWith(
      user.id,
      testAdmin.id,
    );
  });

  it('deletes an account on behalf of the signed-in admin', async () => {
    usersService.deleteUser.mockResolvedValue(undefined);

    await expect(
      controller.delete(testAdmin, user.id),
    ).resolves.toBeUndefined();
    expect(usersService.deleteUser).toHaveBeenCalledWith(user.id, testAdmin.id);
  });
});
