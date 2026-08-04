// ==========================================
// CosmicPDF - Shared TypeScript Types
// ==========================================

export type ToolCategory = 
  | 'annotate'
  | 'sign'
  | 'image'
  | 'draw'
  | 'file'
  | 'convert'
  | 'optimize';

export type ActiveTool =
  | 'select'
  | 'text'
  | 'highlight'
  | 'signature-draw'
  | 'signature-type'
  | 'signature-upload'
  | 'image-stamp'
  | 'bg-remove'
  | 'pen'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'redact'
  | 'merge'
  | 'split'
  | 'rotate'
  | 'reorder'
  | 'delete-pages'
  | 'img-to-pdf'
  | 'pdf-to-img'
  | 'compress'
  | 'inflate'
  | 'watermark';

export interface PageAnnotation {
  id: string;
  pageIndex: number;
  fabricJSON: string;
}

export interface PDFPageData {
  pageIndex: number;
  imageDataUrl: string;
  width: number;
  height: number;
  thumbnailDataUrl: string;
}

export interface SignatureData {
  type: 'draw' | 'type' | 'upload';
  dataUrl: string;
  fontFamily?: string;
  text?: string;
}

export interface TextAnnotationOptions {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  fill: string;
  opacity: number;
}

export interface ShapeOptions {
  type: 'rectangle' | 'circle' | 'ellipse' | 'line' | 'arrow';
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDash: 'solid' | 'dashed' | 'dotted';
  opacity: number;
}

export interface DrawingOptions {
  color: string;
  width: number;
  opacity: number;
  brushType: 'pencil' | 'spray' | 'circle';
}

/** Options for the highlight tool (a semi-transparent rectangle). */
export interface HighlightOptions {
  color: string;
  opacity: number;
}

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  opacity: number;
  rotation: number;
  position: 'diagonal' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface CompressOptions {
  quality: number; // 0.0 to 1.0
}

export interface MergeFile {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
  thumbnails: string[];
  selectedPages: number[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}
