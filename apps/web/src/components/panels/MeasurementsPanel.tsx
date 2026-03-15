import React, { useMemo } from 'react';
import { useBoardStore } from '@/store/boardStore';
import { BoardModel } from '@/core/parametric/BoardModel';

const MeasurementsPanel: React.FC = () => {
  const design = useBoardStore((s) => s.design);

  const measurements = useMemo(() => {
    if (!design) return null;
    try {
      const model = BoardModel.fromDesignData(design);
      const length = design.dimensions.length;

      // Width at 12" (304.8mm) from nose and tail
      const offset12 = 304.8 / length;
      const widthAtTail12 = model.getWidthAt(offset12) * 2;
      const widthAtNose12 = model.getWidthAt(1 - offset12) * 2;

      return {
        noseRocker: model.getRockerAt(1),
        tailRocker: model.getRockerAt(0),
        widthAtTail12,
        widthAtNose12,
        volume: model.getVolumeInLiters(),
      };
    } catch {
      return null;
    }
  }, [design]);

  if (!design) {
    return (
      <div className="p-4 text-[var(--text-secondary)] text-sm">No design loaded</div>
    );
  }

  const { dimensions } = design;

  return (
    <div className="flex flex-col gap-1 p-4">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
        Measurements
      </h3>

      <MeasurementRow label="Length" value={`${dimensions.length.toFixed(0)} mm`} />
      <MeasurementRow label="Width" value={`${dimensions.width.toFixed(0)} mm`} />
      <MeasurementRow label="Thickness" value={`${dimensions.thickness.toFixed(1)} mm`} />

      <div className="my-2 border-t border-[var(--border)]" />

      <MeasurementRow
        label="Nose Rocker"
        value={measurements ? `${measurements.noseRocker.toFixed(1)} mm` : '--'}
      />
      <MeasurementRow
        label="Tail Rocker"
        value={measurements ? `${measurements.tailRocker.toFixed(1)} mm` : '--'}
      />

      <div className="my-2 border-t border-[var(--border)]" />

      <MeasurementRow
        label="Width @ 12&quot; tail"
        value={measurements ? `${measurements.widthAtTail12.toFixed(1)} mm` : '--'}
      />
      <MeasurementRow
        label="Width @ 12&quot; nose"
        value={measurements ? `${measurements.widthAtNose12.toFixed(1)} mm` : '--'}
      />

      <div className="my-2 border-t border-[var(--border)]" />

      <MeasurementRow
        label="Volume"
        value={measurements ? `${measurements.volume.toFixed(1)} L` : 'Calculating...'}
      />
    </div>
  );
};

const MeasurementRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-0.5">
    <span className="text-xs text-[var(--text-secondary)]">{label}</span>
    <span className="text-sm font-mono text-[var(--text-primary)]">{value}</span>
  </div>
);

export default MeasurementsPanel;
