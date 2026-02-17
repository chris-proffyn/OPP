/**
 * P8 §10.3 — Consistent loading state for async operations (dashboard, session list, analyzer, reports).
 * Avoids blank screen; announces to assistive tech via aria-busy.
 */

const wrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '1rem 0',
};

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 24,
  height: 24,
  flexShrink: 0,
  border: '2px solid var(--color-border)',
  borderTopColor: 'var(--color-text)',
  borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
};

export function LoadingSpinner({ message = 'Loading…' }: { message?: string }) {
  return (
    <div style={wrapStyle} role="status" aria-busy="true" aria-live="polite">
      <span style={spinnerStyle} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
