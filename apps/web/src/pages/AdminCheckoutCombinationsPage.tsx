/**
 * Admin checkout combinations: list and edit dart1, dart2, dart3 per total (2–170).
 * Route: /admin/checkout-combinations.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  isDataError,
  listCheckoutCombinations,
  updateCheckoutCombination,
} from '@opp/data';
import type { CheckoutCombination } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: '32rem',
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

export function AdminCheckoutCombinationsPage() {
  const { supabase } = useSupabase();
  const [rows, setRows] = useState<CheckoutCombination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowEdits, setRowEdits] = useState<Record<string, { dart1: string; dart2: string; dart3: string }>>({});

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listCheckoutCombinations(supabase)
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
        setError(isDataError(err) ? err.message : 'Failed to load checkout combinations.');
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

  const handleSave = async (row: CheckoutCombination) => {
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
      const updated = await updateCheckoutCombination(supabase, row.id, {
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

  if (loading) return <p>Loading checkout combinations…</p>;
  if (error) return <p role="alert" style={{ color: '#c00' }}>{error}</p>;

  return (
    <div>
      <h1>Checkout combinations</h1>
      <p style={{ marginBottom: '0.75rem', color: '#666', fontSize: '0.9rem' }}>
        Recommended checkout (dart1, dart2, dart3) for each total 2–170. Edit and save per row. Use T20, D20, Bull, 25, etc. Leave blank for no dart.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>Total</th>
            <th style={thTdStyle}>Dart 1</th>
            <th style={thTdStyle}>Dart 2</th>
            <th style={thTdStyle}>Dart 3</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const edits = rowEdits[row.id] ?? { dart1: row.dart1 ?? '', dart2: row.dart2 ?? '', dart3: row.dart3 ?? '' };
            const isSaving = savingId === row.id;
            return (
              <tr key={row.id}>
                <td style={thTdStyle}>{row.total}</td>
                <td style={thTdStyle}>
                  <input
                    type="text"
                    value={edits.dart1}
                    onChange={(e) => setEdit(row.id, 'dart1', e.target.value)}
                    disabled={isSaving}
                    style={inputStyle}
                    aria-label={`Dart 1 for total ${row.total}`}
                  />
                </td>
                <td style={thTdStyle}>
                  <input
                    type="text"
                    value={edits.dart2}
                    onChange={(e) => setEdit(row.id, 'dart2', e.target.value)}
                    disabled={isSaving}
                    style={inputStyle}
                    aria-label={`Dart 2 for total ${row.total}`}
                  />
                </td>
                <td style={thTdStyle}>
                  <input
                    type="text"
                    value={edits.dart3}
                    onChange={(e) => setEdit(row.id, 'dart3', e.target.value)}
                    disabled={isSaving}
                    style={inputStyle}
                    aria-label={`Dart 3 for total ${row.total}`}
                  />
                </td>
                <td style={thTdStyle}>
                  <button
                    type="button"
                    onClick={() => handleSave(row)}
                    disabled={isSaving}
                    style={{ minHeight: 'var(--tap-min, 44px)' }}
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
