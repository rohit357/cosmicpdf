import { create } from 'zustand';
import type { PDFPageData } from '@/types';

/**
 * Release any blob object URLs held by rendered pages. Page images are created
 * with URL.createObjectURL (see the PDF renderer); revoking them frees the
 * underlying binary when the document is replaced or reset. Data URLs and other
 * schemes are ignored.
 */
function revokePageURLs(pages: PDFPageData[]): void {
  for (const page of pages) {
    if (page.imageDataUrl?.startsWith('blob:')) URL.revokeObjectURL(page.imageDataUrl);
    if (page.thumbnailDataUrl?.startsWith('blob:')) URL.revokeObjectURL(page.thumbnailDataUrl);
  }
}

interface PDFState {
  fileName: string | null;
  pdfBytes: Uint8Array | null;
  pageCount: number;
  pages: PDFPageData[];
  // Per-page fabric.js JSON snapshots
  canvasStates: Record<number, string>;

  setFile: (name: string, bytes: Uint8Array) => void;
  setPages: (pages: PDFPageData[]) => void;
  addPage: (page: PDFPageData) => void;
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
  setPages: (pages) =>
    set((state) => {
      // Replacing the page set: release URLs from the pages being discarded.
      revokePageURLs(state.pages);
      return { pages, pageCount: pages.length };
    }),
  // Append a single rendered page (used by progressive rendering).
  addPage: (page) =>
    set((state) => {
      const pages = [...state.pages, page];
      return { pages, pageCount: pages.length };
    }),
  setPageCount: (count) => set({ pageCount: count }),
  updateCanvasState: (pageIndex, json) =>
    set((state) => ({
      canvasStates: { ...state.canvasStates, [pageIndex]: json },
    })),
  reset: () =>
    set((state) => {
      revokePageURLs(state.pages);
      return {
        fileName: null,
        pdfBytes: null,
        pageCount: 0,
        pages: [],
        canvasStates: {},
      };
    }),
}));
