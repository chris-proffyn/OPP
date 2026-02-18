/**
 * Admin edit level average. Route: /admin/level-averages/:id.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  isDataError,
  getLevelAverageById,
  updateLevelAverage,
} from '@opp/data';
import type { LevelAverage } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const blockStyle: React.CSSProperties = { marginBottom: '0.75rem' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.25rem' };
const inputStyle: React.CSSProperties = { padding: '0.35rem', minWidth: '10rem' };

export function AdminLevelAverageEditPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<LevelAverage | null>(null);
  const [levelMin, setLevelMin] = useState(0);
  const [levelMax, setLevelMax] = useState(9);
  const [description, setDescription] = useState('');
  const [threeDartAvg, setThreeDartAvg] = useState(0);
  const [singleAccPct, setSingleAccPct] = useState<string>('');
  const [doubleAccPct, setDoubleAccPct] = useState<string>('');
  const [trebleAccPct, setTrebleAccPct] = useState<string>('');
  const [bullAccPct, setBullAccPct] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toNum = (s: string): number | null => (s.trim() === '' ? null : parseFloat(s));

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getLevelAverageById(supabase, id)
      .then((found) => {
        setRow(found ?? null);
        if (found) {
          setLevelMin(found.level_min);
          setLevelMax(found.level_max);
          setDescription(found.description);
          setThreeDartAvg(found.three_dart_avg);
          setSingleAccPct(found.single_acc_pct != null ? String(found.single_acc_pct) : '');
          setDoubleAccPct(found.double_acc_pct != null ? String(found.double_acc_pct) : '');
          setTrebleAccPct(found.treble_acc_pct != null ? String(found.treble_acc_pct) : '');
          setBullAccPct(found.bull_acc_pct != null ? String(found.bull_acc_pct) : '');
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSubmitting(true);
    try {
      await updateLevelAverage(supabase, id, {
        level_min: levelMin,
        level_max: levelMax,
        description: description.trim(),
        three_dart_avg: threeDartAvg,
        single_acc_pct: toNum(singleAccPct),
        double_acc_pct: toNum(doubleAccPct),
        treble_acc_pct: toNum(trebleAccPct),
        bull_acc_pct: toNum(bullAccPct),
      });
      load();
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!id) return <p>Missing id.</p>;
  if (!row) {
    return (
      <>
        <p><Link to="/admin/level-averages">← Back to level averages</Link></p>
        <p role="alert">{error || 'Level average not found.'}</p>
      </>
    );
  }

  return (
    <div>
      <p>
        <Link to="/admin/level-averages">← Back to level averages</Link>
      </p>
      <h1>Edit level average</h1>
      <p style={{ marginBottom: '0.75rem', color: '#666', fontSize: '0.9rem' }}>
        Level bands 0–99; level_max must be ≥ level_min.
      </p>
      <form onSubmit={handleSubmit} style={{ maxWidth: '20rem' }}>
        <div style={blockStyle}>
          <label htmlFor="la-level-min" style={labelStyle}>level_min</label>
          <input
            id="la-level-min"
            type="number"
            min={0}
            max={99}
            value={levelMin}
            onChange={(e) => setLevelMin(parseInt(e.target.value, 10) || 0)}
            required
            disabled={submitting}
            style={{ width: '5rem', padding: '0.35rem' }}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="la-level-max" style={labelStyle}>level_max</label>
          <input
            id="la-level-max"
            type="number"
            min={0}
            max={99}
            value={levelMax}
            onChange={(e) => setLevelMax(parseInt(e.target.value, 10) || 0)}
            required
            disabled={submitting}
            style={{ width: '5rem', padding: '0.35rem' }}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="la-description" style={labelStyle}>description</label>
          <input
            id="la-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={submitting}
            style={inputStyle}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="la-three-dart-avg" style={labelStyle}>three_dart_avg</label>
          <input
            id="la-three-dart-avg"
            type="number"
            min={0}
            step={0.01}
            value={threeDartAvg}
            onChange={(e) => setThreeDartAvg(parseFloat(e.target.value) || 0)}
            required
            disabled={submitting}
            style={{ width: '6rem', padding: '0.35rem' }}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="la-single-acc" style={labelStyle}>single_acc_pct (optional)</label>
          <input
            id="la-single-acc"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={singleAccPct}
            onChange={(e) => setSingleAccPct(e.target.value)}
            disabled={submitting}
            style={{ width: '6rem', padding: '0.35rem' }}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="la-double-acc" style={labelStyle}>double_acc_pct (optional)</label>
          <input
            id="la-double-acc"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={doubleAccPct}
            onChange={(e) => setDoubleAccPct(e.target.value)}
            disabled={submitting}
            style={{ width: '6rem', padding: '0.35rem' }}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="la-treble-acc" style={labelStyle}>treble_acc_pct (optional)</label>
          <input
            id="la-treble-acc"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={trebleAccPct}
            onChange={(e) => setTrebleAccPct(e.target.value)}
            disabled={submitting}
            style={{ width: '6rem', padding: '0.35rem' }}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="la-bull-acc" style={labelStyle}>bull_acc_pct (optional)</label>
          <input
            id="la-bull-acc"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={bullAccPct}
            onChange={(e) => setBullAccPct(e.target.value)}
            disabled={submitting}
            style={{ width: '6rem', padding: '0.35rem' }}
          />
        </div>
        {error && <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
