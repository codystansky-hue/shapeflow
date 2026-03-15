import { create } from 'zustand';
import type { BoardDesignData } from '@shapeflow/shared';

type ActiveEditor = 'outline' | 'rocker' | 'thickness' | 'crossSection';
type ActiveView = 'perspective' | 'top' | 'side' | 'front';

interface UIState {
  activeEditor: ActiveEditor;
  activeView: ActiveView;
  showMeasurements: boolean;
  showGrid: boolean;
  selectedControlPoint: number | null;
  ghostBoard: BoardDesignData | null;

  setActiveEditor: (editor: ActiveEditor) => void;
  setActiveView: (view: ActiveView) => void;
  toggleMeasurements: () => void;
  toggleGrid: () => void;
  setSelectedControlPoint: (index: number | null) => void;
  setGhostBoard: (board: BoardDesignData | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeEditor: 'outline',
  activeView: 'perspective',
  showMeasurements: true,
  showGrid: true,
  selectedControlPoint: null,
  ghostBoard: null,

  setActiveEditor: (editor) => set({ activeEditor: editor }),
  setActiveView: (view) => set({ activeView: view }),
  toggleMeasurements: () => set((s) => ({ showMeasurements: !s.showMeasurements })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  setSelectedControlPoint: (index) => set({ selectedControlPoint: index }),
  setGhostBoard: (board) => set({ ghostBoard: board }),
}));
