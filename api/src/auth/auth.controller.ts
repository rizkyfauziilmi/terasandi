import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
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

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('onboarding')
  async isOnboarding(): Promise<boolean> {
    return this.authService.isOnboarding();
  }

  @Post('onboarding')
  async onboarding(
    @Body({ schema: signUpSchema }) body: SignUpDto,
  ): Promise<AuthResponse> {
    return this.authService.onboarding(body);
  }

  @Post('sign-in')
  @HttpCode(200)
  async signIn(
    @Body({ schema: signInSchema }) body: SignInDto,
  ): Promise<AuthResponse> {
    return this.authService.signIn(body);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body({ schema: refreshTokenSchema }) body: RefreshTokenDto,
  ): Promise<AuthTokens> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('sign-out')
  @HttpCode(204)
  async signOut(
    @Body({ schema: refreshTokenSchema }) body: RefreshTokenDto,
  ): Promise<void> {
    await this.authService.signOut(body.refreshToken);
  }
}
