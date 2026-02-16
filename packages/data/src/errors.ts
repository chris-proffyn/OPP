/**
 * Clear error types for data layer. No raw Supabase errors or secrets to callers.
 */

export class DataError extends Error {
  constructor(
    message: string,
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' | 'NETWORK'
  ) {
    super(message);
    this.name = 'DataError';
  }
}

export function isDataError(e: unknown): e is DataError {
  return e instanceof DataError;
}
