import { create } from 'zustand';
import type { PDFPageData } from '@/types';

interface PDFState {
  fileName: string | null;
  pdfBytes: Uint8Array | null;
  pageCount: number;
  pages: PDFPageData[];
  // Per-page fabric.js JSON snapshots
  canvasStates: Record<number, string>;

  setFile: (name: string, bytes: Uint8Array) => void;
  setPages: (pages: PDFPageData[]) => void;
  setPageCount: (count: number) => void;
  updateCanvasState: (pageIndex: number, json: string) => void;
  reset: () => void;
}

export const usePdfStore = create<PDFState>((set) => ({
  fileName: null,
  pdfBytes: null,
  pageCount: 0,
  pages: [],
  canvasStates: {},

  setFile: (name, bytes) => set({ fileName: name, pdfBytes: bytes }),
  setPages: (pages) => set({ pages, pageCount: pages.length }),
  setPageCount: (count) => set({ pageCount: count }),
  updateCanvasState: (pageIndex, json) =>
    set((state) => ({
      canvasStates: { ...state.canvasStates, [pageIndex]: json },
    })),
  reset: () =>
    set({
      fileName: null,
      pdfBytes: null,
      pageCount: 0,
      pages: [],
      canvasStates: {},
    }),
}));
