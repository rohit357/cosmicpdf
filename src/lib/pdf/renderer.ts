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
 * Load a PDF from ArrayBuffer and render all pages as images
 */
export async function loadAndRenderPDF(
  pdfBytes: ArrayBuffer,
  options?: { scale?: number; thumbnailScale?: number }
): Promise<PDFPageData[]> {
  const pdfjs = await getPdfjs();
  const scale = options?.scale ?? DEFAULT_RENDER_SCALE;
  const thumbScale = options?.thumbnailScale ?? 0.3;

  // Create a fresh copy to avoid detached/shared buffer issues
  const bytesCopy = new Uint8Array(pdfBytes).slice();
  const loadingTask = pdfjs.getDocument({ data: bytesCopy });
  const doc = await loadingTask.promise;

  const pages: PDFPageData[] = [];

  for (let i = 0; i < doc.numPages; i++) {
    const page = await doc.getPage(i + 1); // pdfjs is 1-indexed
    const viewport = page.getViewport({ scale });
    const thumbViewport = page.getViewport({ scale: thumbScale });

    // Render full-size page
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await renderPageToCanvas(page, canvas, viewport);
    const imageDataUrl = canvas.toDataURL('image/png');

    // Render thumbnail
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbViewport.width;
    thumbCanvas.height = thumbViewport.height;
    await renderPageToCanvas(page, thumbCanvas, thumbViewport);
    const thumbnailDataUrl = thumbCanvas.toDataURL('image/png');

    pages.push({
      pageIndex: i,
      imageDataUrl,
      width: viewport.width,
      height: viewport.height,
      thumbnailDataUrl,
    });

    // Clean up
    page.cleanup();
  }

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
