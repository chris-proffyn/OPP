/**
 * Wraps an inline SVG for the top nav so its fill follows light/dark theme.
 * See docs/SVG_COLOUR_CONTROL.md: wrapper div with class pcp-nav-icon-fill and
 * --pcp-nav-icon-fill set to theme text colour.
 */

import type { ReactNode } from 'react';

const wrapperStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  flexShrink: 0,
};

export function NavIcon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  if (typeof document === 'undefined') {
    return <span style={{ ...wrapperStyle, width: size, height: size }}>{children}</span>;
  }
  return (
    <div
      className="pcp-nav-icon-fill"
      style={{
        ...wrapperStyle,
        width: size,
        height: size,
        ['--pcp-nav-icon-fill' as string]: 'var(--color-text)',
      }}
    >
      {children}
    </div>
  );
}
