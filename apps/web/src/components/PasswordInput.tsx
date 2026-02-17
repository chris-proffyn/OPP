/**
 * P1 §4.7 — Password field with show/hide toggle so users can verify what they entered.
 */

import { useState } from 'react';

export interface PasswordInputProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  'aria-label'?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  placeholder,
  'aria-label': ariaLabel,
  style,
  disabled,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'stretch', width: '100%', maxWidth: '24rem' }}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        style={{ flex: 1, ...style }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        style={{
          marginLeft: '0.25rem',
          padding: '0.35rem 0.5rem',
          minWidth: 'var(--tap-min, 44px)',
          minHeight: 'var(--tap-min, 44px)',
          cursor: 'pointer',
          border: `1px solid var(--color-border, #e5e5e5)`,
          borderRadius: 2,
          background: 'var(--color-bg, #fff)',
          color: 'var(--color-text, #1a1a1a)',
          fontSize: '0.9rem',
        }}
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </span>
  );
}
