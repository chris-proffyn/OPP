/**
 * Catches React render errors and shows a fallback UI instead of a blank screen.
 * Use around router or layout content to handle DOM/reconciliation errors (e.g. removeChild).
 * Suppresses console noise from browser extensions (e.g. React DevTools installHook).
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error?: Error };

/** Only suppress errors that clearly originate from browser extensions (e.g. React DevTools). */
function isLikelyExtensionError(error: Error): boolean {
  const stack = error?.stack ?? '';
  // Never suppress if the stack references our app (localhost, src, chunks, or source files).
  const hasAppInStack =
    /localhost:\d+/.test(stack) ||
    /\/src\//.test(stack) ||
    /\/assets\/|chunk-[A-Za-z0-9]+\.js/i.test(stack) ||
    /\.(tsx?|jsx?)(:\d+)?/.test(stack);
  if (hasAppInStack) return false;
  // Only suppress when the stack is clearly from an extension (not just installHook, which appears in app errors).
  return /chrome-extension:|moz-extension:/i.test(stack);
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    if (isLikelyExtensionError(error)) return { hasError: false };
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isLikelyExtensionError(error)) return;
    console.error('[OPP ErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: '1.5rem', fontFamily: 'system-ui', maxWidth: 480 }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ color: 'var(--color-muted, #666)', marginBottom: '1rem' }}>
            The app hit an error. Try refreshing the page.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              minHeight: 'var(--tap-min, 44px)',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
