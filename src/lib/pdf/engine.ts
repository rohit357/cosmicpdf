// ==========================================
// COSMIC PDF - PDF Engine (pdf-lib)
// All merge, split, rotate, compress, watermark, inflate operations
// ==========================================


let _pdfLib: typeof import('pdf-lib') | null = null;
async function getPdfLib() {
  if (!_pdfLib) {
    _pdfLib = await import('pdf-lib');
  }
  return _pdfLib;
}

import type { WatermarkOptions, CompressOptions } from '@/types';

/**
 * Merge multiple PDFs into one (all pages)
 */
export async function mergePDFs(pdfBytesArray: Uint8Array[]): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const mergedDoc = await PDFDocument.create();

  for (const pdfBytes of pdfBytesArray) {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  return mergedDoc.save();
}

/**
 * Merge specific pages from multiple PDFs
 * @param files Array of { bytes, selectedPages } where selectedPages is 0-indexed
 */
export async function mergeSpecificPages(
  files: { bytes: Uint8Array; selectedPages: number[] }[]
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const mergedDoc = await PDFDocument.create();

  for (const file of files) {
    const srcDoc = await PDFDocument.load(file.bytes);
    const copiedPages = await mergedDoc.copyPages(srcDoc, file.selectedPages);
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  return mergedDoc.save();
}

/**
 * Split PDF by page ranges
 * @param ranges Array of [start, end] (0-indexed, inclusive)
 */
export async function splitPDF(
  pdfBytes: Uint8Array,
  ranges: [number, number][]
): Promise<Uint8Array[]> {
  const { PDFDocument } = await getPdfLib();
  const results: Uint8Array[] = [];

  for (const [start, end] of ranges) {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const newDoc = await PDFDocument.create();
    const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach((page) => newDoc.addPage(page));
    results.push(await newDoc.save());
  }

  return results;
}

/**
 * Extract a single page as a new PDF
 */
export async function extractPage(pdfBytes: Uint8Array, pageIndex: number): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const srcDoc = await PDFDocument.load(pdfBytes);
  const newDoc = await PDFDocument.create();
  const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex]);
  newDoc.addPage(copiedPage);
  return newDoc.save();
}

/**
 * Rotate pages in a PDF
 * @param rotations Map of pageIndex → rotation degrees (90, 180, 270)
 */
export async function rotatePages(
  pdfBytes: Uint8Array,
  rotations: Record<number, number>
): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();

  for (const [pageIndex, rotation] of Object.entries(rotations)) {
    const page = pages[Number(pageIndex)];
    if (page) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + rotation));
    }
  }

  return doc.save();
}

/**
 * Rotate all pages
 */
export async function rotateAllPages(pdfBytes: Uint8Array, rotation: number): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();
  pages.forEach((page) => {
    const current = page.getRotation().angle;
    page.setRotation(degrees(current + rotation));
  });
  return doc.save();
}

/**
 * Reorder pages in a PDF
 * @param newOrder Array of original page indices in desired order
 */
export async function reorderPages(
  pdfBytes: Uint8Array,
  newOrder: number[]
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const srcDoc = await PDFDocument.load(pdfBytes);
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, newOrder);
  copiedPages.forEach((page) => newDoc.addPage(page));
  return newDoc.save();
}

/**
 * Delete specific pages from a PDF
 * @param pageIndices 0-indexed page indices to remove
 */
export async function deletePages(
  pdfBytes: Uint8Array,
  pageIndices: number[]
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const srcDoc = await PDFDocument.load(pdfBytes);
  const allIndices = srcDoc.getPageIndices();
  const keepIndices = allIndices.filter((i) => !pageIndices.includes(i));

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, keepIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));
  return newDoc.save();
}

/**
 * Add watermark text to all pages
 */
export async function addWatermark(
  pdfBytes: Uint8Array,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts, degrees } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  };

  for (const page of pages) {
    const { width, height } = page.getSize();
    const color = hexToRgb(options.color);

    let x = width / 2;
    let y = height / 2;

    switch (options.position) {
      case 'top-left':
        x = 50;
        y = height - 50;
        break;
      case 'top-right':
        x = width - 50;
        y = height - 50;
        break;
      case 'bottom-left':
        x = 50;
        y = 50;
        break;
      case 'bottom-right':
        x = width - 50;
        y = 50;
        break;
      case 'center':
        x = width / 2;
        y = height / 2;
        break;
      case 'diagonal':
      default:
        x = width / 2;
        y = height / 2;
        break;
    }

    page.drawText(options.text, {
      x: x - (font.widthOfTextAtSize(options.text, options.fontSize) / 2),
      y,
      size: options.fontSize,
      font,
      color,
      opacity: options.opacity,
      rotate: degrees(options.position === 'diagonal' ? -45 : options.rotation),
    });
  }

  return doc.save();
}

/**
 * Inflate PDF file size to meet a target minimum size
 * Uses XObject padding with dummy bytes
 */
export async function inflatePDF(
  pdfBytes: Uint8Array,
  targetSizeBytes: number
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);

  let currentBytes = await doc.save();
  let currentSize = currentBytes.length;

  while (currentSize < targetSizeBytes - 1024) {
    const paddingSize = Math.min(targetSizeBytes - currentSize, 65536);
    const dummyData = new Uint8Array(paddingSize).fill(0xFF);

    // Embed as a hidden image (1x1 white pixel padded with dummy data)
    const page = doc.getPages()[0];
    try {
      const img = await doc.embedPng(createPaddedPNG(dummyData.length));
      page.drawImage(img, {
        x: -1,
        y: -1,
        width: 1,
        height: 1,
        opacity: 0,
      });
    } catch {
      // If PNG approach fails, add metadata
      doc.setSubject(doc.getSubject() + ' '.repeat(paddingSize));
    }

    currentBytes = await doc.save();
    currentSize = currentBytes.length;
  }

  return currentBytes;
}

/**
 * Create a minimal valid PNG with padding data
 */
function createPaddedPNG(targetSize: number): Uint8Array {
  // Minimal 1x1 white PNG
  const minPng = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
    0x44, 0xAE, 0x42, 0x60, 0x82,
  ]);

  if (targetSize <= minPng.length) return minPng;

  // Create a larger PNG by adding a tEXt chunk with padding
  const result = new Uint8Array(Math.max(targetSize, minPng.length + 100));
  result.set(minPng);
  return result.slice(0, Math.max(minPng.length, targetSize));
}

/**
 * Compress PDF by re-rendering pages as compressed JPEG images
 * This achieves real file size reduction by re-encoding at lower quality
 */
export async function compressPDF(
  pdfBytes: Uint8Array,
  options: CompressOptions
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const quality = options.quality;

  // Use pdfjs to render each page, then re-encode as JPEG
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const bytesCopy = pdfBytes.slice();
  const srcDoc = await pdfjs.getDocument({ data: bytesCopy }).promise;
  const newDoc = await PDFDocument.create();

  for (let i = 1; i <= srcDoc.numPages; i++) {
    const page = await srcDoc.getPage(i);
    // Use scale 1.5 for decent quality at smaller size
    const scale = quality > 0.7 ? 2 : 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Encode as JPEG with quality parameter
    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64Data = jpegDataUrl.split(',')[1];
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const embeddedImage = await newDoc.embedJpg(imageBytes);
    // Use original page dimensions (not scaled)
    const origViewport = page.getViewport({ scale: 1 });
    const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: origViewport.width,
      height: origViewport.height,
    });

    page.cleanup();
  }

  return newDoc.save();
}

/**
 * Create PDF from images
 */
export async function imagesToPDF(
  images: { dataUrl: string; width: number; height: number }[]
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.create();

  for (const img of images) {
    const isJpeg = img.dataUrl.startsWith('data:image/jpeg') || img.dataUrl.startsWith('data:image/jpg');
    const base64Data = img.dataUrl.split(',')[1];
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    let embeddedImage;
    if (isJpeg) {
      embeddedImage = await doc.embedJpg(imageBytes);
    } else {
      embeddedImage = await doc.embedPng(imageBytes);
    }

    const page = doc.addPage([embeddedImage.width, embeddedImage.height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: embeddedImage.width,
      height: embeddedImage.height,
    });
  }

  return doc.save();
}

/**
 * Export annotated PDF from canvas images
 * Each pageImage is a full-page PNG (PDF background + fabric annotations merged)
 *
 * @param pageDimensions Optional per-page size in PDF points. When provided,
 * each page is created at its true PDF dimensions and the (higher resolution)
 * canvas image is scaled to fit. Without it, page size falls back to the raw
 * image pixel size, which produces oversized page dimensions for canvases
 * rendered above 1:1 scale.
 */
export async function exportAnnotatedPDF(
  pageImages: string[],
  pageDimensions?: { width: number; height: number }[]
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.create();

  for (let i = 0; i < pageImages.length; i++) {
    const base64Data = pageImages[i].split(',')[1];
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const image = await doc.embedPng(imageBytes);

    const width = pageDimensions?.[i]?.width ?? image.width;
    const height = pageDimensions?.[i]?.height ?? image.height;
    const page = doc.addPage([width, height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return doc.save();
}

/**
 * Trigger download of PDF bytes
 */
export function downloadPDF(pdfBytes: Uint8Array, fileName: string) {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // Clean up memory
}
