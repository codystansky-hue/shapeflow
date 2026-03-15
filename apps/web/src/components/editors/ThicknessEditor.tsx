import React from 'react';
import CurveEditor from '../common/CurveEditor';
import { useBoardStore } from '@/store/boardStore';
import { useUndoStore } from '@/store/undoStore';

const ThicknessEditor: React.FC = () => {
  const design = useBoardStore((s) => s.design);
  const updateThickness = useBoardStore((s) => s.updateThickness);
  const execute = useUndoStore((s) => s.execute);

  if (!design) {
    return <div className="text-[var(--text-secondary)] p-4">No design loaded</div>;
  }

  const { thickness, dimensions } = design;

  const handleChange = (newPoints: number[][]) => {
    const prevPoints = thickness.controlPoints.map((p) => [...p]);
    execute({
      description: 'Update thickness',
      execute: () => updateThickness(newPoints),
      undo: () => updateThickness(prevPoints),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Thickness Editor</h3>
        <span className="text-xs text-[var(--text-secondary)]">
          Max: {dimensions.thickness.toFixed(1)}mm
        </span>
      </div>
      <CurveEditor
        curve={thickness}
        onChange={handleChange}
        width={480}
        height={280}
        xLabel="Length (mm)"
        yLabel="Thickness (mm)"
        xRange={[0, dimensions.length]}
        yRange={[0, dimensions.thickness * 1.3]}
        color="#0ea5e9"
      />
    </div>
  );
};

export default ThicknessEditor;
