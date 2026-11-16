import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../config/env.js';
import { UsersModule } from '../users/users.module.js';
import { authThrottlerOptions } from './auth-throttler.js';
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
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        authThrottlerOptions({
          credentials: config.get('AUTH_RATE_LIMIT', { infer: true }),
          address: config.get('AUTH_IP_RATE_LIMIT', { infer: true }),
        }),
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
