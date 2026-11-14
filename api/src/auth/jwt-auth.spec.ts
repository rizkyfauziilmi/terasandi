import { AuthenticationRegistry } from '@nestjs/authentication';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { UsersService } from '../users/users.service.js';
import { JwtAuth } from './jwt-auth.provider.js';

describe('JwtAuth', () => {
  let provider: JwtAuth;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuth,
        { provide: UsersService, useValue: { findById: vi.fn() } },
        {
          provide: AuthenticationRegistry,
          useValue: { registerProvider: vi.fn() },
        },
      ],
    }).compile();

    provider = module.get<JwtAuth>(JwtAuth);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
