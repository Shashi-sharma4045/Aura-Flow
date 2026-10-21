/**
 * Security Utility Module
 * Defense-in-depth sanitization, validation, and ID generation.
 */

// Sanitized email regex without single quotes or dangerous SQL meta-characters
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates an email string against security and format constraints.
 * Fixed: Injection and format tampering via unvalidated email strings.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254 || trimmed.length < 5) return false;
  // Disallow consecutive dots, quotes, SQL comments, semicolons, and angle brackets
  if (/['";<>\\]/.test(trimmed) || trimmed.includes('--') || trimmed.includes('..')) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validates password strength (minimum 8 characters, at least one letter and number).
 */
export function isValidPassword(password: string): { valid: boolean; reason?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long' };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain both letters and numbers' };
  }
  return { valid: true };
}

/**
 * Sanitizes auth errors to prevent leaking database schemas, constraint names, or rate limit metrics.
 * Fixed: Information disclosure via verbose backend exception messages.
 */
export function sanitizeAuthError(error: any): string {
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
  if (msg.includes('password') && (msg.includes('short') || msg.includes('weak') || msg.includes('least 6') || msg.includes('least 8'))) {
    return 'Password does not meet minimum complexity requirements.';
  }
  if (msg.includes('same as') || msg.includes('different from')) {
    return 'New password should be different from your old password.';
  }
  if (msg.includes('token') && (msg.includes('expired') || msg.includes('invalid') || msg.includes('not found'))) {
    return 'The password reset link has expired or is invalid. Please request a new one.';
  }
  return 'Authentication service error. Please try again later.';
}

/**
 * Cryptographically random UUID generator to prevent IDOR / enumeration attacks.
 * Fixed: IDOR via predictable or sequential identifier generation.
 */
export function generateSecureId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback high-entropy RFC4122 v4 generator using getRandomValues
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return [...bytes].map((b, i) => (i === 4 || i === 6 || i === 8 || i === 10 ? '-' : '') + b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
