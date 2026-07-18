// ==========================================
// COSMIC PDF - Page Compositor
// Renders a page background plus its saved fabric.js annotations to a single
// flattened image, for read-only display (e.g. the continuous scroll view).
// Uses an offscreen StaticCanvas so it never touches the live editor canvas.
// ==========================================

import { getFabric } from './fabricManager';
import type { PDFPageData } from '@/types';

/**
 * Composite a page image with its saved annotation JSON into one PNG blob URL.
 * If there is no annotation state, the original page image URL is returned
 * unchanged (no work, no extra memory).
 *
 * The caller owns any returned blob: URL and should revoke it when done.
 */
export async function compositePage(
  page: PDFPageData,
  annotationJSON: string | undefined
): Promise<string> {
  // Nothing annotated on this page — reuse the already-rendered page image.
  if (!annotationJSON) return page.imageDataUrl;

  const fabric = await getFabric();

  // Offscreen element; never attached to the DOM.
  const el = document.createElement('canvas');
  el.width = page.width;
  el.height = page.height;

  const staticCanvas = new fabric.StaticCanvas(el, {
    width: page.width,
    height: page.height,
    renderOnAddRemove: false,
  });

  try {
    // Load annotations first, then draw the page image behind them.
    await staticCanvas.loadFromJSON(annotationJSON);

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const bg = new fabric.FabricImage(img, {
          scaleX: page.width / img.naturalWidth,
          scaleY: page.height / img.naturalHeight,
          originX: 'left',
          originY: 'top',
        });
        staticCanvas.set('backgroundImage', bg);
        staticCanvas.renderAll();
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load page image for compositing'));
      img.src = page.imageDataUrl;
    });

    const blobUrl = await new Promise<string>((resolve, reject) => {
      el.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Composite toBlob returned null'));
          return;
        }
        resolve(URL.createObjectURL(blob));
      }, 'image/png');
    });

    return blobUrl;
  } finally {
    staticCanvas.dispose();
  }
}
