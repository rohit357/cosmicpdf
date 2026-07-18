// ==========================================
// COSMIC PDF - PDF Renderer (pdfjs-dist)
// Renders PDF pages to canvas images, client-side only
// ==========================================

import type { PDFPageData } from '@/types';

/**
 * Scale used when rasterizing PDF pages for the editor canvas.
 * Rendered pixel dimensions = PDF point dimensions * this scale.
 */
export const DEFAULT_RENDER_SCALE = 2;

let pdfjsLib: typeof import('pdfjs-dist') | null = null;
let initPromise: Promise<typeof import('pdfjs-dist')> | null = null;

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const pdfjs = await import('pdfjs-dist');
    // Set worker source - the v4-compatible worker file is in /public
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    pdfjsLib = pdfjs;
    return pdfjs;
  })();

  return initPromise;
}

function renderPageToCanvas(
  page: import('pdfjs-dist').PDFPageProxy,
  canvas: HTMLCanvasElement,
  viewport: import('pdfjs-dist').PageViewport
): Promise<void> {
  const ctx = canvas.getContext('2d')!;
  return page.render({
    canvasContext: ctx,
    viewport,
  }).promise;
}

/**
 * Convert a canvas to an object URL (blob:) instead of a base64 data URL.
 * Blob URLs keep the image as binary rather than a ~33%-larger base64 string
 * held in JS memory, and can be released with URL.revokeObjectURL when no
 * longer needed. Callers own the returned URL and must revoke it.
 */
function canvasToObjectURL(
  canvas: HTMLCanvasElement,
  type: string = 'image/png',
  quality?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }
        resolve(URL.createObjectURL(blob));
      },
      type,
      quality
    );
  });
}

/**
 * Render every page of a PDF one at a time, invoking `onPage` as each page
 * finishes. The pdf.js document is opened once and reused for all pages, and
 * destroyed when done. This lets the editor show the first page immediately
 * while the rest render in the background.
 *
 * Page images are returned as blob object URLs; the caller owns them and is
 * responsible for revoking them (see the PDF store).
 */
export async function renderPDFProgressive(
  pdfBytes: ArrayBuffer,
  options: {
    onPage: (page: PDFPageData, total: number) => void | Promise<void>;
    scale?: number;
    thumbnailScale?: number;
  }
): Promise<void> {
  const pdfjs = await getPdfjs();
  const scale = options.scale ?? DEFAULT_RENDER_SCALE;
  const thumbScale = options.thumbnailScale ?? 0.3;

  // Create a fresh copy to avoid detached/shared buffer issues
  const bytesCopy = new Uint8Array(pdfBytes).slice();
  const doc = await pdfjs.getDocument({ data: bytesCopy }).promise;

  try {
    for (let i = 0; i < doc.numPages; i++) {
      const page = await doc.getPage(i + 1); // pdfjs is 1-indexed
      const viewport = page.getViewport({ scale });
      const thumbViewport = page.getViewport({ scale: thumbScale });

      // Render full-size page
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await renderPageToCanvas(page, canvas, viewport);
      const imageDataUrl = await canvasToObjectURL(canvas);

      // Render thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = thumbViewport.width;
      thumbCanvas.height = thumbViewport.height;
      await renderPageToCanvas(page, thumbCanvas, thumbViewport);
      const thumbnailDataUrl = await canvasToObjectURL(thumbCanvas);

      page.cleanup();

      await options.onPage(
        {
          pageIndex: i,
          imageDataUrl,
          width: viewport.width,
          height: viewport.height,
          thumbnailDataUrl,
        },
        doc.numPages
      );
    }
  } finally {
    // Release pdf.js worker resources for this render pass
    doc.destroy();
  }
}

/**
 * Load a PDF from ArrayBuffer and render all pages as images.
 * Thin wrapper over renderPDFProgressive that collects every page into an
 * array (kept for callers that want all pages at once).
 */
export async function loadAndRenderPDF(
  pdfBytes: ArrayBuffer,
  options?: { scale?: number; thumbnailScale?: number }
): Promise<PDFPageData[]> {
  const pages: PDFPageData[] = [];
  await renderPDFProgressive(pdfBytes, {
    ...options,
    onPage: (page) => {
      pages.push(page);
    },
  });
  return pages;
}

/**
 * Render a single page at a specific scale
 */
export async function renderSinglePage(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  scale: number = 2
): Promise<PDFPageData> {
  const pdfjs = await getPdfjs();
  const bytesCopy = new Uint8Array(pdfBytes).slice();
  const doc = await pdfjs.getDocument({ data: bytesCopy }).promise;
  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  const thumbViewport = page.getViewport({ scale: 0.3 });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await renderPageToCanvas(page, canvas, viewport);

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbViewport.width;
  thumbCanvas.height = thumbViewport.height;
  await renderPageToCanvas(page, thumbCanvas, thumbViewport);

  page.cleanup();

  return {
    pageIndex,
    imageDataUrl: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
    thumbnailDataUrl: thumbCanvas.toDataURL('image/png'),
  };
}

/**
 * Get total page count without rendering
 */
export async function getPDFPageCount(pdfBytes: ArrayBuffer): Promise<number> {
  const pdfjs = await getPdfjs();
  const bytesCopy = new Uint8Array(pdfBytes).slice();
  const doc = await pdfjs.getDocument({ data: bytesCopy }).promise;
  return doc.numPages;
}
