// ==========================================
// COSMIC PDF - Fabric.js Canvas Manager
// Handles dynamic import, initialization, and lifecycle
// ==========================================

import type { Canvas as FabricCanvas } from 'fabric';

let fabricModule: typeof import('fabric') | null = null;

/**
 * Dynamically import fabric.js (SSR protection)
 */
export async function getFabric(): Promise<typeof import('fabric')> {
  if (fabricModule) return fabricModule;
  fabricModule = await import('fabric');
  return fabricModule;
}

/**
 * Initialize a fabric.js canvas on a given HTML canvas element
 */
export async function initCanvas(
  canvasElement: HTMLCanvasElement,
  width: number,
  height: number
): Promise<FabricCanvas> {
  const fabric = await getFabric();
  
  const canvas = new fabric.Canvas(canvasElement, {
    width,
    height,
    selection: true,
    preserveObjectStacking: true,
    stopContextMenu: true,
    fireRightClick: true,
  });

  return canvas;
}

/**
 * Set the background image of the canvas (PDF page render)
 */
export async function setCanvasBackground(
  canvas: FabricCanvas,
  imageDataUrl: string,
  width: number,
  height: number
): Promise<void> {
  const fabric = await getFabric();
  
  return new Promise((resolve, reject) => {
    const imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    imgElement.onload = () => {
      try {
        const fabricImage = new fabric.FabricImage(imgElement, {
          scaleX: width / imgElement.naturalWidth,
          scaleY: height / imgElement.naturalHeight,
          originX: 'left',
          originY: 'top',
        });
        // Use set() for proper reactivity
        canvas.set('backgroundImage', fabricImage);
        canvas.requestRenderAll();
        resolve();
      } catch (err) {
        console.error('Failed to set background image:', err);
        reject(err);
      }
    };
    imgElement.onerror = (err) => {
      console.error('Failed to load background image:', err);
      reject(new Error('Failed to load background image'));
    };
    imgElement.src = imageDataUrl;
  });
}

/**
 * Enable freehand drawing mode on the canvas
 */
export async function enableDrawingMode(
  canvas: FabricCanvas,
  color: string = '#0F172A',
  width: number = 2,
  brushType: 'pencil' | 'spray' | 'circle' = 'pencil'
): Promise<void> {
  const fabric = await getFabric();
  canvas.isDrawingMode = true;

  let brush;
  switch (brushType) {
    case 'spray':
      brush = new fabric.SprayBrush(canvas);
      (brush as unknown as { density: number }).density = 15;
      break;
    case 'circle':
      brush = new fabric.CircleBrush(canvas);
      break;
    case 'pencil':
    default:
      brush = new fabric.PencilBrush(canvas);
      break;
  }

  brush.color = color;
  brush.width = width;
  canvas.freeDrawingBrush = brush;
}

/**
 * Disable freehand drawing mode
 */
export function disableDrawingMode(canvas: FabricCanvas): void {
  canvas.isDrawingMode = false;
}

/**
 * Erase (remove) the topmost object found at the given canvas coordinates
 * Returns true if an object was removed
 */
export function eraseObjectAt(canvas: FabricCanvas, x: number, y: number): boolean {
  const objects = canvas.getObjects();
  // Iterate in reverse (top-most first)
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (obj.containsPoint({ x, y } as unknown as import('fabric').Point)) {
      canvas.remove(obj);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      return true;
    }
  }
  return false;
}

/**
 * Get canvas state as JSON for undo/redo snapshots
 */
export function getCanvasJSON(canvas: FabricCanvas): string {
  return JSON.stringify(canvas.toJSON());
}

/**
 * Restore canvas state from JSON
 */
export async function loadCanvasJSON(
  canvas: FabricCanvas,
  json: string
): Promise<void> {
  return new Promise((resolve) => {
    canvas.loadFromJSON(json).then(() => {
      canvas.requestRenderAll();
      resolve();
    });
  });
}

/**
 * Clear all objects from canvas (keeping background)
 */
export function clearCanvasObjects(canvas: FabricCanvas): void {
  const objects = canvas.getObjects();
  objects.forEach((obj) => canvas.remove(obj));
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

/**
 * Export canvas as PNG data URL (for PDF export)
 */
export function exportCanvasAsPNG(canvas: FabricCanvas): string {
  return canvas.toDataURL({
    format: 'png',
    quality: 1,
    multiplier: 1,
  });
}

/**
 * Delete selected object from canvas
 */
export function deleteSelectedObject(canvas: FabricCanvas): void {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }
}
