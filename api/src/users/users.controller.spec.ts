import { Test, TestingModule } from '@nestjs/testing';
import type { User } from '../../db/schema.js';
import { UsersController } from './users.controller.js';

const user: User = {
  id: 'a40890cc-d300-412b-9e3e-b760003170eb',
  username: 'rizky',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the current user from @CurrentUser() without a DB query', () => {
    expect(controller.me(user)).toBe(user);
    expect(controller.me(user)).toEqual({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });
});
