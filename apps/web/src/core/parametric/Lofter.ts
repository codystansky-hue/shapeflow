/**
 * Lofter.ts - Generates a closed triangle mesh from a parametric BoardModel
 *
 * The primary approach builds cross-section point rings directly and connects
 * them with indexed triangles, avoiding verb's NURBS surface lofting overhead
 * for interactive performance.
 */

import * as THREE from 'three';
import { BoardModel } from './BoardModel';

export interface LoftOptions {
  /** Number of stations along the board (default 50 for preview, 100 for final) */
  stations?: number;
  /** Number of points per cross-section ring (default 24) */
  ringPoints?: number;
}

const DEFAULT_OPTIONS: Required<LoftOptions> = {
  stations: 100,
  ringPoints: 48,
};

/**
 * Generate a closed THREE.BufferGeometry from a parametric BoardModel.
 *
 * Algorithm:
 *  1. For each station t = 0..1, query width, rocker, thickness.
 *  2. Generate a cross-section ring (half-section mirrored to full ring).
 *  3. Position ring in 3D: x = t * length, y and z from cross-section, z offset by rocker.
 *  4. Connect adjacent rings with triangle strips.
 *  5. Close nose and tail caps with fan triangulation.
 *  6. Compute smooth vertex normals.
 */
export function loftBoard(
  model: BoardModel,
  options?: LoftOptions,
): THREE.BufferGeometry {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { stations, ringPoints } = opts;

  // -- Step 1 & 2: Build all cross-section rings as 3D positions --
  const rings: THREE.Vector3[][] = [];
  const halfPts = Math.floor(ringPoints / 2);
  // Total points per ring = halfPts * 2 (mirrored)
  const ptsPerRing = halfPts * 2;

  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    const x = t * model.length;
    const rocker = model.getRockerAt(t);

    // Get half cross-section [y, z] points
    const halfSection = model.getCrossSectionAt(t, halfPts);

    // Build full ring: right side (positive y), then left side (negative y, reversed)
    const ring: THREE.Vector3[] = [];

    // Right side: bottom-center to top-center
    for (let j = 0; j < halfPts; j++) {
      const [y, z] = halfSection[j];
      ring.push(new THREE.Vector3(x, y, z + rocker));
    }

    // Left side (mirror): top-center back to bottom-center
    for (let j = halfPts - 1; j >= 0; j--) {
      const [y, z] = halfSection[j];
      ring.push(new THREE.Vector3(x, -y, z + rocker));
    }

    rings.push(ring);
  }

  // -- Step 3: Build indexed triangle mesh --
  const positions: number[] = [];
  const indices: number[] = [];

  // Flatten ring vertices into positions array
  for (let i = 0; i <= stations; i++) {
    for (let j = 0; j < ptsPerRing; j++) {
      const v = rings[i][j];
      positions.push(v.x, v.y, v.z);
    }
  }

  // -- Step 4: Connect adjacent rings with triangle strips --
  for (let i = 0; i < stations; i++) {
    const ringOffset = i * ptsPerRing;
    const nextRingOffset = (i + 1) * ptsPerRing;

    for (let j = 0; j < ptsPerRing; j++) {
      const j1 = (j + 1) % ptsPerRing;

      const a = ringOffset + j;
      const b = ringOffset + j1;
      const c = nextRingOffset + j;
      const d = nextRingOffset + j1;

      // Two triangles per quad
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // -- Step 5: Close tail (t=0) and nose (t=1) caps --
  const tailCenter = positions.length / 3;
  const tailRing = rings[0];
  // Compute tail center point
  const tailCx = tailRing.reduce((s, v) => s + v.x, 0) / ptsPerRing;
  const tailCy = tailRing.reduce((s, v) => s + v.y, 0) / ptsPerRing;
  const tailCz = tailRing.reduce((s, v) => s + v.z, 0) / ptsPerRing;
  positions.push(tailCx, tailCy, tailCz);

  for (let j = 0; j < ptsPerRing; j++) {
    const j1 = (j + 1) % ptsPerRing;
    // Tail cap winds inward (reversed winding for correct normals facing outward)
    indices.push(tailCenter, j1, j);
  }

  const noseCenter = positions.length / 3;
  const noseRing = rings[stations];
  const noseCx = noseRing.reduce((s, v) => s + v.x, 0) / ptsPerRing;
  const noseCy = noseRing.reduce((s, v) => s + v.y, 0) / ptsPerRing;
  const noseCz = noseRing.reduce((s, v) => s + v.z, 0) / ptsPerRing;
  positions.push(noseCx, noseCy, noseCz);

  const noseOffset = stations * ptsPerRing;
  for (let j = 0; j < ptsPerRing; j++) {
    const j1 = (j + 1) % ptsPerRing;
    indices.push(noseCenter, noseOffset + j, noseOffset + j1);
  }

  // -- Step 6: Build geometry and compute normals --
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Lightweight version that returns only position data for measurements /
 * wireframe preview without full normal computation.
 */
export function loftBoardPositionsOnly(
  model: BoardModel,
  stations: number = 30,
  ringPoints: number = 16,
): { positions: Float32Array; indices: Uint32Array } {
  const halfPts = Math.floor(ringPoints / 2);
  const ptsPerRing = halfPts * 2;
  const totalVerts = (stations + 1) * ptsPerRing + 2; // +2 for caps
  const positions = new Float32Array(totalVerts * 3);
  const indexList: number[] = [];

  let vi = 0;
  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    const x = t * model.length;
    const rocker = model.getRockerAt(t);
    const halfSection = model.getCrossSectionAt(t, halfPts);

    // Right side
    for (let j = 0; j < halfPts; j++) {
      const [y, z] = halfSection[j];
      positions[vi++] = x;
      positions[vi++] = y;
      positions[vi++] = z + rocker;
    }
    // Left side (mirror)
    for (let j = halfPts - 1; j >= 0; j--) {
      const [y, z] = halfSection[j];
      positions[vi++] = x;
      positions[vi++] = -y;
      positions[vi++] = z + rocker;
    }
  }

  // Body quads
  for (let i = 0; i < stations; i++) {
    const ro = i * ptsPerRing;
    const nro = (i + 1) * ptsPerRing;
    for (let j = 0; j < ptsPerRing; j++) {
      const j1 = (j + 1) % ptsPerRing;
      indexList.push(ro + j, nro + j, ro + j1);
      indexList.push(ro + j1, nro + j, nro + j1);
    }
  }

  // Tail cap
  const tailIdx = (stations + 1) * ptsPerRing;
  let cx = 0, cy = 0, cz = 0;
  for (let j = 0; j < ptsPerRing; j++) {
    cx += positions[j * 3];
    cy += positions[j * 3 + 1];
    cz += positions[j * 3 + 2];
  }
  positions[vi++] = cx / ptsPerRing;
  positions[vi++] = cy / ptsPerRing;
  positions[vi++] = cz / ptsPerRing;
  for (let j = 0; j < ptsPerRing; j++) {
    indexList.push(tailIdx, (j + 1) % ptsPerRing, j);
  }

  // Nose cap
  const noseIdx = tailIdx + 1;
  cx = cy = cz = 0;
  const no = stations * ptsPerRing;
  for (let j = 0; j < ptsPerRing; j++) {
    cx += positions[(no + j) * 3];
    cy += positions[(no + j) * 3 + 1];
    cz += positions[(no + j) * 3 + 2];
  }
  positions[vi++] = cx / ptsPerRing;
  positions[vi++] = cy / ptsPerRing;
  positions[vi++] = cz / ptsPerRing;
  for (let j = 0; j < ptsPerRing; j++) {
    indexList.push(noseIdx, no + j, no + (j + 1) % ptsPerRing);
  }

  return { positions, indices: new Uint32Array(indexList) };
}
