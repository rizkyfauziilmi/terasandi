import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RefreshTokenError, TokenService } from '@nestjs/authentication';
import { createHash } from 'node:crypto';
import { CredentialsService } from './credentials.service.js';
import { UsersService } from '../users/users.service.js';
import type { AuthTokens, SignInDto, SignUpDto } from '@terasandi/contracts';
import type { User } from '../db/schema.js';
import { AuthResponse } from './auth.types.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * Rotations already running, by token hash. Two requests presenting the
   * same token at once would otherwise rotate it twice; the second is a reuse
   * to the token store, which revokes the whole family and signs the user out.
   */
  private readonly inFlightRefreshes = new Map<string, Promise<AuthTokens>>();

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
    // Restrict registration once onboarding is done. This is the cheap check;
    // `createFirstAdmin()` is the one that holds under concurrency.
    const user =
      (await this.isOnboarding()) &&
      (await this.usersService.createFirstAdmin(body));

    if (!user) {
      this.logger.warn('Onboarding rejected: setup is already complete');
      throw new ConflictException(
        'Registration is no longer available. Please contact the administrator.',
      );
    }

    const response = await this.createSession(user);

    this.logger.log('User onboarded', {
      userId: user.id,
      username: user.username,
      role: user.role,
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

  /** Exchanges a refresh token for its successor, and a new access token. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    // Only the hash is kept: the map outlives the request by a microtask, and
    // the raw token never needs to live in memory longer than the rotation.
    const key = createHash('sha256').update(refreshToken).digest('hex');
    const running = this.inFlightRefreshes.get(key);

    if (running) {
      return running;
    }

    const pending = this.refreshOnce(refreshToken).finally(() => {
      this.inFlightRefreshes.delete(key);
    });

    this.inFlightRefreshes.set(key, pending);
    return pending;
  }

  private async refreshOnce(refreshToken: string): Promise<AuthTokens> {
    try {
      const tokens = await this.tokenService.refresh(refreshToken);
      // The pair carries no identity, so the reused-token event is where a
      // user is named. This line records the rotation itself.
      this.logger.debug('Token refreshed');

      return tokens;
    } catch (error) {
      if (error instanceof RefreshTokenError) {
        // No token value in the log: unknown, expired and reused all look
        // the same to the caller, but the reason helps when debugging.
        this.logger.warn('Token refresh failed', { reason: error.reason });
      }

      throw error;
    }
  }

  /** Revokes the token family this device signed in with. */
  async signOut(refreshToken: string): Promise<void> {
    const revoked = await this.tokenService.revoke(refreshToken);
    this.logger.log('User signed out', { revoked });
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
