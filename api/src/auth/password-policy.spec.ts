import { describe, expect, it } from 'vitest';
import {
  createUserSchema,
  passwordSchema,
  setUserPasswordSchema,
  signUpSchema,
} from '@terasandi/contracts';

/**
 * The password policy follows NIST SP 800-63B-4 and OWASP ASVS 5.0: a length
 * floor plus a blocklist of common passwords, and no composition rules.
 */
describe('password policy', () => {
  const accepts = (value: string) => passwordSchema.safeParse(value).success;

  it('accepts a password with no digits or symbols', () => {
    expect(accepts('sunflowers')).toBe(true);
    expect(accepts('correct horse battery staple')).toBe(true);
  });

  it('accepts any characters, including spaces and unicode', () => {
    expect(accepts('a pass phrase with spaces')).toBe(true);
    expect(accepts('contraseña-segura')).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(accepts('short1!')).toBe(false);
    expect(accepts('seven77')).toBe(false);
  });

  it('accepts 128 characters and rejects 129', () => {
    expect(accepts('a'.repeat(128))).toBe(true);
    expect(accepts('a'.repeat(129))).toBe(false);
  });

  it('rejects common passwords regardless of case', () => {
    for (const common of ['password1', '12345678', 'qwerty123', 'iloveyou']) {
      expect(accepts(common), common).toBe(false);
      expect(accepts(common.toUpperCase()), common).toBe(false);
    }
  });

  it('applies the policy to every password field', () => {
    const common = { username: 'someone', password: 'qwerty123' };

    expect(signUpSchema.safeParse(common).success).toBe(false);
    expect(createUserSchema.safeParse(common).success).toBe(false);
    expect(
      setUserPasswordSchema.safeParse({ password: 'qwerty123' }).success,
    ).toBe(false);
  });
});
