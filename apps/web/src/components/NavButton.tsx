/**
 * In-app navigation styled as a button. Use by default for routing within the app (per global UX).
 * Renders a React Router Link with button appearance and tap-friendly min height.
 */

import { Link } from 'react-router-dom';

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'var(--tap-min, 44px)',
  padding: '0.5rem 1rem',
  fontWeight: 600,
  fontSize: '1rem',
  borderRadius: 6,
  border: '1px solid var(--color-border, #374151)',
  textDecoration: 'none',
  boxSizing: 'border-box',
  cursor: 'pointer',
};

const primaryStyle: React.CSSProperties = {
  ...baseStyle,
  backgroundColor: 'var(--color-primary, #3b82f6)',
  color: 'white',
  borderColor: 'var(--color-primary, #3b82f6)',
};

const secondaryStyle: React.CSSProperties = {
  ...baseStyle,
  backgroundColor: 'var(--color-surface, #1f2937)',
  color: 'var(--color-text, #f9fafb)',
};

export interface NavButtonProps {
  to: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  state?: unknown;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  'aria-label'?: string;
  'aria-disabled'?: boolean;
}

export function NavButton({
  to,
  children,
  variant = 'primary',
  state,
  style,
  className = 'tap-target',
  title,
  ...aria
}: NavButtonProps) {
  const buttonStyle = variant === 'secondary' ? secondaryStyle : primaryStyle;
  return (
    <Link
      to={state !== undefined ? { pathname: to, state } : to}
      style={{ ...buttonStyle, ...style }}
      className={className}
      role="button"
      title={title}
      {...aria}
    >
      {children}
    </Link>
  );
}
