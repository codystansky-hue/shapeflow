import React, { useState } from 'react';
import CurveEditor from '../common/CurveEditor';
import { useBoardStore } from '@/store/boardStore';
import { useUndoStore } from '@/store/undoStore';

const CrossSectionEditor: React.FC = () => {
  const design = useBoardStore((s) => s.design);
  const updateCrossSection = useBoardStore((s) => s.updateCrossSection);
  const execute = useUndoStore((s) => s.execute);
  const [activeStation, setActiveStation] = useState(1); // default to 0.5

  if (!design) {
    return <div className="text-[var(--text-secondary)] p-4">No design loaded</div>;
  }

  const { crossSections } = design;

  const sectionIndex = activeStation < crossSections.length ? activeStation : 0;
  const section = crossSections[sectionIndex];

  if (!section) {
    return (
      <div className="text-[var(--text-secondary)] p-4">
        No cross-sections defined in this design
      </div>
    );
  }

  const handleChange = (newPoints: number[][]) => {
    const prevCurve = { ...section.curve };
    const newCurve = { ...section.curve, controlPoints: newPoints };
    execute({
      description: `Update cross-section at ${(section.position * 100).toFixed(0)}%`,
      execute: () => updateCrossSection(sectionIndex, newCurve),
      undo: () => updateCrossSection(sectionIndex, prevCurve),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cross Section Editor</h3>
      </div>

      <div className="flex gap-2">
        {crossSections.map((cs, idx) => (
          <button
            key={idx}
            onClick={() => setActiveStation(idx)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              sectionIndex === idx
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
            }`}
          >
            {(cs.position * 100).toFixed(0)}%
          </button>
        ))}
      </div>

      <p className="text-[10px] text-[var(--text-secondary)]">
        Half cross-section (mirrored). X = width, Y = height, both normalized 0-1.
      </p>

      <CurveEditor
        curve={section.curve}
        onChange={handleChange}
        width={480}
        height={320}
        xLabel="Half-width"
        yLabel="Height"
        xRange={[-0.1, 1.1]}
        yRange={[-0.1, 1.1]}
        symmetric
        color="#0ea5e9"
      />
    </div>
  );
};

export default CrossSectionEditor;
