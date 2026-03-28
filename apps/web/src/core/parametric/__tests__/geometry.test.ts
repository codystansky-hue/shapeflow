/**
 * Surfboard Geometry Tests
 *
 * Covers three layers of correctness:
 *  1. NURBS utility primitives (knots, sampling, curve creation)
 *  2. BoardModel queries (width, rocker, thickness, cross-section, volume)
 *  3. Surfboard design constraints (physical plausibility, shaping rules)
 *
 * Template data represents a real shortboard (6'0" x 18.75" x 2.375"):
 *   length=1829mm, width=476mm, thickness=60mm
 */

import { describe, it, expect } from 'vitest';
import type { BoardDesignData, NURBSCurveData, CrossSectionData } from '@shapeflow/shared';
import {
  generateUniformKnots,
  generateEllipticalSection,
  createNurbsCurve,
  sampleCurve,
  interpolateCrossSections,
} from '../CurveUtils';
import { BoardModel } from '../BoardModel';

// ---------------------------------------------------------------------------
// Shared fixture: shortboard design (inline so tests have no file-system dep)
// ---------------------------------------------------------------------------

const SHORTBOARD: BoardDesignData = {
  formatVersion: 1,
  units: 'mm',
  dimensions: { length: 1829, width: 476, thickness: 60 },
  outline: {
    degree: 3,
    controlPoints: [[0.0, 0.28], [0.18, 0.80], [0.48, 1.0], [0.78, 0.72], [1.0, 0.12]],
    knots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1],
  },
  rocker: {
    degree: 3,
    controlPoints: [[0.0, 18.0], [0.2, 2.0], [0.45, 0.0], [0.8, 12.0], [1.0, 55.0]],
    knots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1],
  },
  deckRocker: {
    degree: 3,
    controlPoints: [[0.0, 76.0], [0.2, 62.0], [0.45, 60.0], [0.8, 68.0], [1.0, 100.0]],
    knots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1],
  },
  thickness: {
    degree: 3,
    controlPoints: [[0.0, 0.50], [0.25, 0.90], [0.50, 1.0], [0.75, 0.85], [1.0, 0.40]],
    knots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1],
  },
  crossSections: [
    {
      position: 0.25,
      curve: {
        degree: 3,
        controlPoints: [[0.0, 0.0], [0.5, 0.0], [1.0, 0.35], [0.7, 1.0], [0.0, 1.0]],
        knots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1],
      },
    },
    {
      position: 0.5,
      curve: {
        degree: 3,
        controlPoints: [[0.0, 0.0], [0.55, 0.0], [1.0, 0.38], [0.65, 1.0], [0.0, 1.0]],
        knots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1],
      },
    },
    {
      position: 0.75,
      curve: {
        degree: 3,
        controlPoints: [[0.0, 0.0], [0.45, 0.0], [1.0, 0.30], [0.6, 1.0], [0.0, 1.0]],
        knots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1],
      },
    },
  ],
  fins: [],
  symmetric: true,
};

// A minimal, valid NURBSCurveData for a flat line from (0,0) to (1,0)
const FLAT_LINE: NURBSCurveData = {
  degree: 1,
  controlPoints: [[0, 0], [1, 0]],
  knots: [0, 0, 1, 1],
};

// ---------------------------------------------------------------------------
// 1. NURBS Utility Tests
// ---------------------------------------------------------------------------

describe('generateUniformKnots', () => {
  it('produces the correct total length: numCP + degree + 1', () => {
    expect(generateUniformKnots(5, 3)).toHaveLength(5 + 3 + 1);
    expect(generateUniformKnots(6, 2)).toHaveLength(6 + 2 + 1);
  });

  it('clamps both ends: first (degree+1) values = 0, last (degree+1) values = 1', () => {
    const k = generateUniformKnots(5, 3);
    expect(k.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(k.slice(-4)).toEqual([1, 1, 1, 1]);
  });

  it('is monotonically non-decreasing', () => {
    const k = generateUniformKnots(7, 3);
    for (let i = 1; i < k.length; i++) {
      expect(k[i]).toBeGreaterThanOrEqual(k[i - 1]);
    }
  });

  it('interior knots are strictly between 0 and 1', () => {
    const k = generateUniformKnots(7, 3);
    const interior = k.slice(4, -4);
    for (const v of interior) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('generateEllipticalSection', () => {
  it('returns the requested number of points', () => {
    expect(generateEllipticalSection(500, 60, 20)).toHaveLength(20);
    expect(generateEllipticalSection(500, 60, 32)).toHaveLength(32);
  });

  it('starts at the bottom center [0, 0] (within float tolerance)', () => {
    const pts = generateEllipticalSection(500, 60, 20);
    expect(pts[0][0]).toBeCloseTo(0, 5);
    expect(pts[0][1]).toBeCloseTo(0, 5);
  });

  it('ends at the deck center [0, thickness] (within float tolerance)', () => {
    const pts = generateEllipticalSection(500, 60, 20);
    const last = pts[pts.length - 1];
    expect(last[0]).toBeCloseTo(0, 5);
    expect(last[1]).toBeCloseTo(60, 3);
  });

  it('y values are non-negative (right-side half-section)', () => {
    const pts = generateEllipticalSection(500, 60, 20);
    for (const [y] of pts) expect(y).toBeGreaterThanOrEqual(0);
  });

  it('peak y ≈ halfWidth (widest at mid-section)', () => {
    const halfWidth = 250;
    const pts = generateEllipticalSection(halfWidth * 2, 60, 64);
    const maxY = Math.max(...pts.map(p => p[0]));
    expect(maxY).toBeCloseTo(halfWidth, 0);
  });

  it('z values are bounded by [0, thickness]', () => {
    const thickness = 60;
    const pts = generateEllipticalSection(500, thickness, 20);
    for (const [, z] of pts) {
      expect(z).toBeGreaterThanOrEqual(-0.001);
      expect(z).toBeLessThanOrEqual(thickness + 0.001);
    }
  });
});

describe('createNurbsCurve and sampleCurve', () => {
  it('creates a curve from 2D control points without throwing', () => {
    expect(() => createNurbsCurve(FLAT_LINE)).not.toThrow();
  });

  it('evaluates the curve at t=0 (start point)', () => {
    const curve = createNurbsCurve(FLAT_LINE);
    const pt = curve.point(0);
    expect(pt[0]).toBeCloseTo(0, 4);
    expect(pt[1]).toBeCloseTo(0, 4);
  });

  it('evaluates the curve at t=1 (end point)', () => {
    const curve = createNurbsCurve(FLAT_LINE);
    const pt = curve.point(1);
    expect(pt[0]).toBeCloseTo(1, 4);
    expect(pt[1]).toBeCloseTo(0, 4);
  });

  it('sampleCurve returns the requested number of samples', () => {
    const curve = createNurbsCurve(FLAT_LINE);
    expect(sampleCurve(curve, 10)).toHaveLength(10);
    expect(sampleCurve(curve, 50)).toHaveLength(50);
  });

  it('sample at index 0 matches t=0 point', () => {
    const curve = createNurbsCurve(FLAT_LINE);
    const samples = sampleCurve(curve, 10);
    expect(samples[0][0]).toBeCloseTo(0, 4);
  });

  it('sample at last index matches t=1 point', () => {
    const curve = createNurbsCurve(FLAT_LINE);
    const samples = sampleCurve(curve, 10);
    const last = samples[samples.length - 1];
    expect(last[0]).toBeCloseTo(1, 4);
  });
});

// ---------------------------------------------------------------------------
// 2. BoardModel Query Tests
// ---------------------------------------------------------------------------

describe('BoardModel – basic queries', () => {
  const model = BoardModel.fromDesignData(SHORTBOARD);

  it('exposes correct dimensions', () => {
    expect(model.length).toBe(1829);
    expect(model.maxWidth).toBe(476);
    expect(model.maxThickness).toBe(60);
  });

  it('getWidthAt returns non-negative values across the full range', () => {
    for (let i = 0; i <= 10; i++) {
      expect(model.getWidthAt(i / 10)).toBeGreaterThanOrEqual(0);
    }
  });

  it('getWidthAt never exceeds maxWidth', () => {
    for (let i = 0; i <= 20; i++) {
      expect(model.getWidthAt(i / 20)).toBeLessThanOrEqual(model.maxWidth + 0.1);
    }
  });

  it('getWidthAt returns different values at different stations (not a flat curve)', () => {
    const tail = model.getWidthAt(0);
    const mid = model.getWidthAt(0.5);
    const nose = model.getWidthAt(1);
    expect(mid).toBeGreaterThan(tail);
    expect(mid).toBeGreaterThan(nose);
  });

  it('getRockerAt returns non-negative rocker across the board', () => {
    for (let i = 0; i <= 10; i++) {
      expect(model.getRockerAt(i / 10)).toBeGreaterThanOrEqual(-0.1);
    }
  });

  it('getDeckRockerAt is always greater than getRockerAt at the same station (deck > bottom)', () => {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      expect(model.getDeckRockerAt(t)).toBeGreaterThan(model.getRockerAt(t));
    }
  });

  it('getThicknessAt returns positive values across the board', () => {
    for (let i = 0; i <= 10; i++) {
      expect(model.getThicknessAt(i / 10)).toBeGreaterThan(0);
    }
  });

  it('getThicknessAt never exceeds maxThickness', () => {
    for (let i = 0; i <= 20; i++) {
      expect(model.getThicknessAt(i / 20)).toBeLessThanOrEqual(model.maxThickness + 0.1);
    }
  });

  it('getCrossSectionAt returns the requested number of points', () => {
    expect(model.getCrossSectionAt(0.5, 20)).toHaveLength(20);
    expect(model.getCrossSectionAt(0.5, 32)).toHaveLength(32);
  });

  it('getCrossSectionAt points have non-negative y (half-section, one side)', () => {
    const pts = model.getCrossSectionAt(0.5, 20);
    for (const [y] of pts) expect(y).toBeGreaterThanOrEqual(-0.001);
  });
});

// ---------------------------------------------------------------------------
// 3. Cross-Section Area and Volume Tests
// ---------------------------------------------------------------------------

describe('BoardModel – area and volume', () => {
  const model = BoardModel.fromDesignData(SHORTBOARD);

  it('getCrossSectionArea returns a positive value', () => {
    expect(model.getCrossSectionArea(0.5)).toBeGreaterThan(0);
  });

  it('cross-section area is larger in the middle than at the extremes', () => {
    const tailArea = model.getCrossSectionArea(0.05);
    const midArea  = model.getCrossSectionArea(0.5);
    const noseArea = model.getCrossSectionArea(0.95);
    expect(midArea).toBeGreaterThan(tailArea);
    expect(midArea).toBeGreaterThan(noseArea);
  });

  it('getVolume returns a positive number', () => {
    expect(model.getVolume(20)).toBeGreaterThan(0);
  });

  it('getVolumeInLiters is in a physically plausible shortboard range (15–40 L)', () => {
    const liters = model.getVolumeInLiters(40);
    expect(liters).toBeGreaterThan(15);
    expect(liters).toBeLessThan(40);
  });

  it('volume scales with number of stations (converges)', () => {
    const v1 = model.getVolumeInLiters(20);
    const v2 = model.getVolumeInLiters(80);
    // Should converge: coarse and fine estimates within 5% of each other
    expect(Math.abs(v1 - v2) / v2).toBeLessThan(0.05);
  });
});

// ---------------------------------------------------------------------------
// 4. Surfboard Design Constraint Tests
// ---------------------------------------------------------------------------

describe('Surfboard design constraints – shortboard', () => {
  const model = BoardModel.fromDesignData(SHORTBOARD);

  it('tail is narrower than the widepoint', () => {
    const tailWidth = model.getWidthAt(0);
    // Sample to find approximate widepoint
    const widths = Array.from({ length: 21 }, (_, i) => model.getWidthAt(i / 20));
    const maxWidth = Math.max(...widths);
    expect(tailWidth).toBeLessThan(maxWidth);
  });

  it('nose is narrower than the widepoint', () => {
    const noseWidth = model.getWidthAt(1);
    const widths = Array.from({ length: 21 }, (_, i) => model.getWidthAt(i / 20));
    const maxWidth = Math.max(...widths);
    expect(noseWidth).toBeLessThan(maxWidth);
  });

  it('nose rocker is greater than mid-board rocker (progressive nose kick)', () => {
    const midRocker  = model.getRockerAt(0.4);
    const noseRocker = model.getRockerAt(1.0);
    expect(noseRocker).toBeGreaterThan(midRocker);
  });

  it('tail rocker is greater than minimum rocker (entry rocker lift)', () => {
    const tailRocker = model.getRockerAt(0);
    const rockers = Array.from({ length: 11 }, (_, i) => model.getRockerAt(i / 10));
    const minRocker = Math.min(...rockers);
    expect(tailRocker).toBeGreaterThan(minRocker);
  });

  it('thickness distribution thins toward nose and tail vs. middle', () => {
    const tailThick = model.getThicknessAt(0.05);
    const midThick  = model.getThicknessAt(0.45);
    const noseThick = model.getThicknessAt(0.95);
    expect(midThick).toBeGreaterThan(tailThick);
    expect(midThick).toBeGreaterThan(noseThick);
  });

  it('deck rocker at tail is substantially higher than bottom rocker (real-world: deck arch)', () => {
    // A real shortboard has ~30-60mm of arch between deck and bottom at the tail
    const bottomAtTail = model.getRockerAt(0);
    const deckAtTail   = model.getDeckRockerAt(0);
    expect(deckAtTail - bottomAtTail).toBeGreaterThan(20);
  });

  it('deck rocker at nose is higher than at tail (typical rocker profile)', () => {
    expect(model.getDeckRockerAt(1)).toBeGreaterThan(model.getDeckRockerAt(0));
  });
});

// ---------------------------------------------------------------------------
// 5. interpolateCrossSections Edge Cases
// ---------------------------------------------------------------------------

describe('interpolateCrossSections', () => {
  const sections: CrossSectionData[] = SHORTBOARD.crossSections;

  it('returns correct number of points', () => {
    const pts = interpolateCrossSections(sections, 0.5, 200, 55, 16);
    expect(pts).toHaveLength(16);
  });

  it('y values are scaled to half-width range [0, width/2]', () => {
    const halfWidth = 200;
    const pts = interpolateCrossSections(sections, 0.5, halfWidth * 2, 55, 20);
    const maxY = Math.max(...pts.map(p => p[0]));
    expect(maxY).toBeLessThanOrEqual(halfWidth + 0.001);
    expect(maxY).toBeGreaterThan(0);
  });

  it('z values are bounded by [0, thickness]', () => {
    const thickness = 55;
    const pts = interpolateCrossSections(sections, 0.5, 400, thickness, 20);
    for (const [, z] of pts) {
      expect(z).toBeGreaterThanOrEqual(-0.001);
      expect(z).toBeLessThanOrEqual(thickness + 0.001);
    }
  });

  it('clamps t below first section position to use only the first section', () => {
    const ptsAtFirst  = interpolateCrossSections(sections, 0.25, 400, 55, 16);
    const ptsBelowAll = interpolateCrossSections(sections, 0.0,  400, 55, 16);
    // Both should sample the same underlying curve (the first one)
    for (let i = 0; i < 16; i++) {
      expect(ptsBelowAll[i][0]).toBeCloseTo(ptsAtFirst[i][0], 4);
      expect(ptsBelowAll[i][1]).toBeCloseTo(ptsAtFirst[i][1], 4);
    }
  });

  it('clamps t above last section position to use only the last section', () => {
    const ptsAtLast  = interpolateCrossSections(sections, 0.75, 400, 55, 16);
    const ptsAboveAll = interpolateCrossSections(sections, 1.0, 400, 55, 16);
    for (let i = 0; i < 16; i++) {
      expect(ptsAboveAll[i][0]).toBeCloseTo(ptsAtLast[i][0], 4);
      expect(ptsAboveAll[i][1]).toBeCloseTo(ptsAtLast[i][1], 4);
    }
  });

  it('falls back to ellipse when sections array is empty', () => {
    const pts = interpolateCrossSections([], 0.5, 400, 55, 20);
    expect(pts).toHaveLength(20);
    expect(pts[0][0]).toBeCloseTo(0, 5); // starts at center
  });
});

// ---------------------------------------------------------------------------
// 6. BoardModel without cross-sections (ellipse fallback path)
// ---------------------------------------------------------------------------

describe('BoardModel – ellipse fallback (no cross-sections)', () => {
  const designNoSections: BoardDesignData = {
    ...SHORTBOARD,
    crossSections: [],
  };
  const model = BoardModel.fromDesignData(designNoSections);

  it('getCrossSectionAt still returns correct number of points', () => {
    expect(model.getCrossSectionAt(0.5, 24)).toHaveLength(24);
  });

  it('getCrossSectionArea is positive', () => {
    expect(model.getCrossSectionArea(0.5)).toBeGreaterThan(0);
  });

  it('volume is positive and plausible', () => {
    const liters = model.getVolumeInLiters(30);
    expect(liters).toBeGreaterThan(10);
    expect(liters).toBeLessThan(60);
  });
});
