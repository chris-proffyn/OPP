/**
 * Score input grid: Single/Double/Treble then number (1–20), plus 25, Bull, Miss.
 * Single is selected by default; after entering a score (1..Bull), selection resets to Single.
 */

import { useState } from 'react';
import { SEGMENT_MISS } from '../constants/segments';

const gridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginTop: '0.5rem',
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
};
const titleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '1rem',
  marginBottom: '0.25rem',
};
const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'nowrap',
  gap: '0.5rem',
  alignItems: 'stretch',
  width: '100%',
  minWidth: 0,
};
/* P8 §10.1 — tap targets ≥ 44px; flex to fill row width on mobile */
const buttonStyle: React.CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
  padding: '0.6rem 0.25rem',
  fontSize: '1rem',
  minHeight: 'var(--tap-min, 48px)',
  boxSizing: 'border-box',
};

const MULTIPLIERS = [
  { label: 'Single', value: 'S' as const },
  { label: 'Double', value: 'D' as const },
  { label: 'Treble', value: 'T' as const },
];

/** Number rows: 1–5, 6–10, 11–15, 16–20 */
const NUMBER_ROWS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
];

type SegmentGridProps = {
  onSelect: (segment: string) => void;
  selectedForVisit: string[];
  maxDarts: number;
  disabled?: boolean;
};

export function SegmentGrid({
  onSelect,
  selectedForVisit,
  maxDarts,
  disabled = false,
}: SegmentGridProps) {
  const [selectedMultiplier, setSelectedMultiplier] = useState<'S' | 'D' | 'T'>('S');
  const canSelect = selectedForVisit.length < maxDarts && !disabled;

  const emit = (segment: string) => {
    if (!canSelect) return;
    onSelect(segment);
    setSelectedMultiplier('S');
  };

  const handleNumberClick = (n: number) => {
    if (!canSelect) return;
    if (selectedMultiplier) {
      emit(`${selectedMultiplier}${n}`);
    }
    /* If no multiplier, ignore (BACKLOG: "Player clicks Single button, then clicks 17") */
  };

  return (
    <div style={gridStyle} role="group" aria-label="Score input grid">
      <h3 style={titleStyle}>Score Input</h3>
      <div style={rowStyle}>
        {MULTIPLIERS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            style={{
              ...buttonStyle,
              ...(selectedMultiplier === value ? { outline: '2px solid var(--color-primary, #0369a1)', outlineOffset: 2 } : {}),
            }}
            onClick={() => setSelectedMultiplier(value)}
            disabled={!canSelect}
            aria-pressed={selectedMultiplier === value}
          >
            {label}
          </button>
        ))}
      </div>
      {NUMBER_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} style={rowStyle}>
          {row.map((n) => (
            <button
              key={n}
              type="button"
              style={buttonStyle}
              onClick={() => handleNumberClick(n)}
              disabled={!canSelect}
              aria-label={`${selectedMultiplier}${n}`}
            >
              {n}
            </button>
          ))}
        </div>
      ))}
      <div style={rowStyle}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => emit('25')}
          disabled={!canSelect}
        >
          25
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => emit('Bull')}
          disabled={!canSelect}
        >
          Bull
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => emit(SEGMENT_MISS)}
          disabled={!canSelect}
          aria-label="Miss"
        >
          Miss
        </button>
      </div>
    </div>
  );
}
