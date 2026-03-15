import { create } from 'zustand';
import type {
  BoardDesignData,
  BoardType,
  NURBSCurveData,
  FinPlugData,
} from '@shapeflow/shared';

interface BoardMeta {
  id?: string;
  name: string;
  boardType: BoardType;
}

interface BoardState {
  design: BoardDesignData | null;
  isDirty: boolean;
  boardMeta: BoardMeta | null;

  // Actions
  loadDesign: (data: BoardDesignData, meta?: BoardMeta) => void;
  updateOutline: (controlPoints: number[][]) => void;
  updateRocker: (controlPoints: number[][]) => void;
  updateDeckRocker: (controlPoints: number[][]) => void;
  updateThickness: (controlPoints: number[][]) => void;
  updateCrossSection: (index: number, curve: NURBSCurveData) => void;
  updateDimensions: (dims: Partial<{ length: number; width: number; thickness: number }>) => void;
  updateFins: (fins: FinPlugData[]) => void;
  setName: (name: string) => void;
  setBoardType: (type: BoardType) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  design: null,
  isDirty: false,
  boardMeta: null,

  loadDesign: (data, meta) =>
    set({
      design: data,
      isDirty: false,
      boardMeta: meta ?? null,
    }),

  updateOutline: (controlPoints) =>
    set((state) => {
      if (!state.design) return state;
      return {
        design: {
          ...state.design,
          outline: { ...state.design.outline, controlPoints },
        },
        isDirty: true,
      };
    }),

  updateRocker: (controlPoints) =>
    set((state) => {
      if (!state.design) return state;
      return {
        design: {
          ...state.design,
          rocker: { ...state.design.rocker, controlPoints },
        },
        isDirty: true,
      };
    }),

  updateDeckRocker: (controlPoints) =>
    set((state) => {
      if (!state.design) return state;
      return {
        design: {
          ...state.design,
          deckRocker: { ...state.design.deckRocker, controlPoints },
        },
        isDirty: true,
      };
    }),

  updateThickness: (controlPoints) =>
    set((state) => {
      if (!state.design) return state;
      return {
        design: {
          ...state.design,
          thickness: { ...state.design.thickness, controlPoints },
        },
        isDirty: true,
      };
    }),

  updateCrossSection: (index, curve) =>
    set((state) => {
      if (!state.design) return state;
      const crossSections = [...state.design.crossSections];
      if (index >= 0 && index < crossSections.length) {
        crossSections[index] = { ...crossSections[index], curve };
      }
      return {
        design: { ...state.design, crossSections },
        isDirty: true,
      };
    }),

  updateDimensions: (dims) =>
    set((state) => {
      if (!state.design) return state;
      return {
        design: {
          ...state.design,
          dimensions: { ...state.design.dimensions, ...dims },
        },
        isDirty: true,
      };
    }),

  updateFins: (fins) =>
    set((state) => {
      if (!state.design) return state;
      return {
        design: { ...state.design, fins },
        isDirty: true,
      };
    }),

  setName: (name) =>
    set((state) => ({
      boardMeta: state.boardMeta ? { ...state.boardMeta, name } : { name, boardType: 'shortboard' },
    })),

  setBoardType: (boardType) =>
    set((state) => ({
      boardMeta: state.boardMeta
        ? { ...state.boardMeta, boardType }
        : { name: 'Untitled', boardType },
    })),
}));
