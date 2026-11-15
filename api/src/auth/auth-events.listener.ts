import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  AuthenticationEvents,
  type AuthenticationRefreshTokenReusedEvent,
} from '@nestjs/authentication';
import { filter, type Subscription } from 'rxjs';

/**
 * Turns the package's audit events into application logs. Sign-in and
 * sign-out are already logged where they happen; a reused refresh token is
 * not, and it is the one that means a token may have been stolen.
 */
@Injectable()
export class AuthEventsListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthEventsListener.name);
  private subscription?: Subscription;

  constructor(private readonly events: AuthenticationEvents) {}

  onModuleInit(): void {
    this.subscription = this.events.events$
      .pipe(
        filter(
          (event): event is AuthenticationRefreshTokenReusedEvent =>
            event.type === 'refresh-token-reused',
        ),
      )
      .subscribe(({ userId, tokenFamilyId }) => {
        this.logger.warn('Refresh token reused; token family revoked', {
          userId,
          tokenFamilyId,
        });
      });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
