import { Test, TestingModule } from '@nestjs/testing';
import { testUser as user } from '../../test/fixtures/auth.fixture.js';
import { UsersController } from './users.controller.js';

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
