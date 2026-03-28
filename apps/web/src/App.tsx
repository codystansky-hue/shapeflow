import React, { useEffect, Suspense, lazy } from 'react';
import { useBoardStore } from '@/store/boardStore';
import { useUndoStore } from '@/store/undoStore';
import { useUIStore } from '@/store/uiStore';
import Viewport3D from '@/components/viewport/Viewport3D';
import MeasurementsPanel from '@/components/panels/MeasurementsPanel';
import PropertiesPanel from '@/components/panels/PropertiesPanel';
import DesignWorkspace from '@/components/workspace/DesignWorkspace';
import shortboardTemplate from '@/templates/shortboard.json';
import fishTemplate from '@/templates/fish.json';
import longboardTemplate from '@/templates/longboard.json';
import supTemplate from '@/templates/sup.json';
import type { BoardDesignData } from '@shapeflow/shared';

const BoardPreview3D = lazy(() => import('@/components/viewport/BoardPreview3D'));

const templateMap: Record<string, { data: BoardDesignData; label: string; type: string }> = {
  shortboard: { data: shortboardTemplate as BoardDesignData, label: 'Shortboard', type: 'shortboard' },
  fish: { data: fishTemplate as BoardDesignData, label: 'Fish', type: 'fish' },
  longboard: { data: longboardTemplate as BoardDesignData, label: 'Longboard', type: 'longboard' },
  sup: { data: supTemplate as BoardDesignData, label: 'SUP', type: 'sup' },
};

const viewModes = [
  { key: 'design' as const, label: 'Design' },
  { key: '3d' as const, label: '3D' },
  { key: 'wireframe' as const, label: 'Wire' },
];

const viewButtons3D = [
  { key: 'perspective' as const, label: '3D' },
  { key: 'top' as const, label: 'Top' },
  { key: 'side' as const, label: 'Side' },
  { key: 'front' as const, label: 'Front' },
];

const templates = Object.entries(templateMap).map(([key, val]) => ({
  key,
  label: val.label,
}));

const App: React.FC = () => {
  const loadDesign = useBoardStore((s) => s.loadDesign);
  const isDirty = useBoardStore((s) => s.isDirty);
  const boardMeta = useBoardStore((s) => s.boardMeta);

  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const activeView = useUIStore((s) => s.activeView);
  const setActiveView = useUIStore((s) => s.setActiveView);
  const snapToGrid = useUIStore((s) => s.snapToGrid);
  const toggleSnapToGrid = useUIStore((s) => s.toggleSnapToGrid);
  const showCurvature = useUIStore((s) => s.showCurvature);
  const toggleCurvature = useUIStore((s) => s.toggleCurvature);

  const undo = useUndoStore((s) => s.undo);
  const redo = useUndoStore((s) => s.redo);
  const canUndo = useUndoStore((s) => s.canUndo);
  const canRedo = useUndoStore((s) => s.canRedo);

  // Load default template on mount
  useEffect(() => {
    loadDesign(shortboardTemplate as BoardDesignData, {
      name: 'My Shortboard',
      boardType: 'shortboard',
    });
  }, [loadDesign]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tmpl = templateMap[e.target.value];
    if (tmpl) {
      loadDesign(tmpl.data, {
        name: `My ${tmpl.label}`,
        boardType: tmpl.type as import('@shapeflow/shared').BoardType,
      });
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">
              SF
            </div>
            <span className="text-base font-semibold tracking-tight">ShapeFlow</span>
            {isDirty && (
              <span className="text-[10px] text-[var(--text-secondary)] ml-1">*unsaved</span>
            )}
          </div>

          {/* Template Selector */}
          <select
            onChange={handleTemplateChange}
            defaultValue="shortboard"
            className="bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Board name */}
          {boardMeta && (
            <span className="text-sm text-[var(--text-secondary)]">{boardMeta.name}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* View mode tabs */}
          <div className="flex rounded-md overflow-hidden border border-[var(--border)]">
            {viewModes.map((m) => (
              <button
                key={m.key}
                onClick={() => setViewMode(m.key)}
                className={`px-3 py-1 text-xs transition-colors ${
                  viewMode === m.key
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* 3D view camera buttons (only in 3D mode) */}
          {viewMode === '3d' && (
            <div className="flex rounded-md overflow-hidden border border-[var(--border)]">
              {viewButtons3D.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setActiveView(v.key)}
                  className={`px-3 py-1 text-xs transition-colors ${
                    activeView === v.key
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}

          {/* Design mode tools */}
          {viewMode === 'design' && (
            <div className="flex items-center gap-1">
              <button
                onClick={toggleSnapToGrid}
                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                  snapToGrid
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--border)]'
                }`}
                title="Snap to grid"
              >
                Snap
              </button>
              <button
                onClick={toggleCurvature}
                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                  showCurvature
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--border)]'
                }`}
                title="Show curvature comb"
              >
                Curvature
              </button>
            </div>
          )}

          {/* Undo / Redo */}
          <div className="flex gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="px-2 py-1 text-xs rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="px-2 py-1 text-xs rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center - Main View */}
        <main className="flex-1 overflow-hidden">
          {viewMode === 'design' ? (
            <DesignWorkspace />
          ) : viewMode === 'wireframe' ? (
            <Suspense fallback={<div className="w-full h-full bg-[var(--bg-primary)]" />}>
              <BoardPreview3D />
            </Suspense>
          ) : (
            <Viewport3D />
          )}
        </main>

        {/* Right Sidebar - Panels */}
        <aside className="w-[240px] shrink-0 flex flex-col bg-[var(--bg-panel)] border-l border-[var(--border)] overflow-y-auto">
          <MeasurementsPanel />
          <div className="border-t border-[var(--border)]" />
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
};

export default App;
