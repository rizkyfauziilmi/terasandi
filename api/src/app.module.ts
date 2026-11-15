import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { AuthenticationModule } from '@nestjs/authentication';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';
import { REFRESH_TOKEN_TTL } from '@terasandi/contracts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { validateEnv } from './config/env.js';
import type { Env } from './config/env.js';
import { relations } from './db/relations.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { LoggerModule } from './logger/logger.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    AuthenticationModule.forRootAsync({
      useFactory: (configService: ConfigService<Env, true>) => ({
        accessToken: {
          key: configService.get('JWT_SECRET', { infer: true }),
          issuer: 'terasandi',
          audience: 'terasandi-web',
          ttl: configService.get('ACCESS_TOKEN_TTL', { infer: true }),
        },
        refreshToken: {
          ttl: REFRESH_TOKEN_TTL,
          absoluteTtl: '90d',
        },
      }),
      inject: [ConfigService],
    }),
    DrizzleModule.forRootAsync({
      useFactory: (configService: ConfigService<Env, true>) => ({
        drizzle,
        connection: configService.get('DATABASE_URL', { infer: true }),
        relations,
      }),
      inject: [ConfigService],
    }),
    LoggerModule,
    UsersModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: StandardSchemaValidationPipe,
    },
  ],
})
export class AppModule {}
