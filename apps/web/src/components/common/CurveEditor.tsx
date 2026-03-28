import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import type { NURBSCurveData } from '@shapeflow/shared';
import { useUIStore } from '@/store/uiStore';

interface CurveEditorProps {
  curve: NURBSCurveData;
  onChange: (points: number[][]) => void;
  /** Fixed width — if omitted, auto-sizes to container */
  width?: number;
  /** Fixed height — if omitted, auto-sizes to container */
  height?: number;
  xLabel?: string;
  yLabel?: string;
  xRange: [number, number];
  yRange: [number, number];
  symmetric?: boolean;
  color?: string;
  backgroundColor?: string;
  /** Show the interactive guideline at guidelinePosition */
  showGuideline?: boolean;
  /** Allow dragging the guideline */
  guidelineAxis?: 'x' | 'y';
  /** Minimum height when auto-sizing */
  minHeight?: number;
}

/** Evaluate a NURBS curve at parameter t using De Boor's algorithm */
function evaluateCurve(curve: NURBSCurveData, numSamples: number): number[][] {
  const { controlPoints, degree, knots, weights } = curve;
  const n = controlPoints.length;
  if (n === 0) return [];

  const points: number[][] = [];
  const tMin = knots[degree];
  const tMax = knots[n];

  for (let i = 0; i <= numSamples; i++) {
    const t = tMin + (i / numSamples) * (tMax - tMin);
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

  let k = degree;
  for (let i = degree; i < n; i++) {
    if (t >= knots[i] && t <= knots[i + 1]) {
      k = i;
      break;
    }
  }

  const d: number[][] = [];
  for (let i = 0; i <= degree; i++) {
    const idx = k - degree + i;
    if (idx < 0 || idx >= n) return null;
    const w = weights?.[idx] ?? 1.0;
    d.push([controlPoints[idx][0] * w, controlPoints[idx][1] * w, w]);
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

/** Compute curvature at each sampled point using finite differences */
function computeCurvature(points: number[][]): number[] {
  const curvatures: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0 || i === points.length - 1) {
      curvatures.push(0);
      continue;
    }
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];

    const dx1 = x1 - x0, dy1 = y1 - y0;
    const dx2 = x2 - x1, dy2 = y2 - y1;
    const cross = dx1 * dy2 - dy1 * dx2;
    const ds1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const ds2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const ds = (ds1 + ds2) / 2;
    curvatures.push(ds > 1e-10 ? cross / (ds * ds * ds) : 0);
  }
  return curvatures;
}

const CurveEditor: React.FC<CurveEditorProps> = ({
  curve,
  onChange,
  width: fixedWidth,
  height: fixedHeight,
  xLabel,
  yLabel,
  xRange,
  yRange,
  symmetric = false,
  color = '#0ea5e9',
  backgroundColor = '#1a1a2e',
  showGuideline = false,
  guidelineAxis = 'x',
  minHeight = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [draggingGuideline, setDraggingGuideline] = useState(false);
  const [localPoints, setLocalPoints] = useState<number[][]>(curve.controlPoints);
  const [size, setSize] = useState({ width: fixedWidth ?? 480, height: fixedHeight ?? 300 });

  const guidelinePosition = useUIStore((s) => s.guidelinePosition);
  const setGuidelinePosition = useUIStore((s) => s.setGuidelinePosition);
  const snapToGrid = useUIStore((s) => s.snapToGrid);
  const showCurvature = useUIStore((s) => s.showCurvature);

  const width = fixedWidth ?? size.width;
  const height = fixedHeight ?? Math.max(minHeight, size.height);

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Auto-size to container
  useLayoutEffect(() => {
    if (fixedWidth && fixedHeight) return;
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: fixedWidth ?? Math.floor(entry.contentRect.width),
          height: fixedHeight ?? Math.max(minHeight, Math.floor(entry.contentRect.height)),
        });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [fixedWidth, fixedHeight, minHeight]);

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
    if (!canvas || plotW <= 0 || plotH <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#2a3a5c';
    ctx.lineWidth = 0.5;
    const xStep = niceStep(xRange[1] - xRange[0], Math.max(4, Math.floor(plotW / 80)));
    const yStep = niceStep(yRange[1] - yRange[0], Math.max(3, Math.floor(plotH / 60)));

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
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let x = Math.ceil(xRange[0] / xStep) * xStep; x <= xRange[1]; x += xStep) {
      const label = xStep < 1 ? x.toFixed(Math.max(0, -Math.floor(Math.log10(xStep)))) : x.toFixed(0);
      ctx.fillText(label, toCanvasX(x), padding.top + plotH + 14);
    }
    ctx.textAlign = 'right';
    for (let y = Math.ceil(yRange[0] / yStep) * yStep; y <= yRange[1]; y += yStep) {
      const label = yStep < 1 ? y.toFixed(Math.max(0, -Math.floor(Math.log10(yStep)))) : y.toFixed(0);
      ctx.fillText(label, padding.left - 6, toCanvasY(y) + 4);
    }

    // Axis titles
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    if (xLabel) {
      ctx.fillText(xLabel, padding.left + plotW / 2, height - 4);
    }
    if (yLabel) {
      ctx.save();
      ctx.translate(12, padding.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();
    }

    // Evaluate curve
    const numSamples = Math.max(200, Math.min(600, plotW * 2));
    const curveForDraw: NURBSCurveData = { ...curve, controlPoints: localPoints };
    const sampledPoints = evaluateCurve(curveForDraw, numSamples);

    // Curvature comb
    if (showCurvature && sampledPoints.length > 2) {
      const curvatures = computeCurvature(sampledPoints);
      const maxK = Math.max(...curvatures.map(Math.abs), 1e-6);
      const combScale = plotH * 0.15 / maxK;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < sampledPoints.length; i++) {
        const px = toCanvasX(sampledPoints[i][0]);
        const py = toCanvasY(sampledPoints[i][1]);
        const k = curvatures[i];
        const ny = py - k * combScale;
        if (i === 0) ctx.moveTo(px, ny);
        else ctx.lineTo(px, ny);
      }
      ctx.stroke();

      // Teeth
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
      ctx.lineWidth = 0.5;
      const step = Math.max(1, Math.floor(sampledPoints.length / 60));
      for (let i = 0; i < sampledPoints.length; i += step) {
        const px = toCanvasX(sampledPoints[i][0]);
        const py = toCanvasY(sampledPoints[i][1]);
        const k = curvatures[i];
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py - k * combScale);
        ctx.stroke();
      }
    }

    // Draw curve path
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
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
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

      const isActive = dragIndex === i;
      const isHovered = hoverIndex === i && dragIndex === null;
      const radius = isActive ? 7 : isHovered ? 6.5 : 5;

      // Outer glow for active/hovered
      if (isActive || isHovered) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(125, 211, 252, 0.15)';
        ctx.fill();
      }

      // Point circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#38bdf8' : isHovered ? '#7dd3fc' : color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = isActive || isHovered ? 2 : 1.5;
      ctx.stroke();

      // Point index label
      ctx.font = '9px monospace';
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'left';
      ctx.fillText(String(i), cx + radius + 4, cy - 4);
    }

    // Interactive guideline
    if (showGuideline) {
      const guideVal = guidelinePosition;
      if (guidelineAxis === 'x' && guideVal >= xRange[0] && guideVal <= xRange[1]) {
        const gx = toCanvasX(guideVal);
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.moveTo(gx, padding.top);
        ctx.lineTo(gx, padding.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draggable handle at top
        ctx.beginPath();
        ctx.fillStyle = '#ef4444';
        const hx = gx, hy = padding.top - 2;
        ctx.moveTo(hx - 6, hy - 10);
        ctx.lineTo(hx + 6, hy - 10);
        ctx.lineTo(hx, hy);
        ctx.closePath();
        ctx.fill();

        // Position label
        ctx.font = '9px monospace';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText(`${(guideVal * 100).toFixed(0)}%`, gx, padding.top - 14);

        // Show curve value at guideline
        const curveAtGuide = deBoor(guideVal, curve.degree, localPoints, curve.knots, curve.weights);
        if (curveAtGuide) {
          const gy = toCanvasY(curveAtGuide[1]);
          ctx.beginPath();
          ctx.arc(gx, gy, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // Coordinate readout tooltip
    const activeIdx = dragIndex ?? hoverIndex;
    if (activeIdx !== null) {
      const pt = localPoints[activeIdx];
      const label = `P${activeIdx}: (${pt[0].toFixed(3)}, ${pt[1].toFixed(3)})`;
      const tx = toCanvasX(pt[0]) + 16;
      const ty = toCanvasY(pt[1]) - 16;
      ctx.font = '11px Inter, monospace';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(tx - 6, ty - 14, tw + 12, 20, 4);
      } else {
        ctx.rect(tx - 6, ty - 14, tw + 12, 20);
      }
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      ctx.fillText(label, tx, ty);
    }

    // Plot border
    ctx.strokeStyle = '#2a3a5c';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding.left, padding.top, plotW, plotH);
  }, [
    width, height, localPoints, curve, xRange, yRange, color, backgroundColor,
    symmetric, dragIndex, hoverIndex, toCanvasX, toCanvasY, plotW, plotH, xLabel, yLabel,
    showGuideline, guidelinePosition, guidelineAxis, showCurvature,
  ]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (e.clientX - rect.left) * (width / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);

    // Check guideline handle hit
    if (showGuideline && guidelineAxis === 'x') {
      const gx = toCanvasX(guidelinePosition);
      if (Math.abs(x - gx) < 10 && y < padding.top + 10) {
        setDraggingGuideline(true);
        return;
      }
      // Also allow clicking on the guideline line itself
      if (Math.abs(x - gx) < 6 && y >= padding.top && y <= padding.top + plotH) {
        setDraggingGuideline(true);
        return;
      }
    }

    // Find closest control point (increased hit radius to 16px)
    for (let i = 0; i < localPoints.length; i++) {
      const cx = toCanvasX(localPoints[i][0]);
      const cy = toCanvasY(localPoints[i][1]);
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= 16) {
        setDragIndex(i);
        return;
      }
    }
    setDragIndex(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);

    if (draggingGuideline) {
      const val = fromCanvasX(x);
      setGuidelinePosition(val);
      return;
    }

    if (dragIndex !== null) {
      let newX = fromCanvasX(x);
      let newY = fromCanvasY(y);

      // Snap to grid
      if (snapToGrid) {
        const xStep = niceStep(xRange[1] - xRange[0], Math.max(4, Math.floor(plotW / 80)));
        const yStep = niceStep(yRange[1] - yRange[0], Math.max(3, Math.floor(plotH / 60)));
        newX = Math.round(newX / xStep) * xStep;
        newY = Math.round(newY / yStep) * yStep;
      }

      newX = Math.max(xRange[0], Math.min(xRange[1], newX));
      newY = Math.max(yRange[0], Math.min(yRange[1], newY));

      const newPoints = localPoints.map((p, i) =>
        i === dragIndex ? [newX, newY] : [...p],
      );
      setLocalPoints(newPoints);
      return;
    }

    // Hover detection (increased to 16px)
    let found: number | null = null;
    for (let i = 0; i < localPoints.length; i++) {
      const cx = toCanvasX(localPoints[i][0]);
      const cy = toCanvasY(localPoints[i][1]);
      if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= 16) {
        found = i;
        break;
      }
    }
    setHoverIndex(found);
  };

  const handleMouseUp = () => {
    if (draggingGuideline) {
      setDraggingGuideline(false);
      return;
    }
    if (dragIndex !== null) {
      onChange(localPoints);
      setDragIndex(null);
    }
    setHoverIndex(null);
  };

  const cursorStyle =
    draggingGuideline ? 'col-resize' :
    dragIndex !== null ? 'grabbing' :
    hoverIndex !== null ? 'grab' : 'crosshair';

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={fixedWidth && fixedHeight ? { width: fixedWidth, height: fixedHeight } : undefined}
    >
      <canvas
        ref={canvasRef}
        style={{
          cursor: cursorStyle,
          width: width,
          height: height,
          display: 'block',
        }}
        className="rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
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
