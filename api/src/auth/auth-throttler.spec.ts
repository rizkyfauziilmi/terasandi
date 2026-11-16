import { addressTracker, credentialsTracker } from './auth-throttler.js';

describe('auth throttler trackers', () => {
  describe('addressTracker', () => {
    it('uses the address Express resolved', () => {
      expect(addressTracker({ ip: '203.0.113.7' })).toBe('203.0.113.7');
    });

    it('prefers the forwarded address when the proxy supplied one', () => {
      expect(
        addressTracker({ ip: '10.0.0.1', ips: ['203.0.113.7', '10.0.0.1'] }),
      ).toBe('203.0.113.7');
    });

    it('falls back when the request has no address', () => {
      expect(addressTracker({})).toBe('unknown');
    });
  });

  describe('credentialsTracker', () => {
    it('separates accounts on one address without keeping the username', () => {
      const alice = credentialsTracker({
        ip: '203.0.113.7',
        body: { username: 'alice' },
      });
      const bob = credentialsTracker({
        ip: '203.0.113.7',
        body: { username: 'bob' },
      });

      expect(alice).not.toBe(bob);
      expect(alice).not.toContain('alice');
      expect(alice.startsWith('203.0.113.7:')).toBe(true);
    });

    it('normalises case and surrounding spaces', () => {
      expect(
        credentialsTracker({ ip: '1.2.3.4', body: { username: ' Alice ' } }),
      ).toBe(
        credentialsTracker({ ip: '1.2.3.4', body: { username: 'alice' } }),
      );
    });

    it('separates the same account on different addresses', () => {
      expect(
        credentialsTracker({ ip: '1.1.1.1', body: { username: 'alice' } }),
      ).not.toBe(
        credentialsTracker({ ip: '2.2.2.2', body: { username: 'alice' } }),
      );
    });

    it('falls back to the address when no username was submitted', () => {
      expect(credentialsTracker({ ip: '1.2.3.4' })).toBe('1.2.3.4');
      expect(
        credentialsTracker({ ip: '1.2.3.4', body: { username: '  ' } }),
      ).toBe('1.2.3.4');
      expect(
        credentialsTracker({ ip: '1.2.3.4', body: { username: 42 } }),
      ).toBe('1.2.3.4');
    });
  });
});
