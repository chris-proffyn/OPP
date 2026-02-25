/**
 * App-level config (e.g. feature flags). Fetched after auth; used to hide/disable features.
 * voiceEnabled: when false, hide voice UI and treat score input as manual.
 */

import {
  getFeatureFlag,
  FEATURE_FLAG_VOICE_ENABLED,
} from '@opp/data';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useSupabase } from './SupabaseContext';

type AppConfigContextValue = {
  voiceEnabled: boolean;
  loading: boolean;
  refetchVoiceEnabled: () => Promise<void>;
};

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { supabase, user } = useSupabase();
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchVoiceEnabled = useCallback(async () => {
    if (!supabase || !user) {
      setVoiceEnabled(false);
      setLoading(false);
      return;
    }
    try {
      const value = await getFeatureFlag(supabase, FEATURE_FLAG_VOICE_ENABLED);
      setVoiceEnabled(value);
    } catch {
      setVoiceEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    void fetchVoiceEnabled();
  }, [fetchVoiceEnabled]);

  const refetchVoiceEnabled = useCallback(async () => {
    setLoading(true);
    await fetchVoiceEnabled();
  }, [fetchVoiceEnabled]);

  const value: AppConfigContextValue = {
    voiceEnabled,
    loading,
    refetchVoiceEnabled,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext);
  if (!ctx) throw new Error('useAppConfig must be used within AppConfigProvider');
  return ctx;
}
