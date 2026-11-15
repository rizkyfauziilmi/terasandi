import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthEventsListener } from './auth-events.listener.js';
import { CredentialsService } from './credentials.service.js';
import { JwtAuth } from './jwt-auth.provider.js';
import { DrizzleRefreshTokenStore } from './refresh-token.store.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    JwtAuth,
    CredentialsService,
    AuthService,
    AuthEventsListener,
    DrizzleRefreshTokenStore,
  ],
})
export class AuthModule {}
