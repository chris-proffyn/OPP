/**
 * P8 §10.2 — User-facing error with clear message and optional retry. No stack traces or secrets.
 */

const wrapStyle: React.CSSProperties = {
  padding: '1rem',
  backgroundColor: 'var(--color-error-bg, #fef2f2)',
  color: 'var(--color-error, #b91c1c)',
  borderRadius: 4,
  marginBottom: '1rem',
};

const buttonStyle: React.CSSProperties = {
  marginTop: '0.75rem',
  minHeight: 'var(--tap-min, 44px)',
  minWidth: 'var(--tap-min, 44px)',
  padding: '0.5rem 1rem',
  cursor: 'pointer',
};

type ErrorMessageProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div style={wrapStyle} role="alert">
      <p style={{ margin: 0 }}>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} style={buttonStyle}>
          Try again
        </button>
      )}
    </div>
  );
}
