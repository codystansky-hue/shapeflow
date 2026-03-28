'use client';
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useBoardStore } from '@/store/boardStore';
import { BoardModel } from '@/core/parametric/BoardModel';

interface Point3D { x: number; y: number; z: number }

const VIEW_PRESETS = {
  iso:   { az: 0.8, el: 0.3, label: '3D' },
  top:   { az: 0, el: -Math.PI / 2, label: 'Top' },
  side:  { az: 0, el: 0, label: 'Side' },
  front: { az: Math.PI / 2, el: 0, label: 'Front' },
} as const;

function project(
  p: Point3D, az: number, el: number,
  scale: number, cx: number, cy: number, refSize: number,
): { x: number; y: number } {
  const cosA = Math.cos(az), sinA = Math.sin(az);
  const cosE = Math.cos(el), sinE = Math.sin(el);
  const x1 =  cosA * p.x + sinA * p.y;
  const z1 = -sinA * p.x + cosA * p.y;
  const y1 =  cosE * p.z - sinE * z1;
  const z2 =  sinE * p.z + cosE * z1;
  const fov = refSize * 3;
  const d = fov / (fov + z2 + refSize);
  return { x: cx + x1 * d * scale, y: cy - y1 * d * scale };
}

const clamp = (min: number, max: number, val: number) => Math.max(min, Math.min(max, val));

const BoardPreview3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { design } = useBoardStore();
  
  const [azimuth, setAzimuth] = useState<number>(VIEW_PRESETS.iso.az);
  const [elevation, setElevation] = useState<number>(VIEW_PRESETS.iso.el);
  const [zoom, setZoom] = useState<number>(1.2);
  const [isDragging, setIsDragging] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const sections = useMemo(() => {
    if (!design) return null;
    const model = BoardModel.fromDesignData(design);
    const N = 40, RING = 32, half = RING / 2;
    const cx = model.length / 2;
    const result: { ring: Point3D[]; t: number }[] = [];

    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = t * model.length - cx;  // center on origin
      const rocker = model.getRockerAt(t);
      const halfSection = model.getCrossSectionAt(t, half);
      const ring: Point3D[] = [];
      // Right side
      for (let j = 0; j < half; j++)
        ring.push({ x, y: halfSection[j][0], z: halfSection[j][1] + rocker });
      // Left side (mirrored)
      for (let j = half - 1; j >= 0; j--)
        ring.push({ x, y: -halfSection[j][0], z: halfSection[j][1] + rocker });
      
      result.push({ ring, t });
    }
    return result;
  }, [design]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sections || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = rect.width;
    const H = rect.height;
    
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const cx = W / 2;
    const cy = H / 2;
    const refSize = Math.min(W, H) * 0.8;
    const scale = (refSize / (sections[sections.length-1].ring[0].x * 2)) * zoom;

    // 1. Clear + fill dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    const proj = (p: Point3D) => project(p, azimuth, elevation, scale, cx, cy, refSize);

    // 2. Cross-section outlines every 4th station + nose/tail
    sections.forEach((s, i) => {
      const isMajor = i % 4 === 0 || i === 0 || i === sections.length - 1;
      if (!isMajor) return;

      ctx.beginPath();
      ctx.strokeStyle = '#3a4a6c';
      ctx.lineWidth = 1;
      const p0 = proj(s.ring[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let j = 1; j < s.ring.length; j++) {
        const p = proj(s.ring[j]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
    });

    // 3. Rail lines (widest points)
    const RING = sections[0].ring.length;
    const half = RING / 2;
    const railIdx = Math.floor(half / 2); // Approximation of rail point

    const drawSpanLine = (idx: number, color: string, width: number) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      const p0 = proj(sections[0].ring[idx]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < sections.length; i++) {
        const p = proj(sections[i].ring[idx]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    };

    drawSpanLine(railIdx, '#0ea5e9', 1.5); // Right rail
    drawSpanLine(RING - railIdx, '#0ea5e9', 1.5); // Left rail

    // 4. Stringer line (deck center)
    drawSpanLine(0, '#374151', 1);

    // 5. Tail highlight (station 0) and Nose highlight (last station)
    const drawHighlight = (idx: number, color: string) => {
      const s = sections[idx];
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      const p0 = proj(s.ring[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let j = 1; j < s.ring.length; j++) {
        const p = proj(s.ring[j]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
    };

    drawHighlight(0, '#6366f1'); // Tail
    drawHighlight(sections.length - 1, '#22d3ee'); // Nose

    // 6. Axis gizmo
    const gizmoSize = 40;
    const gx = 60, gy = H - 60;
    const axes = [
      { p: { x: 1, y: 0, z: 0 }, color: '#ef4444', label: 'X' },
      { p: { x: 0, y: 1, z: 0 }, color: '#22c55e', label: 'Y' },
      { p: { x: 0, y: 0, z: 1 }, color: '#3b82f6', label: 'Z' },
    ];

    axes.forEach(a => {
      const p = project(
        { x: a.p.x * gizmoSize, y: a.p.y * gizmoSize, z: a.p.z * gizmoSize },
        azimuth, elevation, 1, gx, gy, 1000
      );
      ctx.beginPath();
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 2;
      ctx.moveTo(gx, gy);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      
      ctx.fillStyle = a.color;
      ctx.font = 'bold 10px Inter';
      ctx.fillText(a.label, p.x + 4, p.y + 4);
    });

    // 7. Hint text
    ctx.fillStyle = '#4b5563';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('drag to rotate · scroll to zoom', W / 2, H - 20);

  }, [sections, azimuth, elevation, zoom]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setAzimuth(a => a + dx * 0.005);
    setElevation(e_val => clamp(-1.5, 1.5, e_val + dy * 0.005));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    setZoom(z => clamp(0.15, 8, z * Math.pow(0.999, e.deltaY)));
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#1a1a2e]">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-move"
      />
      
      <div className="absolute top-3 right-3 flex rounded-md overflow-hidden border border-[var(--border)]">
        {Object.entries(VIEW_PRESETS).map(([key, v]) => (
          <button
            key={key}
            onClick={() => { setAzimuth(v.az); setElevation(v.el); }}
            className="px-3 py-1 text-xs bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BoardPreview3D;