/**
 * CurveUtils.ts - Utility functions for NURBS curve operations
 *
 * Bridges our NURBSCurveData format with verb-nurbs-web curve objects,
 * and provides helpers for sampling, knot generation, and cross-section
 * interpolation.
 */

import type { NURBSCurveData, CrossSectionData } from '@shapeflow/shared';
import verb from 'verb-nurbs-web';

export type VerbNurbsCurve = InstanceType<typeof verb.geom.NurbsCurve>;

/**
 * Create a verb NurbsCurve from our NURBSCurveData format.
 *
 * verb-nurbs-web API: NurbsCurve.byKnotsControlPointsWeights(degree, knots, controlPoints, weights?)
 * Control points are 3D [x, y, z]. For 2D input [x, y] we append z=0.
 */
export function createNurbsCurve(data: NURBSCurveData): VerbNurbsCurve {
  const controlPoints3D = data.controlPoints.map((pt) => {
    if (pt.length === 2) return [pt[0], pt[1], 0];
    return [pt[0], pt[1], pt[2]];
  });

  const weights = data.weights ?? data.controlPoints.map(() => 1.0);

  return verb.geom.NurbsCurve.byKnotsControlPointsWeights(
    data.degree,
    data.knots,
    controlPoints3D,
    weights,
  );
}

/**
 * Sample a verb NurbsCurve at `numSamples` evenly-spaced parameter values.
 * Returns an array of 3D points [x, y, z].
 */
export function sampleCurve(
  curve: VerbNurbsCurve,
  numSamples: number,
): number[][] {
  const points: number[][] = [];
  for (let i = 0; i < numSamples; i++) {
    const t = i / (numSamples - 1);
    const pt = curve.point(t);
    points.push(pt);
  }
  return points;
}

/**
 * Generate a uniform (clamped) knot vector for the given number of control
 * points and degree.
 */
export function generateUniformKnots(
  numControlPoints: number,
  degree: number,
): number[] {
  const n = numControlPoints + degree + 1;
  const knots: number[] = [];

  for (let i = 0; i < n; i++) {
    if (i <= degree) {
      knots.push(0);
    } else if (i >= n - degree - 1) {
      knots.push(1);
    } else {
      knots.push((i - degree) / (n - 2 * degree - 1));
    }
  }

  return knots;
}

/**
 * Interpolate between defined cross-sections at a given parameter t along the
 * board, then scale the result to the requested width and thickness.
 *
 * Returns an array of 2D points [y, z] describing the half cross-section
 * (to be mirrored for the full profile).
 */
export function interpolateCrossSections(
  sections: CrossSectionData[],
  t: number,
  width: number,
  thickness: number,
  numPoints: number = 20,
): number[][] {
  if (sections.length === 0) {
    return generateEllipticalSection(width, thickness, numPoints);
  }

  // Sort sections by position
  const sorted = [...sections].sort((a, b) => a.position - b.position);

  // Find the two bounding sections
  let lower = sorted[0];
  let upper = sorted[sorted.length - 1];
  let blend = 0;

  if (t <= sorted[0].position) {
    lower = sorted[0];
    upper = sorted[0];
    blend = 0;
  } else if (t >= sorted[sorted.length - 1].position) {
    lower = sorted[sorted.length - 1];
    upper = sorted[sorted.length - 1];
    blend = 0;
  } else {
    for (let i = 0; i < sorted.length - 1; i++) {
      if (t >= sorted[i].position && t <= sorted[i + 1].position) {
        lower = sorted[i];
        upper = sorted[i + 1];
        blend =
          (t - sorted[i].position) /
          (sorted[i + 1].position - sorted[i].position);
        break;
      }
    }
  }

  // Sample both sections' curves
  const lowerCurve = createNurbsCurve(lower.curve);
  const upperCurve = createNurbsCurve(upper.curve);

  const lowerPts = sampleCurve(lowerCurve, numPoints);
  const upperPts = sampleCurve(upperCurve, numPoints);

  // Blend and scale to target width/thickness
  const result: number[][] = [];
  for (let i = 0; i < numPoints; i++) {
    // Cross-section curves are in normalised space [0..1, 0..1]
    const ly = lowerPts[i][0];
    const lz = lowerPts[i][1];
    const uy = upperPts[i][0];
    const uz = upperPts[i][1];

    const y = (ly * (1 - blend) + uy * blend) * (width / 2);
    const z = (lz * (1 - blend) + uz * blend) * thickness;

    result.push([y, z]);
  }

  return result;
}

/**
 * Generate a simple elliptical half cross-section as a fallback.
 * Returns points from bottom-center [0, 0] around to top-center [0, thickness].
 */
export function generateEllipticalSection(
  width: number,
  thickness: number,
  numPoints: number = 20,
): number[][] {
  const halfWidth = width / 2;
  const points: number[][] = [];

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / (numPoints - 1)) * Math.PI;
    const y = halfWidth * Math.sin(angle);
    const z = (thickness / 2) * (1 - Math.cos(angle));
    points.push([y, z]);
  }

  return points;
}
