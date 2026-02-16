/**
 * Map Supabase auth error messages to user-friendly text. No raw codes to UI.
 */
export function getAuthErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Something went wrong. Please try again.';
  const msg = (err as { message?: string }).message ?? '';
  if (msg.includes('Invalid login credentials')) return 'Invalid email or password.';
  if (msg.includes('Email not confirmed')) return 'Please check your email and confirm your account before signing in.';
  if (msg.includes('User already registered') || msg.includes('already been registered')) return 'An account with this email already exists. Try signing in.';
  if (msg.includes('Password should be') || msg.includes('at least 6')) return 'Password must be at least 6 characters.';
  if (msg.includes('Unable to validate email')) return 'Please check your email and try again.';
  if (msg.includes('rate limit') || msg.includes('Too Many Requests')) return 'Too many attempts. Please try again later.';
  if (msg.length > 0) return msg;
  return 'Something went wrong. Please try again.';
}
