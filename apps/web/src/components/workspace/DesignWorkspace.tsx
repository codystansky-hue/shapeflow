/**
 * DesignWorkspace - Shape3D-inspired multi-view design layout
 *
 * Shows all curve editors simultaneously:
 *   Top area:    Outline editor (plan view) with symmetric half-width curve
 *   Bottom-left: Rocker + Thickness (side/profile view)
 *   Bottom-right: Cross-section at the guideline position
 *
 * A red interactive guideline syncs across views, and the right panel shows
 * measurements at that position.
 */
import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import CurveEditor from '@/components/common/CurveEditor';
import { useBoardStore } from '@/store/boardStore';
import { useUIStore } from '@/store/uiStore';
import { useUndoStore } from '@/store/undoStore';
import { BoardModel } from '@/core/parametric/BoardModel';

const DesignWorkspace: React.FC = () => {
  const design = useBoardStore((s) => s.design);
  const updateOutline = useBoardStore((s) => s.updateOutline);
  const updateRocker = useBoardStore((s) => s.updateRocker);
  const updateDeckRocker = useBoardStore((s) => s.updateDeckRocker);
  const updateThickness = useBoardStore((s) => s.updateThickness);
  const updateCrossSection = useBoardStore((s) => s.updateCrossSection);
  const execute = useUndoStore((s) => s.execute);
  const guidelinePosition = useUIStore((s) => s.guidelinePosition);

  if (!design) {
    return <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">No design loaded</div>;
  }

  const { outline, rocker, deckRocker, thickness, crossSections, dimensions } = design;

  // Rocker y-range
  const rockerPts = rocker.controlPoints;
  const deckPts = deckRocker.controlPoints;
  const allRockerY = [...rockerPts.map(p => p[1]), ...deckPts.map(p => p[1])];
  const minRY = Math.min(...allRockerY, 0) - 5;
  const maxRY = Math.max(...allRockerY) * 1.2;

  // Find active cross-section near guideline
  const activeSectionIdx = useMemo(() => {
    if (crossSections.length === 0) return 0;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < crossSections.length; i++) {
      const dist = Math.abs(crossSections[i].position - guidelinePosition);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    return closest;
  }, [crossSections, guidelinePosition]);

  const activeSection = crossSections[activeSectionIdx];

  // Handlers with undo
  const handleOutlineChange = useCallback((newPoints: number[][]) => {
    const prev = outline.controlPoints.map(p => [...p]);
    execute({ description: 'Update outline', execute: () => updateOutline(newPoints), undo: () => updateOutline(prev) });
  }, [outline.controlPoints, execute, updateOutline]);

  const handleRockerChange = useCallback((newPoints: number[][]) => {
    const prev = rocker.controlPoints.map(p => [...p]);
    execute({ description: 'Update rocker', execute: () => updateRocker(newPoints), undo: () => updateRocker(prev) });
  }, [rocker.controlPoints, execute, updateRocker]);

  const handleDeckRockerChange = useCallback((newPoints: number[][]) => {
    const prev = deckRocker.controlPoints.map(p => [...p]);
    execute({ description: 'Update deck rocker', execute: () => updateDeckRocker(newPoints), undo: () => updateDeckRocker(prev) });
  }, [deckRocker.controlPoints, execute, updateDeckRocker]);

  const handleThicknessChange = useCallback((newPoints: number[][]) => {
    const prev = thickness.controlPoints.map(p => [...p]);
    execute({ description: 'Update thickness', execute: () => updateThickness(newPoints), undo: () => updateThickness(prev) });
  }, [thickness.controlPoints, execute, updateThickness]);

  const handleCrossSectionChange = useCallback((newPoints: number[][]) => {
    if (!activeSection) return;
    const prevCurve = { ...activeSection.curve };
    const newCurve = { ...activeSection.curve, controlPoints: newPoints };
    execute({
      description: `Update cross-section at ${(activeSection.position * 100).toFixed(0)}%`,
      execute: () => updateCrossSection(activeSectionIdx, newCurve),
      undo: () => updateCrossSection(activeSectionIdx, prevCurve),
    });
  }, [activeSection, activeSectionIdx, execute, updateCrossSection]);

  // Guideline measurements
  const guidelineMeasurements = useMemo(() => {
    if (!design) return null;
    try {
      const model = BoardModel.fromDesignData(design);
      const t = guidelinePosition;
      return {
        width: model.getWidthAt(t) * 2,
        thickness: model.getThicknessAt(t),
        rocker: model.getRockerAt(t),
        deckRocker: model.getDeckRockerAt(t),
        position: t * dimensions.length,
      };
    } catch {
      return null;
    }
  }, [design, guidelinePosition, dimensions.length]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[var(--bg-primary)]">
      {/* Top: Outline (Plan View) */}
      <div className="flex-[3] min-h-0 flex flex-col border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Plan View</span>
            <span className="text-[10px] text-[var(--text-secondary)]">Outline</span>
          </div>
          <div className="flex gap-3 text-[10px] text-[var(--text-secondary)]">
            <span>L: {dimensions.length.toFixed(0)}mm</span>
            <span>W: {dimensions.width.toFixed(0)}mm</span>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <CurveEditor
            curve={outline}
            onChange={handleOutlineChange}
            xRange={[0, 1]}
            yRange={[-0.2, 1.2]}
            xLabel="Position (tail -> nose)"
            yLabel="Half-width"
            symmetric
            color="#0ea5e9"
            showGuideline
            guidelineAxis="x"
          />
        </div>
      </div>

      {/* Bottom row: Side View + Cross Section */}
      <div className="flex-[2] min-h-0 flex">
        {/* Bottom-left: Rocker / Thickness (Side View) */}
        <div className="flex-[3] min-h-0 flex flex-col border-r border-[var(--border)]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Side View</span>
              <div className="flex gap-1 ml-2">
                <span className="inline-block w-2 h-[2px] bg-[#0ea5e9] self-center"></span>
                <span className="text-[9px] text-[var(--text-secondary)]">Rocker</span>
                <span className="inline-block w-2 h-[2px] bg-[#67e8f9] self-center ml-1"></span>
                <span className="text-[9px] text-[var(--text-secondary)]">Deck</span>
              </div>
            </div>
            <div className="flex gap-3 text-[10px] text-[var(--text-secondary)]">
              <span>Nose: {rockerPts[rockerPts.length - 1]?.[1]?.toFixed(1) ?? '0'}mm</span>
              <span>Tail: {rockerPts[0]?.[1]?.toFixed(1) ?? '0'}mm</span>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Rocker editor takes the space */}
            <div className="flex-[3] min-h-0">
              <CurveEditor
                curve={rocker}
                onChange={handleRockerChange}
                xRange={[0, 1]}
                yRange={[minRY, maxRY]}
                xLabel="Position (tail -> nose)"
                yLabel="Rocker (mm)"
                color="#0ea5e9"
                showGuideline
                guidelineAxis="x"
              />
            </div>
            {/* Thickness underneath */}
            <div className="border-t border-[var(--border)] shrink-0">
              <div className="flex items-center justify-between px-3 py-1 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Thickness</span>
                <span className="text-[10px] text-[var(--text-secondary)]">Max: {dimensions.thickness.toFixed(1)}mm</span>
              </div>
            </div>
            <div className="flex-[2] min-h-0">
              <CurveEditor
                curve={thickness}
                onChange={handleThicknessChange}
                xRange={[0, 1]}
                yRange={[-0.1, 1.3]}
                xLabel="Position (tail -> nose)"
                yLabel="Factor"
                color="#22c55e"
                showGuideline
                guidelineAxis="x"
                minHeight={100}
              />
            </div>
          </div>
        </div>

        {/* Bottom-right: Cross Section */}
        <div className="flex-[2] min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Cross Section</span>
            <div className="flex gap-1">
              {crossSections.map((cs, i) => (
                <span
                  key={i}
                  className={`text-[9px] px-1.5 py-0.5 rounded ${
                    i === activeSectionIdx
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {(cs.position * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            {activeSection ? (
              <div className="flex-1 min-h-0">
                <CurveEditor
                  curve={activeSection.curve}
                  onChange={handleCrossSectionChange}
                  xRange={[-0.1, 1.1]}
                  yRange={[-0.1, 1.1]}
                  xLabel="Half-width"
                  yLabel="Height"
                  symmetric
                  color="#a78bfa"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-secondary)]">
                No cross-sections defined
              </div>
            )}

            {/* Guideline readout at bottom */}
            {guidelineMeasurements && (
              <div className="shrink-0 px-3 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
                <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  At guideline ({(guidelinePosition * 100).toFixed(0)}%)
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Position</span>
                    <span className="font-mono text-[var(--text-primary)]">{guidelineMeasurements.position.toFixed(0)}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Width</span>
                    <span className="font-mono text-[var(--text-primary)]">{guidelineMeasurements.width.toFixed(1)}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Thickness</span>
                    <span className="font-mono text-[var(--text-primary)]">{guidelineMeasurements.thickness.toFixed(1)}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Rocker</span>
                    <span className="font-mono text-[var(--text-primary)]">{guidelineMeasurements.rocker.toFixed(1)}mm</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignWorkspace;
