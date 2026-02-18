/**
 * Admin new level average. Route: /admin/level-averages/new.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createLevelAverage, isDataError } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const blockStyle: React.CSSProperties = { marginBottom: '0.75rem' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.25rem' };
const inputStyle: React.CSSProperties = { padding: '0.35rem', minWidth: '10rem' };

export function AdminLevelAverageNewPage() {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [levelMin, setLevelMin] = useState(0);
  const [levelMax, setLevelMax] = useState(9);
  const [description, setDescription] = useState('');
  const [threeDartAvg, setThreeDartAvg] = useState(25);
  const [singleAccPct, setSingleAccPct] = useState<string>('');
  const [doubleAccPct, setDoubleAccPct] = useState<string>('');
  const [trebleAccPct, setTrebleAccPct] = useState<string>('');
  const [bullAccPct, setBullAccPct] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toNum = (s: string): number | null => (s.trim() === '' ? null : parseFloat(s));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const row = await createLevelAverage(supabase, {
        level_min: levelMin,
        level_max: levelMax,
        description: description.trim(),
        three_dart_avg: threeDartAvg,
        single_acc_pct: toNum(singleAccPct),
        double_acc_pct: toNum(doubleAccPct),
        treble_acc_pct: toNum(trebleAccPct),
        bull_acc_pct: toNum(bullAccPct),
      });
      navigate(`/admin/level-averages/${row.id}`);
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to create level average.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>New level average</h1>
      <p style={{ marginBottom: '0.75rem', color: '#666', fontSize: '0.9rem' }}>
        Level bands 0–99; level_max must be ≥ level_min. Accuracy % fields are optional.
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
          {submitting ? 'Creating…' : 'Create'}
        </button>
        {' '}
        <Link to="/admin/level-averages">Cancel</Link>
      </form>
    </div>
  );
}
