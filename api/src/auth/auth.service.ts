import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { CredentialsService } from './credentials.service.js';
import { TokenService } from '@nestjs/authentication';
import { UsersService } from '../users/users.service.js';
import { SignInDto, SignUpDto } from '@terasandi/contracts';
import type { User } from '../db/schema.js';
import { AuthResponse } from './auth.types.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
      this.logger.warn('Onboarding rejected: setup is already complete');
      throw new ConflictException(
        'Registration is no longer available. Please contact the administrator.',
      );
    }

    const user = await this.credentialsService.register(
      body.username,
      body.password,
    );

    const response = await this.createSession(user);

    this.logger.log('User onboarded', {
      userId: user.id,
      username: user.username,
    });

    return response;
  }

  async signIn(body: SignInDto): Promise<AuthResponse> {
    const user = await this.credentialsService.verify(
      body.username,
      body.password,
    );

    if (!user) {
      // The username is public input; the password never reaches the logger.
      this.logger.warn('Sign-in failed', { username: body.username });
      throw new UnauthorizedException('Invalid username or password');
    }

    const response = await this.createSession(user);

    this.logger.log('User signed in', { userId: user.id });

    return response;
  }

  /**
   * The access token carries only `sub`; the user object is returned, never
   * put into the token's claims.
   */
  private async createSession(user: User): Promise<AuthResponse> {
    const tokens = await this.tokenService.issue(user.id, {
      method: 'password',
    });

    return { user, ...tokens };
  }
}
