import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CredentialsService } from './credentials.service.js';
import { TokenService } from '@nestjs/authentication';
import { UsersService } from '../users/users.service.js';
import { SignInDto, SignUpDto } from './auth.schemas.js';
import { AuthResponse } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) {}

  async isOnboarding(): Promise<boolean> {
    const hasUser = await this.usersService.hasAnyUser();
    return !hasUser;
  }

  async onboarding(body: SignUpDto): Promise<AuthResponse> {
    // restrict register if user already created (onboarding done)
    if (!(await this.isOnboarding())) {
      throw new ConflictException(
        'Registration is no longer available. Please contact the administrator.',
      );
    }

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

  async signIn(body: SignInDto): Promise<AuthResponse> {
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
