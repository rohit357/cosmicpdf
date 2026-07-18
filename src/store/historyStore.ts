import { create } from 'zustand';

interface HistorySnapshot {
  pageIndex: number;
  canvasJSON: string;
  timestamp: number;
}

interface HistoryState {
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  maxHistory: number;

  pushSnapshot: (pageIndex: number, canvasJSON: string) => void;
  undo: () => HistorySnapshot | null;
  redo: () => HistorySnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxHistory: 50,

  pushSnapshot: (pageIndex, canvasJSON) =>
    set((state) => {
      const snapshot: HistorySnapshot = {
        pageIndex,
        canvasJSON,
        timestamp: Date.now(),
      };
      const newStack = [...state.undoStack, snapshot];
      if (newStack.length > state.maxHistory) {
        newStack.shift();
      }
      return { undoStack: newStack, redoStack: [] };
    }),

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;
    const snapshot = state.undoStack[state.undoStack.length - 1];
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, snapshot],
    });
    return snapshot;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;
    const snapshot = state.redoStack[state.redoStack.length - 1];
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, snapshot],
    });
    return snapshot;
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clear: () => set({ undoStack: [], redoStack: [] }),
}));
