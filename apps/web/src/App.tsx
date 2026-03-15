import React, { useEffect } from 'react';
import { useBoardStore } from '@/store/boardStore';
import { useUndoStore } from '@/store/undoStore';
import { useUIStore } from '@/store/uiStore';
import OutlineEditor from '@/components/editors/OutlineEditor';
import RockerEditor from '@/components/editors/RockerEditor';
import ThicknessEditor from '@/components/editors/ThicknessEditor';
import CrossSectionEditor from '@/components/editors/CrossSectionEditor';
import Viewport3D from '@/components/viewport/Viewport3D';
import MeasurementsPanel from '@/components/panels/MeasurementsPanel';
import PropertiesPanel from '@/components/panels/PropertiesPanel';
import shortboardTemplate from '@/templates/shortboard.json';
import fishTemplate from '@/templates/fish.json';
import longboardTemplate from '@/templates/longboard.json';
import supTemplate from '@/templates/sup.json';
import type { BoardDesignData } from '@shapeflow/shared';

const templateMap: Record<string, { data: BoardDesignData; label: string; type: string }> = {
  shortboard: { data: shortboardTemplate as BoardDesignData, label: 'Shortboard', type: 'shortboard' },
  fish: { data: fishTemplate as BoardDesignData, label: 'Fish', type: 'fish' },
  longboard: { data: longboardTemplate as BoardDesignData, label: 'Longboard', type: 'longboard' },
  sup: { data: supTemplate as BoardDesignData, label: 'SUP', type: 'sup' },
};

const editorTabs = [
  { key: 'outline' as const, label: 'Outline' },
  { key: 'rocker' as const, label: 'Rocker' },
  { key: 'thickness' as const, label: 'Thickness' },
  { key: 'crossSection' as const, label: 'Cross Section' },
];

const viewButtons = [
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

  const activeEditor = useUIStore((s) => s.activeEditor);
  const setActiveEditor = useUIStore((s) => s.setActiveEditor);
  const activeView = useUIStore((s) => s.activeView);
  const setActiveView = useUIStore((s) => s.setActiveView);

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

  const renderEditor = () => {
    switch (activeEditor) {
      case 'outline':
        return <OutlineEditor />;
      case 'rocker':
        return <RockerEditor />;
      case 'thickness':
        return <ThicknessEditor />;
      case 'crossSection':
        return <CrossSectionEditor />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo / Title */}
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
          {/* View buttons */}
          <div className="flex rounded-md overflow-hidden border border-[var(--border)]">
            {viewButtons.map((v) => (
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
        {/* Left Sidebar - Editor */}
        <aside className="w-[520px] shrink-0 flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)] overflow-hidden">
          {/* Editor Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {editorTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveEditor(tab.key)}
                className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${
                  activeEditor === tab.key
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--bg-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Editor */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderEditor()}
          </div>
        </aside>

        {/* Center - 3D Viewport */}
        <main className="flex-1 overflow-hidden">
          <Viewport3D />
        </main>

        {/* Right Sidebar - Panels */}
        <aside className="w-[260px] shrink-0 flex flex-col bg-[var(--bg-panel)] border-l border-[var(--border)] overflow-y-auto">
          <MeasurementsPanel />
          <div className="border-t border-[var(--border)]" />
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
};

export default App;
