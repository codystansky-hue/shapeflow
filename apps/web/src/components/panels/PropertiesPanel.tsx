import React, { useState } from 'react';
import { useBoardStore } from '@/store/boardStore';
import type { BoardType } from '@shapeflow/shared';

const BOARD_TYPES: BoardType[] = [
  'shortboard', 'longboard', 'fish', 'gun', 'funboard',
  'foil', 'sup', 'windsurf', 'kite', 'other',
];

const PropertiesPanel: React.FC = () => {
  const design = useBoardStore((s) => s.design);
  const boardMeta = useBoardStore((s) => s.boardMeta);
  const setName = useBoardStore((s) => s.setName);
  const setBoardType = useBoardStore((s) => s.setBoardType);
  const updateDimensions = useBoardStore((s) => s.updateDimensions);
  const [units, setUnits] = useState<'mm' | 'inches'>('mm');

  if (!design) {
    return (
      <div className="p-4 text-[var(--text-secondary)] text-sm">No design loaded</div>
    );
  }

  const { dimensions } = design;
  const toDisplay = (mm: number) => (units === 'inches' ? mm / 25.4 : mm);
  const fromDisplay = (val: number) => (units === 'inches' ? val * 25.4 : val);
  const unitLabel = units === 'inches' ? 'in' : 'mm';
  const precision = units === 'inches' ? 2 : 0;

  return (
    <div className="flex flex-col gap-3 p-4">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
        Properties
      </h3>

      {/* Board Name */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Name</span>
        <input
          type="text"
          value={boardMeta?.name ?? ''}
          onChange={(e) => setName(e.target.value)}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        />
      </label>

      {/* Board Type */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Type</span>
        <select
          value={boardMeta?.boardType ?? 'shortboard'}
          onChange={(e) => setBoardType(e.target.value as BoardType)}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          {BOARD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </label>

      {/* Units Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-secondary)]">Units</span>
        <div className="flex rounded-md overflow-hidden border border-[var(--border)]">
          <button
            onClick={() => setUnits('mm')}
            className={`px-3 py-1 text-xs transition-colors ${
              units === 'mm'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface)] text-[var(--text-secondary)]'
            }`}
          >
            mm
          </button>
          <button
            onClick={() => setUnits('inches')}
            className={`px-3 py-1 text-xs transition-colors ${
              units === 'inches'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface)] text-[var(--text-secondary)]'
            }`}
          >
            in
          </button>
        </div>
      </div>

      {/* Dimensions */}
      <div className="flex flex-col gap-2">
        <DimensionInput
          label="Length"
          value={toDisplay(dimensions.length)}
          unit={unitLabel}
          precision={precision}
          onChange={(v) => updateDimensions({ length: fromDisplay(v) })}
        />
        <DimensionInput
          label="Width"
          value={toDisplay(dimensions.width)}
          unit={unitLabel}
          precision={precision}
          onChange={(v) => updateDimensions({ width: fromDisplay(v) })}
        />
        <DimensionInput
          label="Thickness"
          value={toDisplay(dimensions.thickness)}
          unit={units === 'inches' ? 'in' : 'mm'}
          precision={units === 'inches' ? 3 : 1}
          onChange={(v) => updateDimensions({ thickness: fromDisplay(v) })}
        />
      </div>
    </div>
  );
};

const DimensionInput: React.FC<{
  label: string;
  value: number;
  unit: string;
  precision: number;
  onChange: (value: number) => void;
}> = ({ label, value, unit, precision, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const handleFocus = () => {
    setEditing(true);
    setText(value.toFixed(precision));
  };

  const handleBlur = () => {
    setEditing(false);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    }
  };

  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs text-[var(--text-secondary)] w-20">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={editing ? text : value.toFixed(precision)}
          onChange={(e) => setText(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          step={unit === 'in' ? 0.125 : 1}
          min={0}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-sm text-[var(--text-primary)] w-24 text-right focus:outline-none focus:border-[var(--accent)]"
        />
        <span className="text-xs text-[var(--text-secondary)] w-6">{unit}</span>
      </div>
    </label>
  );
};

export default PropertiesPanel;
