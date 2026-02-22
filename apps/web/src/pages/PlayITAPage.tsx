/**
 * Route: /play/ita.
 * Gets or creates the player's ITA calendar entry (global ITA outside cohort schedule) and redirects to the ITA session game.
 * If the player has already completed ITA, redirects to /play.
 * Per OPP_ITA_UPDATE_IMPLEMENTATION_CHECKLIST §3 (ITA session availability).
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getOrCreateITACalendarEntryForPlayer, isDataError } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { hasCompletedITA, PLAY_MUST_COMPLETE_ITA_MESSAGE } from '../utils/ita';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function PlayITAPage() {
  const { supabase, player } = useSupabase();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectMessage = (location.state as { message?: string } | null)?.message ?? PLAY_MUST_COMPLETE_ITA_MESSAGE;
  const [status, setStatus] = useState<'loading' | 'redirect' | 'no-ita' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!player) return;
    if (hasCompletedITA(player)) {
      navigate('/play', { replace: true });
      setStatus('redirect');
      return;
    }
    setStatus('loading');
    setErrorMessage(null);
    getOrCreateITACalendarEntryForPlayer(supabase, player.id)
      .then((itaEntry) => {
        if (itaEntry) {
          navigate(`/play/session/${itaEntry.calendar_id}`, { replace: true });
          setStatus('redirect');
        } else {
          setStatus('no-ita');
        }
      })
      .catch((err) => {
        setErrorMessage(isDataError(err) ? err.message : 'Sessions could not be loaded. Try again.');
        setStatus('error');
      });
  }, [supabase, player, navigate]);

  if (!player) return null;
  if (status === 'redirect') return <LoadingSpinner message="Taking you to ITA…" />;

  if (status === 'loading') {
    return (
      <>
        <h1>Initial Training Assessment</h1>
        {redirectMessage && <p style={{ color: 'var(--color-muted, #525252)', marginBottom: '1rem' }}>{redirectMessage}</p>}
        <LoadingSpinner message="Loading…" />
      </>
    );
  }

  if (status === 'no-ita') {
    return (
      <>
        <h1>Initial Training Assessment</h1>
        {redirectMessage && <p style={{ color: 'var(--color-muted, #525252)', marginBottom: '1rem' }}>{redirectMessage}</p>}
        <p>
          Something went wrong. Try again from the dashboard.
        </p>
        <p>
          <Link to="/home" style={{ fontWeight: 500 }}>Dashboard</Link>
          {' · '}
          <Link to="/play" style={{ fontWeight: 500 }}>Play</Link>
          {' · '}
          <Link to="/profile" style={{ fontWeight: 500 }}>Profile</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Initial Training Assessment</h1>
      {redirectMessage && <p style={{ color: 'var(--color-muted, #525252)', marginBottom: '1rem' }}>{redirectMessage}</p>}
      <p>{errorMessage ?? 'Something went wrong. Try again from the dashboard.'}</p>
      <p>
        <Link to="/home" style={{ fontWeight: 500 }}>Dashboard</Link>
        {' · '}
        <Link to="/play" style={{ fontWeight: 500 }}>Play</Link>
        {' · '}
        <Link to="/profile" style={{ fontWeight: 500 }}>Profile</Link>
      </p>
    </>
  );
}
