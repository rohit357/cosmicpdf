// ==========================================
// COSMIC PDF - Active Canvas Registry
// Module-scoped reference to the currently mounted fabric.js canvas.
// Replaces the previous `window.__cosmicPdfCanvas` global so consumers
// (e.g. Toolbar actions) don't reach through the window object.
// ==========================================

import type { Canvas as FabricCanvas } from 'fabric';

let activeCanvas: FabricCanvas | null = null;

/** Register the currently mounted editor canvas. Called by the canvas host component. */
export function setActiveCanvas(canvas: FabricCanvas | null): void {
  activeCanvas = canvas;
}

/** Get the currently mounted editor canvas, or null if none is mounted. */
export function getActiveCanvas(): FabricCanvas | null {
  return activeCanvas;
}
