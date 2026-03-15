import React from 'react';
import CurveEditor from '../common/CurveEditor';
import { useBoardStore } from '@/store/boardStore';
import { useUndoStore } from '@/store/undoStore';

const RockerEditor: React.FC = () => {
  const design = useBoardStore((s) => s.design);
  const updateRocker = useBoardStore((s) => s.updateRocker);
  const updateDeckRocker = useBoardStore((s) => s.updateDeckRocker);
  const execute = useUndoStore((s) => s.execute);

  if (!design) {
    return <div className="text-[var(--text-secondary)] p-4">No design loaded</div>;
  }

  const { rocker, deckRocker, dimensions } = design;

  // Compute nose and tail rocker from curve endpoints
  const rockerPts = rocker.controlPoints;
  const tailRocker = rockerPts.length > 0 ? rockerPts[0][1] : 0;
  const noseRocker = rockerPts.length > 0 ? rockerPts[rockerPts.length - 1][1] : 0;

  // Find max rocker value for Y range
  const allY = rockerPts.map((p) => p[1]);
  const deckY = deckRocker.controlPoints.map((p) => p[1]);
  const maxY = Math.max(...allY, ...deckY, dimensions.thickness) * 1.3;
  const minY = Math.min(...allY, ...deckY, 0) - 5;

  const handleRockerChange = (newPoints: number[][]) => {
    const prevPoints = rocker.controlPoints.map((p) => [...p]);
    execute({
      description: 'Update rocker',
      execute: () => updateRocker(newPoints),
      undo: () => updateRocker(prevPoints),
    });
  };

  const handleDeckRockerChange = (newPoints: number[][]) => {
    const prevPoints = deckRocker.controlPoints.map((p) => [...p]);
    execute({
      description: 'Update deck rocker',
      execute: () => updateDeckRocker(newPoints),
      undo: () => updateDeckRocker(prevPoints),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rocker Editor</h3>
        <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
          <span>Nose: {noseRocker.toFixed(1)}mm</span>
          <span>Tail: {tailRocker.toFixed(1)}mm</span>
        </div>
      </div>
      <div className="text-xs text-[var(--text-secondary)] mb-1">Bottom Rocker</div>
      <CurveEditor
        curve={rocker}
        onChange={handleRockerChange}
        width={480}
        height={240}
        xLabel="Length (mm)"
        yLabel="Rocker (mm)"
        xRange={[0, dimensions.length]}
        yRange={[minY, maxY]}
        color="#0ea5e9"
      />
      <div className="text-xs text-[var(--text-secondary)] mb-1">Deck Rocker</div>
      <CurveEditor
        curve={deckRocker}
        onChange={handleDeckRockerChange}
        width={480}
        height={200}
        xLabel="Length (mm)"
        yLabel="Deck (mm)"
        xRange={[0, dimensions.length]}
        yRange={[minY, maxY]}
        color="#67e8f9"
      />
    </div>
  );
};

export default RockerEditor;
