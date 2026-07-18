import { create } from 'zustand';
import type { ActiveTool, TextAnnotationOptions, DrawingOptions, ShapeOptions } from '@/types';

interface EditorState {
  activeTool: ActiveTool;
  selectedElementId: string | null;
  currentPageIndex: number;
  zoom: number;
  textOptions: TextAnnotationOptions;
  drawingOptions: DrawingOptions;
  shapeOptions: ShapeOptions;
  signatureDataUrl: string | null;
  imageDataUrl: string | null;

  setActiveTool: (tool: ActiveTool) => void;
  setSelectedElement: (id: string | null) => void;
  setCurrentPage: (index: number) => void;
  setZoom: (zoom: number) => void;
  setTextOptions: (options: Partial<TextAnnotationOptions>) => void;
  setDrawingOptions: (options: Partial<DrawingOptions>) => void;
  setShapeOptions: (options: Partial<ShapeOptions>) => void;
  setSignatureDataUrl: (url: string | null) => void;
  setImageDataUrl: (url: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select',
  selectedElementId: null,
  currentPageIndex: 0,
  zoom: 1,
  signatureDataUrl: null,
  imageDataUrl: null,

  textOptions: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    fill: '#0F172A',
    opacity: 1,
  },

  drawingOptions: {
    color: '#0F172A',
    width: 2,
    opacity: 1,
    brushType: 'pencil',
  },

  shapeOptions: {
    type: 'rectangle',
    fill: 'transparent',
    stroke: '#0F172A',
    strokeWidth: 2,
    strokeDash: 'solid',
    opacity: 1,
  },

  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedElement: (id) => set({ selectedElementId: id }),
  setCurrentPage: (index) => set({ currentPageIndex: index }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),
  setTextOptions: (options) =>
    set((state) => ({ textOptions: { ...state.textOptions, ...options } })),
  setDrawingOptions: (options) =>
    set((state) => ({ drawingOptions: { ...state.drawingOptions, ...options } })),
  setShapeOptions: (options) =>
    set((state) => ({ shapeOptions: { ...state.shapeOptions, ...options } })),
  setSignatureDataUrl: (url) => set({ signatureDataUrl: url }),
  setImageDataUrl: (url) => set({ imageDataUrl: url }),
}));
