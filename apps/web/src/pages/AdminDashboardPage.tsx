import { useCallback, useEffect, useState } from 'react';
import {
  getFeatureFlag,
  setFeatureFlag,
  FEATURE_FLAG_VOICE_ENABLED,
} from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { useAppConfig } from '../context/AppConfigContext';

const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };

const voiceButtonBaseStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  fontWeight: 600,
  border: '2px solid var(--color-border, #d1d5db)',
  borderRadius: 6,
  backgroundColor: 'var(--color-bg, #fff)',
  color: 'var(--color-text, #111)',
};
const voiceButtonSelectedStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-primary-bg, #2563eb)',
  color: 'var(--color-primary-text, #fff)',
  borderColor: 'var(--color-primary-bg, #2563eb)',
};

export function AdminDashboardPage() {
  const { supabase } = useSupabase();
  const { refetchVoiceEnabled } = useAppConfig();
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [voiceFlagLoading, setVoiceFlagLoading] = useState(true);
  const [voiceFlagSaving, setVoiceFlagSaving] = useState(false);
  const [voiceFlagError, setVoiceFlagError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    getFeatureFlag(supabase, FEATURE_FLAG_VOICE_ENABLED)
      .then((v) => { if (!cancelled) setVoiceEnabled(v); })
      .catch(() => { if (!cancelled) setVoiceEnabled(false); })
      .finally(() => { if (!cancelled) setVoiceFlagLoading(false); });
    return () => { cancelled = true; };
  }, [supabase]);

  const onVoiceEnabledChange = useCallback(
    async (enabled: boolean) => {
      if (!supabase) return;
      setVoiceFlagError(null);
      setVoiceFlagSaving(true);
      try {
        await setFeatureFlag(supabase, FEATURE_FLAG_VOICE_ENABLED, enabled);
        setVoiceEnabled(enabled);
        await refetchVoiceEnabled();
      } catch (e) {
        setVoiceFlagError(e instanceof Error ? e.message : 'Failed to save');
      } finally {
        setVoiceFlagSaving(false);
      }
    },
    [supabase, refetchVoiceEnabled]
  );

  return (
    <div>
      <h1>Admin dashboard</h1>

      <section style={sectionStyle} aria-label="Feature flags">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Feature flags</h2>
        {voiceFlagLoading ? (
          <p>Loading…</p>
        ) : (
          <>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Voice enabled</strong> — When No, voice input for scores is disabled app-wide: voice buttons are hidden and input is manual.
            </p>
            <div role="group" aria-label="Voice enabled" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void onVoiceEnabledChange(true)}
                disabled={voiceFlagSaving}
                aria-pressed={voiceEnabled}
                style={{
                  ...voiceButtonBaseStyle,
                  cursor: voiceFlagSaving ? 'not-allowed' : 'pointer',
                  ...(voiceEnabled ? voiceButtonSelectedStyle : {}),
                }}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => void onVoiceEnabledChange(false)}
                disabled={voiceFlagSaving}
                aria-pressed={!voiceEnabled}
                style={{
                  ...voiceButtonBaseStyle,
                  cursor: voiceFlagSaving ? 'not-allowed' : 'pointer',
                  ...(!voiceEnabled ? voiceButtonSelectedStyle : {}),
                }}
              >
                No
              </button>
              {voiceFlagSaving && <span style={{ fontSize: '0.9rem', color: 'var(--color-muted, #666)' }}>Saving…</span>}
            </div>
            {voiceFlagError && (
              <p role="alert" style={{ marginTop: '0.5rem', color: 'var(--color-error, #b91c1c)', fontSize: '0.9rem' }}>
                {voiceFlagError}
              </p>
            )}
          </>
        )}
      </section>

      <p>Admin dashboard – more sections in later phases.</p>
    </div>
  );
}
