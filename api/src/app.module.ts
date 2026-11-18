import { AuthenticationModule } from '@nestjs/authentication';
import { AuthorizationModule } from '@nestjs/authorization';
import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';
import { StorageModule } from '@nestjs/storage';
import { createAuthenticationOptions } from './auth/auth.config.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.js';
import { createDrizzleOptions } from './db/drizzle.config.js';
import { FilesModule } from './files/files.module.js';
import { HealthModule } from './health/health.module.js';
import { LoggerModule } from './logger/logger.module.js';
import { createStorageOptions } from './storage/storage.config.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    AuthenticationModule.forRootAsync({
      useFactory: createAuthenticationOptions,
      inject: [ConfigService],
    }),
    // Authentication first: its guard sets `request.user`, which `@Can()`
    // checks read. The authorization module verifies this order at startup.
    AuthorizationModule.forRoot(),
    DrizzleModule.forRootAsync({
      useFactory: createDrizzleOptions,
      inject: [ConfigService],
    }),
    StorageModule.forRootAsync({
      useFactory: createStorageOptions,
      inject: [ConfigService],
    }),
    LoggerModule,
    UsersModule,
    AuthModule,
    FilesModule,
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
