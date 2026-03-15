import { create } from 'zustand';

export interface Command {
  execute: () => void;
  undo: () => void;
  description: string;
}

interface UndoState {
  undoStack: Command[];
  redoStack: Command[];
  canUndo: boolean;
  canRedo: boolean;
  execute: (command: Command) => void;
  undo: () => void;
  redo: () => void;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  execute: (command) => {
    command.execute();
    set((state) => ({
      undoStack: [...state.undoStack, command],
      redoStack: [],
      canUndo: true,
      canRedo: false,
    }));
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;

    const command = undoStack[undoStack.length - 1];
    command.undo();

    set((state) => {
      const newUndoStack = state.undoStack.slice(0, -1);
      return {
        undoStack: newUndoStack,
        redoStack: [...state.redoStack, command],
        canUndo: newUndoStack.length > 0,
        canRedo: true,
      };
    });
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;

    const command = redoStack[redoStack.length - 1];
    command.execute();

    set((state) => {
      const newRedoStack = state.redoStack.slice(0, -1);
      return {
        undoStack: [...state.undoStack, command],
        redoStack: newRedoStack,
        canUndo: true,
        canRedo: newRedoStack.length > 0,
      };
    });
  },
}));
