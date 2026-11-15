import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { signInSchema, signUpSchema } from './auth.schemas.js';
import type { SignInDto, SignUpDto } from './auth.schemas.js';
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
}
