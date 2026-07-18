// ==========================================
// CosmicPDF - Element Factory Functions
// Creates fabric.js objects for annotations
// ==========================================

import type { TextAnnotationOptions, ShapeOptions } from '@/types';

/**
 * Convert strokeDash option to fabric strokeDashArray
 */
function getStrokeDashArray(dash: ShapeOptions['strokeDash'], strokeWidth: number): number[] | undefined {
  switch (dash) {
    case 'dashed': return [strokeWidth * 4, strokeWidth * 3];
    case 'dotted': return [strokeWidth, strokeWidth * 2];
    default: return undefined;
  }
}

/**
 * Create a text element
 */
export async function createTextElement(
  text: string,
  x: number,
  y: number,
  options: TextAnnotationOptions
) {
  const fabric = await import('fabric');
  
  return new fabric.IText(text, {
    left: x,
    top: y,
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    fontWeight: options.fontWeight,
    fontStyle: options.fontStyle,
    underline: options.underline,
    fill: options.fill,
    opacity: options.opacity,
    editable: true,
    padding: 5,
    cornerStyle: 'circle',
    cornerColor: '#DC2626',
    cornerSize: 8,
    transparentCorners: false,
    borderColor: '#DC2626',
  });
}

/**
 * Create a highlight rectangle (semi-transparent overlay)
 */
export async function createHighlight(
  x: number,
  y: number,
  width: number = 200,
  height: number = 30,
  color: string = '#FBBF24',
  opacity: number = 0.3
) {
  const fabric = await import('fabric');
  
  return new fabric.Rect({
    left: x,
    top: y,
    width,
    height,
    fill: color,
    opacity,
    strokeWidth: 0,
    cornerStyle: 'circle',
    cornerColor: '#DC2626',
    cornerSize: 8,
    transparentCorners: false,
    borderColor: '#DC2626',
  });
}

/**
 * Create a shape element (rectangle, circle, ellipse, line, arrow)
 * Supports initial width/height for drag-to-draw
 */
export async function createShape(
  type: ShapeOptions['type'],
  x: number,
  y: number,
  options: ShapeOptions,
  initialWidth?: number,
  initialHeight?: number
) {
  const fabric = await import('fabric');
  const dashArray = getStrokeDashArray(options.strokeDash, options.strokeWidth);
  
  const commonProps = {
    left: x,
    top: y,
    fill: options.fill,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    strokeDashArray: dashArray,
    opacity: options.opacity,
    cornerStyle: 'circle' as const,
    cornerColor: '#DC2626',
    cornerSize: 8,
    transparentCorners: false,
    borderColor: '#DC2626',
  };

  const w = initialWidth ?? 150;
  const h = initialHeight ?? 100;

  switch (type) {
    case 'rectangle':
      return new fabric.Rect({
        ...commonProps,
        width: w,
        height: h,
      });

    case 'circle':
      return new fabric.Circle({
        ...commonProps,
        radius: Math.max(w, h) / 2,
      });

    case 'ellipse':
      return new fabric.Ellipse({
        ...commonProps,
        rx: w / 2,
        ry: h / 2,
      });

    case 'line':
      return new fabric.Line([x, y, x + (initialWidth ?? 200), y + (initialHeight ?? 0)], {
        stroke: options.stroke,
        strokeWidth: options.strokeWidth,
        strokeDashArray: dashArray,
        opacity: options.opacity,
        cornerStyle: 'circle',
        cornerColor: '#DC2626',
        cornerSize: 8,
        transparentCorners: false,
        borderColor: '#DC2626',
      });

    case 'arrow': {
      // Arrow as a group (line + triangle head)
      const lineLen = initialWidth ?? 180;
      const line = new fabric.Line([0, 0, lineLen, 0], {
        stroke: options.stroke,
        strokeWidth: options.strokeWidth,
        strokeDashArray: dashArray,
      });
      const triangle = new fabric.Triangle({
        left: lineLen,
        top: -8,
        width: 16,
        height: 16,
        fill: options.stroke,
        angle: 90,
      });
      return new fabric.Group([line, triangle], {
        left: x,
        top: y,
        opacity: options.opacity,
        cornerStyle: 'circle',
        cornerColor: '#DC2626',
        cornerSize: 8,
        transparentCorners: false,
        borderColor: '#DC2626',
      });
    }

    default:
      return new fabric.Rect({ ...commonProps, width: w, height: h });
  }
}

/**
 * Create a redact/blackout rectangle
 */
export async function createRedactBox(
  x: number,
  y: number,
  width: number = 200,
  height: number = 30
) {
  const fabric = await import('fabric');
  
  return new fabric.Rect({
    left: x,
    top: y,
    width,
    height,
    fill: '#000000',
    opacity: 1,
    strokeWidth: 0,
    cornerStyle: 'circle',
    cornerColor: '#DC2626',
    cornerSize: 8,
    transparentCorners: false,
    borderColor: '#DC2626',
  });
}

/**
 * Create an image element from a data URL
 */
export async function createImageElement(
  dataUrl: string,
  x: number,
  y: number,
  maxWidth: number = 300
): Promise<import('fabric').FabricImage> {
  const fabric = await import('fabric');
  
  return new Promise((resolve) => {
    const imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    imgElement.onload = () => {
      const scale = maxWidth / imgElement.width;
      const fabricImg = new fabric.FabricImage(imgElement, {
        left: x,
        top: y,
        scaleX: scale,
        scaleY: scale,
        cornerStyle: 'circle',
        cornerColor: '#DC2626',
        cornerSize: 8,
        transparentCorners: false,
        borderColor: '#DC2626',
      });
      resolve(fabricImg);
    };
    imgElement.src = dataUrl;
  });
}

/**
 * Create a signature from typed text
 */
export async function createSignatureText(
  text: string,
  fontFamily: string,
  x: number,
  y: number,
  color: string = '#0F172A'
) {
  const fabric = await import('fabric');
  
  return new fabric.IText(text, {
    left: x,
    top: y,
    fontFamily,
    fontSize: 36,
    fill: color,
    editable: false,
    cornerStyle: 'circle',
    cornerColor: '#DC2626',
    cornerSize: 8,
    transparentCorners: false,
    borderColor: '#DC2626',
  });
}
