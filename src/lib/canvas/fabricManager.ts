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
 * Whether a fabric canvas has already been disposed. Async work (image loads,
 * dynamic imports) can resolve after the canvas was torn down during a page
 * switch or unmount; mutating a disposed canvas throws
 * "Cannot destructure property 'el' of 'this.lower' as it is undefined".
 * Guard post-await canvas access with this check.
 */
export function isCanvasDisposed(canvas: FabricCanvas | null): boolean {
  if (!canvas) return true;
  return (canvas as unknown as { disposed?: boolean }).disposed === true;
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

  // Larger selection/resize handles so objects can be grabbed with a finger.
  // Applies to every object drawn on this canvas.
  fabric.FabricObject.ownDefaults.cornerSize = 16;
  fabric.FabricObject.ownDefaults.touchCornerSize = 40;

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
 * Apply an alpha channel to a `#rrggbb` colour, returning an `rgba()` string.
 * Fabric brushes have no opacity property, so the alpha has to travel with the
 * colour for the stroke to be drawn (and serialized) semi-transparent.
 * Non-hex input is returned untouched — it already carries its own alpha.
 */
export function withAlpha(color: string, alpha: number): string {
  if (alpha >= 1) return color;
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return color;
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, alpha)})`;
}

/**
 * Enable freehand drawing mode on the canvas
 */
export async function enableDrawingMode(
  canvas: FabricCanvas,
  color: string = '#0F172A',
  width: number = 2,
  brushType: 'pencil' | 'spray' | 'circle' = 'pencil',
  opacity: number = 1
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

  brush.color = withAlpha(color, opacity);
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

/**
 * Duplicate the selected object (or multi-selection) with a small offset and
 * make the copy the active object. Returns true if something was duplicated.
 */
export async function duplicateSelectedObject(canvas: FabricCanvas): Promise<boolean> {
  const activeObject = canvas.getActiveObject();
  if (!activeObject) return false;

  const fabric = await getFabric();
  const clone = await activeObject.clone();
  canvas.discardActiveObject();

  clone.set({
    left: (clone.left ?? 0) + 16,
    top: (clone.top ?? 0) + 16,
  });

  if (clone instanceof fabric.ActiveSelection) {
    // Multi-selection clones need their members added individually.
    clone.canvas = canvas;
    clone.forEachObject((obj) => canvas.add(obj));
    clone.setCoords();
  } else {
    canvas.add(clone);
  }

  canvas.setActiveObject(clone);
  canvas.requestRenderAll();
  return true;
}
