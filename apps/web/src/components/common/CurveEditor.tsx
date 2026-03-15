import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { NURBSCurveData } from '@shapeflow/shared';

interface CurveEditorProps {
  curve: NURBSCurveData;
  onChange: (points: number[][]) => void;
  width: number;
  height: number;
  xLabel?: string;
  yLabel?: string;
  xRange: [number, number];
  yRange: [number, number];
  symmetric?: boolean;
  color?: string;
  backgroundColor?: string;
}

/** Evaluate a NURBS curve at parameter t using De Boor's algorithm (simplified for display) */
function evaluateCurve(curve: NURBSCurveData, numSamples: number): number[][] {
  const { controlPoints, degree, knots, weights } = curve;
  const n = controlPoints.length;
  if (n === 0) return [];

  const points: number[][] = [];
  const tMin = knots[degree];
  const tMax = knots[n];

  for (let i = 0; i <= numSamples; i++) {
    const t = tMin + (i / numSamples) * (tMax - tMin);
    // De Boor evaluation
    const point = deBoor(t, degree, controlPoints, knots, weights);
    if (point) points.push(point);
  }
  return points;
}

function deBoor(
  t: number,
  degree: number,
  controlPoints: number[][],
  knots: number[],
  weights?: number[],
): number[] | null {
  const n = controlPoints.length;
  if (n === 0) return null;

  // Find knot span
  let k = degree;
  for (let i = degree; i < n; i++) {
    if (t >= knots[i] && t <= knots[i + 1]) {
      k = i;
      break;
    }
  }

  // Build weighted control points
  const d: number[][] = [];
  for (let i = 0; i <= degree; i++) {
    const idx = k - degree + i;
    if (idx < 0 || idx >= n) return null;
    const w = weights?.[idx] ?? 1.0;
    d.push([
      controlPoints[idx][0] * w,
      controlPoints[idx][1] * w,
      w,
    ]);
  }

  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const left = knots[k + 1 + j - degree];
      const right = knots[k + 1 + j - r];
      const denom = right - left;
      if (Math.abs(denom) < 1e-12) continue;
      const alpha = (t - left) / denom;
      const prev = j - 1;
      d[j] = [
        (1 - alpha) * d[prev][0] + alpha * d[j][0],
        (1 - alpha) * d[prev][1] + alpha * d[j][1],
        (1 - alpha) * d[prev][2] + alpha * d[j][2],
      ];
    }
  }

  const w = d[degree][2];
  if (Math.abs(w) < 1e-12) return null;
  return [d[degree][0] / w, d[degree][1] / w];
}

const CurveEditor: React.FC<CurveEditorProps> = ({
  curve,
  onChange,
  width,
  height,
  xLabel,
  yLabel,
  xRange,
  yRange,
  symmetric = false,
  color = '#0ea5e9',
  backgroundColor = '#1a1a2e',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [localPoints, setLocalPoints] = useState<number[][]>(curve.controlPoints);

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Coordinate transforms
  const toCanvasX = useCallback(
    (val: number) => padding.left + ((val - xRange[0]) / (xRange[1] - xRange[0])) * plotW,
    [xRange, plotW],
  );
  const toCanvasY = useCallback(
    (val: number) => padding.top + (1 - (val - yRange[0]) / (yRange[1] - yRange[0])) * plotH,
    [yRange, plotH],
  );
  const fromCanvasX = useCallback(
    (px: number) => xRange[0] + ((px - padding.left) / plotW) * (xRange[1] - xRange[0]),
    [xRange, plotW],
  );
  const fromCanvasY = useCallback(
    (py: number) => yRange[0] + (1 - (py - padding.top) / plotH) * (yRange[1] - yRange[0]),
    [yRange, plotH],
  );

  // Sync local points when curve prop changes externally
  useEffect(() => {
    if (dragIndex === null) {
      setLocalPoints(curve.controlPoints);
    }
  }, [curve.controlPoints, dragIndex]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#2a3a5c';
    ctx.lineWidth = 0.5;
    const xStep = niceStep(xRange[1] - xRange[0], 8);
    const yStep = niceStep(yRange[1] - yRange[0], 6);

    for (let x = Math.ceil(xRange[0] / xStep) * xStep; x <= xRange[1]; x += xStep) {
      const cx = toCanvasX(x);
      ctx.beginPath();
      ctx.moveTo(cx, padding.top);
      ctx.lineTo(cx, padding.top + plotH);
      ctx.stroke();
    }
    for (let y = Math.ceil(yRange[0] / yStep) * yStep; y <= yRange[1]; y += yStep) {
      const cy = toCanvasY(y);
      ctx.beginPath();
      ctx.moveTo(padding.left, cy);
      ctx.lineTo(padding.left + plotW, cy);
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = '#8892a4';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let x = Math.ceil(xRange[0] / xStep) * xStep; x <= xRange[1]; x += xStep) {
      ctx.fillText(x.toFixed(0), toCanvasX(x), padding.top + plotH + 16);
    }
    ctx.textAlign = 'right';
    for (let y = Math.ceil(yRange[0] / yStep) * yStep; y <= yRange[1]; y += yStep) {
      ctx.fillText(y.toFixed(1), padding.left - 6, toCanvasY(y) + 4);
    }

    // Axis titles
    ctx.fillStyle = '#8892a4';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    if (xLabel) {
      ctx.fillText(xLabel, padding.left + plotW / 2, height - 4);
    }
    if (yLabel) {
      ctx.save();
      ctx.translate(14, padding.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();
    }

    // Evaluate and draw curve
    const curveForDraw: NURBSCurveData = { ...curve, controlPoints: localPoints };
    const sampledPoints = evaluateCurve(curveForDraw, 200);

    const drawPath = (pts: number[][], strokeColor: string, yMul = 1) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.moveTo(toCanvasX(pts[0][0]), toCanvasY(pts[0][1] * yMul));
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(toCanvasX(pts[i][0]), toCanvasY(pts[i][1] * yMul));
      }
      ctx.stroke();
    };

    drawPath(sampledPoints, color);
    if (symmetric) {
      drawPath(sampledPoints, color, -1);
    }

    // Control polygon
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let i = 0; i < localPoints.length; i++) {
      const cx = toCanvasX(localPoints[i][0]);
      const cy = toCanvasY(localPoints[i][1]);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Control points
    for (let i = 0; i < localPoints.length; i++) {
      const cx = toCanvasX(localPoints[i][0]);
      const cy = toCanvasY(localPoints[i][1]);

      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = dragIndex === i ? '#38bdf8' : color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Plot border
    ctx.strokeStyle = '#2a3a5c';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding.left, padding.top, plotW, plotH);
  }, [
    width, height, localPoints, curve, xRange, yRange, color, backgroundColor,
    symmetric, dragIndex, toCanvasX, toCanvasY, plotW, plotH, xLabel, yLabel,
  ]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    // Find closest control point
    for (let i = 0; i < localPoints.length; i++) {
      const cx = toCanvasX(localPoints[i][0]);
      const cy = toCanvasY(localPoints[i][1]);
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= 12) {
        setDragIndex(i);
        return;
      }
    }
    setDragIndex(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragIndex === null) return;
    const { x, y } = getMousePos(e);
    const newX = Math.max(xRange[0], Math.min(xRange[1], fromCanvasX(x)));
    const newY = Math.max(yRange[0], Math.min(yRange[1], fromCanvasY(y)));
    const newPoints = localPoints.map((p, i) =>
      i === dragIndex ? [newX, newY] : [...p],
    );
    setLocalPoints(newPoints);
  };

  const handleMouseUp = () => {
    if (dragIndex !== null) {
      onChange(localPoints);
      setDragIndex(null);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

/** Compute a nice step size for grid lines */
function niceStep(range: number, maxTicks: number): number {
  const rough = range / maxTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  let nice: number;
  if (norm <= 1.5) nice = 1;
  else if (norm <= 3) nice = 2;
  else if (norm <= 7) nice = 5;
  else nice = 10;
  return nice * mag;
}

export default CurveEditor;
