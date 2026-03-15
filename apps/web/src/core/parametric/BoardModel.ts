/**
 * BoardModel.ts - Core parametric board model
 *
 * Holds the parametric design data and verb-nurbs-web curve objects for
 * efficient evaluation. Provides methods to query width, rocker, thickness,
 * cross-section, and volume at any parameter t in [0, 1] (tail to nose).
 */

import type { BoardDesignData, CrossSectionData } from '@shapeflow/shared';
import {
  createNurbsCurve,
  interpolateCrossSections,
  generateEllipticalSection,
  type VerbNurbsCurve,
} from './CurveUtils';

export class BoardModel {
  /** The raw design data */
  readonly data: BoardDesignData;

  /** Prebuilt verb curves for fast evaluation */
  private outlineCurve: VerbNurbsCurve;
  private rockerCurve: VerbNurbsCurve;
  private deckRockerCurve: VerbNurbsCurve;
  private thicknessCurve: VerbNurbsCurve;

  private constructor(data: BoardDesignData) {
    this.data = data;
    this.outlineCurve = createNurbsCurve(data.outline);
    this.rockerCurve = createNurbsCurve(data.rocker);
    this.deckRockerCurve = createNurbsCurve(data.deckRocker);
    this.thicknessCurve = createNurbsCurve(data.thickness);
  }

  /**
   * Factory method to create a BoardModel from design data.
   */
  static fromDesignData(data: BoardDesignData): BoardModel {
    return new BoardModel(data);
  }

  /** Board length in design units (mm or inches). */
  get length(): number {
    return this.data.dimensions.length;
  }

  /** Max width in design units. */
  get maxWidth(): number {
    return this.data.dimensions.width;
  }

  /** Max thickness in design units. */
  get maxThickness(): number {
    return this.data.dimensions.thickness;
  }

  /**
   * Get the half-width at parameter t (0 = tail, 1 = nose).
   *
   * The outline curve's Y component encodes normalised half-width that we
   * scale by the design's max width. The X component corresponds to board
   * position and is ignored for this query.
   */
  getWidthAt(t: number): number {
    const pt = this.outlineCurve.point(t);
    // pt[1] is the normalised half-width (0..1 range in the template).
    // Full width = 2 * halfWidth. We store dimensions.width as full width.
    return pt[1] * this.data.dimensions.width;
  }

  /**
   * Get the bottom rocker height at parameter t.
   *
   * Rocker is stored as a curve whose Y component gives the rocker offset
   * in mm (or design units). Positive Y = upward.
   */
  getRockerAt(t: number): number {
    const pt = this.rockerCurve.point(t);
    return pt[1];
  }

  /**
   * Get the deck rocker height at parameter t.
   */
  getDeckRockerAt(t: number): number {
    const pt = this.deckRockerCurve.point(t);
    return pt[1];
  }

  /**
   * Get the thickness at parameter t.
   *
   * The thickness curve Y component is a normalised factor (0..1) scaled
   * by the max thickness.
   */
  getThicknessAt(t: number): number {
    const pt = this.thicknessCurve.point(t);
    return pt[1] * this.data.dimensions.thickness;
  }

  /**
   * Get a cross-section profile at parameter t.
   *
   * Returns an array of 2D points [y, z] for the half-section (one side).
   * Mirror across y=0 for the full section.
   *
   * The points describe a closed curve from the bottom center-line,
   * around the rail, to the deck center-line.
   */
  getCrossSectionAt(t: number, numPoints: number = 20): number[][] {
    const width = this.getWidthAt(t);
    const thickness = this.getThicknessAt(t);

    if (this.data.crossSections.length === 0) {
      return generateEllipticalSection(width, thickness, numPoints);
    }

    return interpolateCrossSections(
      this.data.crossSections,
      t,
      width,
      thickness,
      numPoints,
    );
  }

  /**
   * Compute the cross-sectional area at parameter t using the trapezoidal
   * rule on the half-section points, then doubling for the full section.
   */
  getCrossSectionArea(t: number, numPoints: number = 20): number {
    const halfSection = this.getCrossSectionAt(t, numPoints);

    // Compute area of the half-section polygon using the shoelace formula
    let area = 0;
    const n = halfSection.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += halfSection[i][0] * halfSection[j][1];
      area -= halfSection[j][0] * halfSection[i][1];
    }
    area = Math.abs(area) / 2;

    // Double for the full (mirrored) cross-section
    return area * 2;
  }

  /**
   * Compute the board volume via numerical integration (Simpson's rule)
   * of cross-sectional areas along the board length.
   *
   * Returns volume in cubic mm (if units are mm) or cubic inches.
   */
  getVolume(numStations: number = 50): number {
    // Use Simpson's rule: must have an even number of intervals
    const n = numStations % 2 === 0 ? numStations : numStations + 1;
    const h = this.data.dimensions.length / n;

    let sum = this.getCrossSectionArea(0) + this.getCrossSectionArea(1);

    for (let i = 1; i < n; i++) {
      const t = i / n;
      const area = this.getCrossSectionArea(t);
      sum += area * (i % 2 === 0 ? 2 : 4);
    }

    return (sum * h) / 3;
  }

  /**
   * Get volume in liters (assumes design units are mm).
   */
  getVolumeInLiters(numStations: number = 50): number {
    const cubicMm = this.getVolume(numStations);
    if (this.data.units === 'mm') {
      return cubicMm / 1e6; // mm^3 to liters
    }
    // inches^3 to liters
    return cubicMm * 0.016387064;
  }
}
