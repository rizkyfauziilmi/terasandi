import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  refreshTokenSchema,
  signInSchema,
  signUpSchema,
} from '@terasandi/contracts';
import type {
  AuthTokens,
  RefreshTokenDto,
  SignInDto,
  SignUpDto,
} from '@terasandi/contracts';
import type { AuthResponse } from './auth.types.js';
import { AuthService } from './auth.service.js';
import { AUTH_RATE_WINDOW_MS } from './auth-throttler.js';

/**
 * Sessions are refreshed and ended more often than they are created — a page
 * load after the access cookie expires, several tabs signing out — so those
 * routes get a wider window than sign-in.
 */
const SESSION_ROUTE_LIMITS = {
  auth: { limit: 30, ttl: AUTH_RATE_WINDOW_MS },
  'auth-ip': { limit: 60, ttl: AUTH_RATE_WINDOW_MS },
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('onboarding')
  @Public()
  async isOnboarding(): Promise<boolean> {
    return this.authService.isOnboarding();
  }

  @Post('onboarding')
  @Public()
  @UseGuards(ThrottlerGuard)
  async onboarding(
    @Body({ schema: signUpSchema }) body: SignUpDto,
  ): Promise<AuthResponse> {
    return this.authService.onboarding(body);
  }

  @Post('sign-in')
  @Public()
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  async signIn(
    @Body({ schema: signInSchema }) body: SignInDto,
  ): Promise<AuthResponse> {
    return this.authService.signIn(body);
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle(SESSION_ROUTE_LIMITS)
  async refresh(
    @Body({ schema: refreshTokenSchema }) body: RefreshTokenDto,
  ): Promise<AuthTokens> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('sign-out')
  @Public()
  @HttpCode(204)
  @UseGuards(ThrottlerGuard)
  @Throttle(SESSION_ROUTE_LIMITS)
  async signOut(
    @Body({ schema: refreshTokenSchema }) body: RefreshTokenDto,
  ): Promise<void> {
    await this.authService.signOut(body.refreshToken);
  }
}
