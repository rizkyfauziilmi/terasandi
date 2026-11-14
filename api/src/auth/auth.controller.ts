import {
  Body,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Public, TokenService } from '@nestjs/authentication';
import { CredentialsService } from './credentials.service.js';
import { signInSchema, signUpSchema } from './auth.schemas.js';
import type { SignInDto, SignUpDto } from './auth.schemas.js';
import type { AuthResponse } from './auth.types.js';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('sign-up')
  async signUp(
    @Body({ schema: signUpSchema }) body: SignUpDto,
  ): Promise<AuthResponse> {
    const user = await this.credentialsService.register(
      body.username,
      body.password,
    );
    // The access token carries only `sub`; the user object is returned, never
    // put into the token's claims.
    const tokens = await this.tokenService.issue(user.id, {
      method: 'password',
    });

    return { user, ...tokens };
  }

  @Post('sign-in')
  @HttpCode(200)
  async signIn(
    @Body({ schema: signInSchema }) body: SignInDto,
  ): Promise<AuthResponse> {
    const user = await this.credentialsService.verify(
      body.username,
      body.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const tokens = await this.tokenService.issue(user.id, {
      method: 'password',
    });

    return { user, ...tokens };
  }
}
