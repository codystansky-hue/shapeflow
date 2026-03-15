import React from 'react';
import { useBoardStore } from '@/store/boardStore';

const MeasurementsPanel: React.FC = () => {
  const design = useBoardStore((s) => s.design);

  if (!design) {
    return (
      <div className="p-4 text-[var(--text-secondary)] text-sm">No design loaded</div>
    );
  }

  const { dimensions, rocker, computedVolume } = design;
  const rockerPts = rocker.controlPoints;

  // Compute nose and tail rocker from endpoints
  const tailRocker = rockerPts.length > 0 ? rockerPts[0][1] : 0;
  const noseRocker = rockerPts.length > 0 ? rockerPts[rockerPts.length - 1][1] : 0;

  // Width at 12" (304.8mm) from nose and tail - simplified interpolation
  const outlinePts = design.outline.controlPoints;
  const widthAtOffset = (offset: number): string => {
    // Find the outline point closest to the offset from each end
    const targetFromTail = offset;
    const targetFromNose = dimensions.length - offset;
    let wTail = 0;
    let wNose = 0;
    for (const p of outlinePts) {
      if (Math.abs(p[0] - targetFromTail) < Math.abs(wTail - targetFromTail)) {
        wTail = p[1];
      }
    }
    for (const p of outlinePts) {
      if (Math.abs(p[0] - targetFromNose) < Math.abs(wNose - targetFromNose)) {
        wNose = p[1];
      }
    }
    return `${(wTail * 2).toFixed(1)} / ${(wNose * 2).toFixed(1)}`;
  };

  const volume = computedVolume ?? 0;

  return (
    <div className="flex flex-col gap-1 p-4">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
        Measurements
      </h3>

      <MeasurementRow label="Length" value={`${dimensions.length.toFixed(0)} mm`} />
      <MeasurementRow label="Width" value={`${dimensions.width.toFixed(0)} mm`} />
      <MeasurementRow label="Thickness" value={`${dimensions.thickness.toFixed(1)} mm`} />

      <div className="my-2 border-t border-[var(--border)]" />

      <MeasurementRow label="Nose Rocker" value={`${noseRocker.toFixed(1)} mm`} />
      <MeasurementRow label="Tail Rocker" value={`${tailRocker.toFixed(1)} mm`} />

      <div className="my-2 border-t border-[var(--border)]" />

      <MeasurementRow label="Width @ 12&quot;" value={widthAtOffset(304.8) + ' mm'} />

      <div className="my-2 border-t border-[var(--border)]" />

      <MeasurementRow
        label="Volume"
        value={volume > 0 ? `${volume.toFixed(1)} L` : 'Calculating...'}
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
