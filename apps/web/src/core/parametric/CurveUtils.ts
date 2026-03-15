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
 * verb expects homogeneous control points. For 2D input [x, y] we produce
 * [x, y, 0, w]. For 3D input [x, y, z] we produce [x, y, z, w].
 */
export function createNurbsCurve(data: NURBSCurveData): VerbNurbsCurve {
  const weights = data.weights ?? data.controlPoints.map(() => 1.0);

  const homogeneous = data.controlPoints.map((pt, i) => {
    const w = weights[i];
    if (pt.length === 2) {
      return [pt[0], pt[1], 0, w];
    }
    return [pt[0], pt[1], pt[2], w];
  });

  return new verb.geom.NurbsCurve(
    new verb.geom.NurbsCurveData(data.degree, data.knots, homogeneous),
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
 *
 * The resulting vector has (numControlPoints + degree + 1) entries, is clamped
 * at both ends (first/last degree+1 knots repeated), and uniform in between,
 * normalised to the [0, 1] range.
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
 *
 * When t falls between two defined sections we blend their sampled shapes
 * linearly. When t is outside the defined range we clamp to the nearest
 * section.
 */
export function interpolateCrossSections(
  sections: CrossSectionData[],
  t: number,
  width: number,
  thickness: number,
  numPoints: number = 20,
): number[][] {
  if (sections.length === 0) {
    // Fallback: simple elliptical half-section
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
    // Angle from 0 (bottom center) to PI (top center)
    const angle = (i / (numPoints - 1)) * Math.PI;
    const y = halfWidth * Math.sin(angle);
    const z = (thickness / 2) * (1 - Math.cos(angle));
    points.push([y, z]);
  }

  return points;
}
