/**
 * Grid of all dart board segments for scoring input.
 * Player selects one segment per dart; parent collects N selections and submits the visit.
 */

import { SEGMENT_GROUPS } from '../constants/segments';

const gridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginTop: '0.5rem',
};
const groupStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.35rem',
  alignItems: 'center',
};
const groupLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '0.85rem',
  marginRight: '0.5rem',
  minWidth: '4rem',
};
const buttonStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  fontSize: '0.9rem',
  minWidth: '2.5rem',
};

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
  const canSelect = selectedForVisit.length < maxDarts && !disabled;

  return (
    <div style={gridStyle} role="group" aria-label="Select segment hit">
      {SEGMENT_GROUPS.map((group) => (
        <div key={group.label} style={groupStyle}>
          <span style={groupLabelStyle}>{group.label}</span>
          {group.codes.map((code) => (
            <button
              key={code}
              type="button"
              style={buttonStyle}
              onClick={() => canSelect && onSelect(code)}
              disabled={!canSelect}
              aria-pressed={selectedForVisit.includes(code) ? undefined : undefined}
            >
              {code}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
