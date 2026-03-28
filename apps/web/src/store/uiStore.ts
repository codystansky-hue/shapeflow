import { create } from 'zustand';
import type { BoardDesignData } from '@shapeflow/shared';

type ActiveEditor = 'outline' | 'rocker' | 'thickness' | 'crossSection';
type ActiveView = 'perspective' | 'top' | 'side' | 'front';
type ViewMode = 'design' | '3d' | 'wireframe';

interface UIState {
  activeEditor: ActiveEditor;
  activeView: ActiveView;
  viewMode: ViewMode;
  showMeasurements: boolean;
  showGrid: boolean;
  showWireframe: boolean;
  selectedControlPoint: number | null;
  ghostBoard: BoardDesignData | null;
  /** Position along board (0=tail, 1=nose) for the interactive guideline */
  guidelinePosition: number;
  /** Whether snap-to-grid is enabled in editors */
  snapToGrid: boolean;
  /** Whether curvature combs are shown */
  showCurvature: boolean;

  setActiveEditor: (editor: ActiveEditor) => void;
  setActiveView: (view: ActiveView) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleMeasurements: () => void;
  toggleGrid: () => void;
  toggleWireframe: () => void;
  setSelectedControlPoint: (index: number | null) => void;
  setGhostBoard: (board: BoardDesignData | null) => void;
  setGuidelinePosition: (t: number) => void;
  toggleSnapToGrid: () => void;
  toggleCurvature: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeEditor: 'outline',
  activeView: 'perspective',
  viewMode: 'design',
  showMeasurements: true,
  showGrid: true,
  showWireframe: false,
  selectedControlPoint: null,
  ghostBoard: null,
  guidelinePosition: 0.5,
  snapToGrid: false,
  showCurvature: false,

  setActiveEditor: (editor) => set({ activeEditor: editor }),
  setActiveView: (view) => set({ activeView: view }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleMeasurements: () => set((s) => ({ showMeasurements: !s.showMeasurements })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleWireframe: () => set((s) => ({ showWireframe: !s.showWireframe })),
  setSelectedControlPoint: (index) => set({ selectedControlPoint: index }),
  setGhostBoard: (board) => set({ ghostBoard: board }),
  setGuidelinePosition: (t) => set({ guidelinePosition: Math.max(0, Math.min(1, t)) }),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  toggleCurvature: () => set((s) => ({ showCurvature: !s.showCurvature })),
}));
