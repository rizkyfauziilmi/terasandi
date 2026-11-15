import { Logger } from '@nestjs/common';
import {
  AuthenticationEvents,
  type AuthenticationEvent,
} from '@nestjs/authentication';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthEventsListener } from './auth-events.listener.js';

const reused = {
  type: 'refresh-token-reused',
  userId: 'a40890cc-d300-412b-9e3e-b760003170eb',
  tokenFamilyId: 'family-1',
} as const;

describe('AuthEventsListener', () => {
  let events: Subject<AuthenticationEvent>;
  let listener: AuthEventsListener;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    events = new Subject<AuthenticationEvent>();
    listener = new AuthEventsListener({
      events$: events.asObservable(),
    } as AuthenticationEvents);
    listener.onModuleInit();
  });

  afterEach(() => {
    listener.onModuleDestroy();
    vi.restoreAllMocks();
  });

  it('warns with the user and family when a refresh token is reused', () => {
    events.next(reused);

    expect(warnSpy).toHaveBeenCalledWith(
      'Refresh token reused; token family revoked',
      { userId: reused.userId, tokenFamilyId: reused.tokenFamilyId },
    );
  });

  it('ignores the events that are logged where they happen', () => {
    events.next({ type: 'sign-out', userId: reused.userId });
    events.next({ type: 'sign-in', userId: reused.userId, method: 'password' });

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('stops listening when the module is destroyed', () => {
    listener.onModuleDestroy();

    events.next(reused);

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
