/**
 * Player checkout preferences: CRUD for own variations. Matches checkout combinations table + player column.
 * Route: /profile/checkout-variations. Empty by default; add only player-specific variations.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createPlayerCheckoutVariation,
  deletePlayerCheckoutVariation,
  isDataError,
  listPlayerCheckoutVariations,
  updatePlayerCheckoutVariation,
} from '@opp/data';
import type { PlayerCheckoutVariation } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: '36rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '0.35rem 0.5rem',
  textAlign: 'left',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: '3.5rem',
  padding: '0.25rem 0.35rem',
  boxSizing: 'border-box',
};
const linkStyle: React.CSSProperties = { color: 'inherit', fontWeight: 500 };

const TOTAL_MIN = 2;
const TOTAL_MAX = 170;

export function ProfileCheckoutVariationsPage() {
  const { supabase, player } = useSupabase();
  const [rows, setRows] = useState<PlayerCheckoutVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rowEdits, setRowEdits] = useState<Record<string, { dart1: string; dart2: string; dart3: string }>>({});
  // Add form state
  const [addTotal, setAddTotal] = useState<string>(() => String(TOTAL_MAX));
  const [addDart1, setAddDart1] = useState('');
  const [addDart2, setAddDart2] = useState('');
  const [addDart3, setAddDart3] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listPlayerCheckoutVariations(supabase)
      .then((list) => {
        setRows(list);
        setRowEdits((prev) => {
          const next = { ...prev };
          list.forEach((r) => {
            const key = r.id;
            if (!(key in next)) {
              next[key] = {
                dart1: r.dart1 ?? '',
                dart2: r.dart2 ?? '',
                dart3: r.dart3 ?? '',
              };
            }
          });
          return next;
        });
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load your checkout variations.');
      })
      .finally(() => setLoading(false));
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const setEdit = (id: string, field: 'dart1' | 'dart2' | 'dart3', value: string) => {
    setRowEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { dart1: '', dart2: '', dart3: '' }),
        [field]: value,
      },
    }));
  };

  const handleSave = async (row: PlayerCheckoutVariation) => {
    const edits = rowEdits[row.id];
    if (!edits) return;
    const dart1 = edits.dart1.trim() || null;
    const dart2 = edits.dart2.trim() || null;
    const dart3 = edits.dart3.trim() || null;
    if (
      dart1 === (row.dart1 ?? '') &&
      dart2 === (row.dart2 ?? '') &&
      dart3 === (row.dart3 ?? '')
    ) {
      return;
    }
    setSavingId(row.id);
    setError(null);
    try {
      const updated = await updatePlayerCheckoutVariation(supabase, row.id, {
        dart1: dart1 || null,
        dart2: dart2 || null,
        dart3: dart3 || null,
      });
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      setRowEdits((prev) => ({
        ...prev,
        [row.id]: {
          dart1: updated.dart1 ?? '',
          dart2: updated.dart2 ?? '',
          dart3: updated.dart3 ?? '',
        },
      }));
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to save.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (row: PlayerCheckoutVariation) => {
    if (!confirm(`Remove your variation for total ${row.total}?`)) return;
    setDeletingId(row.id);
    setError(null);
    try {
      await deletePlayerCheckoutVariation(supabase, row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setRowEdits((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalNum = parseInt(addTotal, 10);
    if (totalNum < TOTAL_MIN || totalNum > TOTAL_MAX || !Number.isInteger(totalNum)) {
      setError(`Total must be between ${TOTAL_MIN} and ${TOTAL_MAX}.`);
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const created = await createPlayerCheckoutVariation(supabase, {
        total: totalNum,
        dart1: addDart1.trim() || null,
        dart2: addDart2.trim() || null,
        dart3: addDart3.trim() || null,
      });
      setRows((prev) => [created, ...prev].sort((a, b) => b.total - a.total));
      setRowEdits((prev) => ({
        ...prev,
        [created.id]: {
          dart1: created.dart1 ?? '',
          dart2: created.dart2 ?? '',
          dart3: created.dart3 ?? '',
        },
      }));
      setAddDart1('');
      setAddDart2('');
      setAddDart3('');
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to add variation.');
    } finally {
      setAdding(false);
    }
  };

  if (!player) return null;

  if (loading) return <p>Loading your checkout variations…</p>;

  return (
    <div>
      <p>
        <Link to="/profile" style={linkStyle}>← Profile</Link>
      </p>
      <h1>Checkout preferences</h1>
      <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
        Add your own checkout variations for specific totals (2–170). These are in addition to the default combinations. Use notation like T20, D20, Bull. Leave a dart blank for no dart.
      </p>

      <section style={{ marginBottom: '1.5rem' }} aria-label="Add variation">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Add variation</h2>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end', maxWidth: '36rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem' }}>Total</span>
            <input
              type="number"
              min={TOTAL_MIN}
              max={TOTAL_MAX}
              value={addTotal}
              onChange={(e) => setAddTotal(e.target.value)}
              disabled={adding}
              style={{ width: '4rem', padding: '0.35rem' }}
              aria-label="Total"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem' }}>Dart 1</span>
            <input
              type="text"
              value={addDart1}
              onChange={(e) => setAddDart1(e.target.value)}
              disabled={adding}
              style={{ width: '4rem', padding: '0.35rem' }}
              aria-label="Dart 1"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem' }}>Dart 2</span>
            <input
              type="text"
              value={addDart2}
              onChange={(e) => setAddDart2(e.target.value)}
              disabled={adding}
              style={{ width: '4rem', padding: '0.35rem' }}
              aria-label="Dart 2"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem' }}>Dart 3</span>
            <input
              type="text"
              value={addDart3}
              onChange={(e) => setAddDart3(e.target.value)}
              disabled={adding}
              style={{ width: '4rem', padding: '0.35rem' }}
              aria-label="Dart 3"
            />
          </label>
          <button type="submit" disabled={adding} style={{ minHeight: 'var(--tap-min, 44px)' }}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
      </section>

      {error && <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>Player</th>
            <th style={thTdStyle}>Total</th>
            <th style={thTdStyle}>Dart 1</th>
            <th style={thTdStyle}>Dart 2</th>
            <th style={thTdStyle}>Dart 3</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} style={thTdStyle}>
                No variations yet. Add one above to override or add a checkout for a specific total.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const edits = rowEdits[row.id] ?? { dart1: row.dart1 ?? '', dart2: row.dart2 ?? '', dart3: row.dart3 ?? '' };
              const isSaving = savingId === row.id;
              const isDeleting = deletingId === row.id;
              return (
                <tr key={row.id}>
                  <td style={thTdStyle}>{player.nickname}</td>
                  <td style={thTdStyle}>{row.total}</td>
                  <td style={thTdStyle}>
                    <input
                      type="text"
                      value={edits.dart1}
                      onChange={(e) => setEdit(row.id, 'dart1', e.target.value)}
                      disabled={isSaving || isDeleting}
                      style={inputStyle}
                      aria-label={`Dart 1 for total ${row.total}`}
                    />
                  </td>
                  <td style={thTdStyle}>
                    <input
                      type="text"
                      value={edits.dart2}
                      onChange={(e) => setEdit(row.id, 'dart2', e.target.value)}
                      disabled={isSaving || isDeleting}
                      style={inputStyle}
                      aria-label={`Dart 2 for total ${row.total}`}
                    />
                  </td>
                  <td style={thTdStyle}>
                    <input
                      type="text"
                      value={edits.dart3}
                      onChange={(e) => setEdit(row.id, 'dart3', e.target.value)}
                      disabled={isSaving || isDeleting}
                      style={inputStyle}
                      aria-label={`Dart 3 for total ${row.total}`}
                    />
                  </td>
                  <td style={thTdStyle}>
                    <button
                      type="button"
                      onClick={() => handleSave(row)}
                      disabled={isSaving || isDeleting}
                      style={{ marginRight: '0.5rem', minHeight: 'var(--tap-min, 44px)' }}
                    >
                      {isSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      disabled={isSaving || isDeleting}
                      style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', textDecoration: 'underline', minHeight: 'var(--tap-min, 44px)' }}
                    >
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
