/**
 * Measurements.ts - Board measurement utilities
 *
 * Provides comprehensive measurement extraction from a parametric BoardModel,
 * including length, width/thickness at key points, rocker values, and volume.
 */

import { BoardModel } from './BoardModel';

/** Full measurement result from measureBoard() */
export interface BoardMeasurements {
  /** Board length in design units */
  length: number;

  /** Maximum width and its position (t value) */
  maxWidth: number;
  maxWidthPosition: number;

  /** Maximum thickness and its position (t value) */
  maxThickness: number;
  maxThicknessPosition: number;

  /** Nose rocker: rocker height at t = 1.0 (nose tip) */
  noseRocker: number;

  /** Tail rocker: rocker height at t = 0.0 (tail tip) */
  tailRocker: number;

  /** Width measured 1 foot (305mm) from the nose */
  noseWidth: number;

  /** Width measured 1 foot (305mm) from the tail */
  tailWidth: number;

  /** Width at 12 inches from nose in mm (same as noseWidth, alias for clarity) */
  widePointToNose: number;

  /** Volume in liters */
  volumeLiters: number;

  /** Volume in cubic inches */
  volumeCubicInches: number;

  /** Design units */
  units: string;
}

/** Measurement at a specific point along the board */
export interface PointMeasurement {
  /** Parameter t (0 = tail, 1 = nose) */
  t: number;

  /** Distance from tail in design units */
  distanceFromTail: number;

  /** Width at this point */
  width: number;

  /** Thickness at this point */
  thickness: number;

  /** Bottom rocker height */
  rocker: number;

  /** Deck rocker height */
  deckRocker: number;

  /** Cross-sectional area in square design units */
  crossSectionArea: number;
}

/**
 * Compute comprehensive measurements from a BoardModel.
 *
 * Scans the board at 200 stations to find max width / thickness positions
 * accurately, then reads specific points for nose/tail measurements.
 */
export function measureBoard(model: BoardModel): BoardMeasurements {
  const length = model.length;
  const scanStations = 200;

  let maxWidth = 0;
  let maxWidthT = 0.5;
  let maxThickness = 0;
  let maxThicknessT = 0.5;

  for (let i = 0; i <= scanStations; i++) {
    const t = i / scanStations;
    const w = model.getWidthAt(t);
    const th = model.getThicknessAt(t);

    if (w > maxWidth) {
      maxWidth = w;
      maxWidthT = t;
    }
    if (th > maxThickness) {
      maxThickness = th;
      maxThicknessT = t;
    }
  }

  // Nose and tail rocker
  const noseRocker = model.getRockerAt(1.0);
  const tailRocker = model.getRockerAt(0.0);

  // Width at 1 foot from nose and tail
  // 1 foot = 304.8mm. Convert to t-parameter.
  const footInUnits = model.data.units === 'mm' ? 304.8 : 12.0;
  const footT = footInUnits / length;

  const noseMeasureT = Math.max(0, 1.0 - footT);
  const tailMeasureT = Math.min(1, footT);

  const noseWidth = model.getWidthAt(noseMeasureT);
  const tailWidth = model.getWidthAt(tailMeasureT);

  // Volume
  const volumeLiters = model.getVolumeInLiters(100);
  const volumeCubicInches =
    model.data.units === 'mm'
      ? volumeLiters / 0.016387064
      : model.getVolume(100);

  // Wide point distance from nose (in design units)
  const widePointToNose = (1 - maxWidthT) * length;

  return {
    length,
    maxWidth,
    maxWidthPosition: maxWidthT,
    maxThickness,
    maxThicknessPosition: maxThicknessT,
    noseRocker,
    tailRocker,
    noseWidth,
    tailWidth,
    widePointToNose,
    volumeLiters,
    volumeCubicInches,
    units: model.data.units,
  };
}

/**
 * Get detailed measurements at a specific parameter t along the board.
 */
export function measureAt(model: BoardModel, t: number): PointMeasurement {
  const clampedT = Math.max(0, Math.min(1, t));

  return {
    t: clampedT,
    distanceFromTail: clampedT * model.length,
    width: model.getWidthAt(clampedT),
    thickness: model.getThicknessAt(clampedT),
    rocker: model.getRockerAt(clampedT),
    deckRocker: model.getDeckRockerAt(clampedT),
    crossSectionArea: model.getCrossSectionArea(clampedT),
  };
}
