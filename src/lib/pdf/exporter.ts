// ==========================================
// COSMIC PDF - PDF Export Pipeline
// Canvas-to-image export strategy per PRD Section 5.2
// ==========================================

import { exportAnnotatedPDF, downloadPDF } from './engine';

/**
 * Export all pages from fabric canvas instances as an annotated PDF
 * Each canvas is exported as a PNG, then embedded in a new PDF document
 */
export async function exportCanvasToPDF(
  canvasElements: HTMLCanvasElement[],
  fileName: string = 'cosmic-pdf-export.pdf'
): Promise<void> {
  const pageImages: string[] = [];

  for (const canvas of canvasElements) {
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    pageImages.push(dataUrl);
  }

  const pdfBytes = await exportAnnotatedPDF(pageImages);
  downloadPDF(pdfBytes, fileName);
}

/**
 * Export a single fabric.js canvas page as PNG data URL
 */
export function canvasToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Export PDF pages as individual images
 */
export function downloadPageAsImage(
  dataUrl: string,
  fileName: string,
  format: 'png' | 'jpeg' = 'png'
): void {
  let outputUrl = dataUrl;
  
  if (format === 'jpeg' && dataUrl.startsWith('data:image/png')) {
    // Convert PNG to JPEG via canvas
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      outputUrl = canvas.toDataURL('image/jpeg', 0.92);
      
      triggerDownload(outputUrl, fileName);
    };
    img.src = dataUrl;
    return;
  }

  triggerDownload(outputUrl, fileName);
}

function triggerDownload(dataUrl: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
