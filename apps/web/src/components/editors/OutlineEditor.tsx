import React from 'react';
import CurveEditor from '../common/CurveEditor';
import { useBoardStore } from '@/store/boardStore';
import { useUndoStore } from '@/store/undoStore';

const OutlineEditor: React.FC = () => {
  const design = useBoardStore((s) => s.design);
  const updateOutline = useBoardStore((s) => s.updateOutline);
  const execute = useUndoStore((s) => s.execute);

  if (!design) {
    return <div className="text-[var(--text-secondary)] p-4">No design loaded</div>;
  }

  const { outline, dimensions } = design;

  const handleChange = (newPoints: number[][]) => {
    const prevPoints = outline.controlPoints.map((p) => [...p]);
    execute({
      description: 'Update outline',
      execute: () => updateOutline(newPoints),
      undo: () => updateOutline(prevPoints),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Outline Editor</h3>
        <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
          <span>Length: {dimensions.length.toFixed(0)}mm</span>
          <span>Width: {dimensions.width.toFixed(0)}mm</span>
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-secondary)]">
        Drag control points to shape the board outline. Curve is mirrored for symmetry.
      </p>
      <CurveEditor
        curve={outline}
        onChange={handleChange}
        width={480}
        height={320}
        xLabel="Position (tail → nose)"
        yLabel="Half-width"
        xRange={[0, 1]}
        yRange={[-0.2, 1.2]}
        symmetric
        color="#0ea5e9"
      />
    </div>
  );
};

export default OutlineEditor;
