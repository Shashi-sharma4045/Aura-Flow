/**
 * Frontend Security Regression Test Suite
 * Executable via `node test_security.mjs`
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254 || trimmed.length < 5) return false;
  if (/['";<>\\]/.test(trimmed) || trimmed.includes('--') || trimmed.includes('..')) return false;
  return EMAIL_REGEX.test(trimmed);
}

function isValidPassword(password) {
  if (!password || typeof password !== 'string') return { valid: false };
  if (password.length < 8) return { valid: false };
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return { valid: false };
  return { valid: true };
}

function sanitizeAuthError(error) {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const msg = (typeof error === 'string' ? error : error?.message || '').toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many login attempts. Please wait a few moments before trying again.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Your email address is not yet verified. Please check your inbox for the confirmation email.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  return 'Authentication service error. Please try again later.';
}

function generateSecureId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

test('Security: Email validation blocks malicious payloads & invalid formats', () => {
  const maliciousInputs = [
    "' OR '1'='1",
    "<script>alert(1)</script>",
    "admin'--@test.com",
    "admin\"@test.com",
    "user;select@domain.com",
    "user@domain..com",
    "@missingusername.com",
    "user@.missingdomain",
    "",
    null,
    undefined,
  ];

  for (const input of maliciousInputs) {
    assert.equal(isValidEmail(input), false, `Should reject malicious/invalid input: ${input}`);
  }

  assert.equal(isValidEmail('user@focusflow.io'), true);
  assert.equal(isValidEmail('test.account+focus@sub.domain.org'), true);
});

test('Security: Password policy rejects weak credentials', () => {
  assert.equal(isValidPassword('short').valid, false);
  assert.equal(isValidPassword('onlyletters').valid, false);
  assert.equal(isValidPassword('12345678').valid, false);
  assert.equal(isValidPassword('SecurePass123!').valid, true);
});

test('Security: Error sanitization prevents database schema & internal leakage', () => {
  const rawPostgresError = {
    message: 'duplicate key value violates unique constraint "users_email_key" at postgres.c:124'
  };
  const sanitized = sanitizeAuthError(rawPostgresError);
  assert.equal(sanitized.includes('users_email_key'), false);
  assert.equal(sanitized.includes('postgres'), false);

  const rateLimitError = { message: 'Over_email_send_rate_limit: 429' };
  assert.equal(
    sanitizeAuthError(rateLimitError),
    'Too many login attempts. Please wait a few moments before trying again.'
  );
});

test('Security: Secure ID generation produces valid UUIDv4 strings', () => {
  const id1 = generateSecureId();
  const id2 = generateSecureId();
  assert.notEqual(id1, id2, 'IDs must be unique');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.equal(uuidRegex.test(id1), true, `ID ${id1} must match UUIDv4 format`);
});
