import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from '../users/users.module.js';
import { createAuthThrottlerOptions } from './auth-throttler.config.js';
import { AuthController } from './auth.controller.js';
import { AuthEventsListener } from './auth-events.listener.js';
import { CredentialsService } from './credentials.service.js';
import { JwtAuth } from './jwt-auth.provider.js';
import { DrizzleRefreshTokenStore } from './refresh-token.store.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    UsersModule,
    ThrottlerModule.forRootAsync({
      useFactory: createAuthThrottlerOptions,
      inject: [ConfigService],
    }),
  ],
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
