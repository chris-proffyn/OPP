/**
 * Supabase client and auth/player state. Client created once from env.
 * Exposes: supabase, user, authLoading, authError, player, playerLoading, signOut, refetchPlayer.
 */

import {
  createSupabaseClient,
  getCurrentPlayer,
  type Player,
} from '@opp/data';
import type { User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type SupabaseContextValue = {
  supabase: ReturnType<typeof createSupabaseClient>;
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  player: Player | null;
  playerLoading: boolean;
  signOut: () => Promise<void>;
  refetchPlayer: () => Promise<void>;
};

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

/** Single Supabase client instance to avoid "Multiple GoTrueClient instances" warning. */
let sharedClient: ReturnType<typeof createSupabaseClient> | null = null;

function getSharedClient(url: string, anonKey: string) {
  if (!sharedClient) {
    sharedClient = createSupabaseClient({ url, anonKey });
  }
  return sharedClient;
}

function ConfigMissing() {
  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'system-ui',
        maxWidth: '28rem',
        margin: '2rem auto',
      }}
    >
      <h1>Configuration needed</h1>
      <p>
        Supabase is not configured. In your <code>.env</code> file (see <code>.env.example</code> for the list), set:
      </p>
      <ul>
        <li><code>VITE_SUPABASE_URL</code> — your Supabase project URL</li>
        <li><code>VITE_SUPABASE_ANON_KEY</code> — anon public key (Supabase Dashboard → Project Settings → API)</li>
      </ul>
      <p>Then restart the dev server (<code>npm run dev</code>).</p>
    </div>
  );
}

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return <ConfigMissing />;
  }

  const client = useMemo(
    () => getSharedClient(url, anonKey),
    [url, anonKey]
  );

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);

  const fetchPlayer = useCallback(async () => {
    const { data: { user: u } } = await client.auth.getUser();
    if (!u) {
      setPlayer(null);
      return;
    }
    setPlayerLoading(true);
    try {
      const p = await getCurrentPlayer(client);
      setPlayer(p);
    } finally {
      setPlayerLoading(false);
    }
  }, [client]);

  useEffect(() => {
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthError(null);
      setAuthLoading(false);
      if (session?.user) {
        void fetchPlayer();
      } else {
        setPlayer(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchPlayer]);

  const signOut = useCallback(async () => {
    setAuthLoading(true);
    await client.auth.signOut();
    setPlayer(null);
    setAuthLoading(false);
  }, []);

  const refetchPlayer = useCallback(async () => {
    await fetchPlayer();
  }, [fetchPlayer]);

  const value = useMemo<SupabaseContextValue>(
    () => ({
      supabase: client,
      user,
      authLoading,
      authError,
      player,
      playerLoading,
      signOut,
      refetchPlayer,
    }),
    [user, authLoading, authError, player, playerLoading, signOut, refetchPlayer]
  );

  return (
    <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
  );
}

export function useSupabase(): SupabaseContextValue {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error('useSupabase must be used within SupabaseProvider');
  return ctx;
}
