'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { usePdfStore } from '@/store/pdfStore';
import { useHistoryStore } from '@/store/historyStore';
import { setActiveCanvas } from '@/lib/canvas/canvasRegistry';
import type { Canvas as FabricCanvas } from 'fabric';

interface CanvasEditorProps {
  canvasRef: React.MutableRefObject<FabricCanvas | null>;
}

// Tools that use interactive drag-to-draw
const DRAG_DRAW_TOOLS = ['rectangle', 'circle', 'ellipse', 'line', 'arrow'];
// Tools that place on single click
const CLICK_PLACE_TOOLS = ['text', 'highlight', 'redact'];

export default function CanvasEditor({ canvasRef }: CanvasEditorProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const initializedForPage = useRef<number | null>(null);

  // Drag-to-draw state
  const isDragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const dragShapeRef = useRef<import('fabric').FabricObject | null>(null);

  // Track if an object was already placed for click-place tools (one-shot)
  const hasPlacedRef = useRef(false);

  const currentPageIndex = useEditorStore((s) => s.currentPageIndex);
  const activeTool = useEditorStore((s) => s.activeTool);
  const zoom = useEditorStore((s) => s.zoom);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setSelectedElement = useEditorStore((s) => s.setSelectedElement);
  const drawingOptions = useEditorStore((s) => s.drawingOptions);
  const textOptions = useEditorStore((s) => s.textOptions);
  const shapeOptions = useEditorStore((s) => s.shapeOptions);

  const pages = usePdfStore((s) => s.pages);
  const canvasStates = usePdfStore((s) => s.canvasStates);
  const updateCanvasState = usePdfStore((s) => s.updateCanvasState);

  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);

  const currentPage = pages[currentPageIndex];

  // Reset hasPlaced when tool changes
  useEffect(() => {
    hasPlacedRef.current = false;
  }, [activeTool]);

  // Unregister the canvas when the editor unmounts
  useEffect(() => {
    return () => setActiveCanvas(null);
  }, []);

  // Helper: get canvas-local coordinates from a mouse event
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasElRef.current!.parentElement!.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };
    },
    [zoom]
  );

  // Helper: save canvas state
  const saveState = useCallback(() => {
    if (!canvasRef.current) return;
    const json = JSON.stringify(canvasRef.current.toJSON());
    updateCanvasState(currentPageIndex, json);
    pushSnapshot(currentPageIndex, json);
  }, [canvasRef, currentPageIndex, updateCanvasState, pushSnapshot]);

  // Helper: switch to select mode (pro behavior)
  const switchToSelect = useCallback(() => {
    setActiveTool('select');
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.selection = true;
    canvas.forEachObject((obj) => {
      obj.selectable = true;
      obj.evented = true;
    });
  }, [setActiveTool, canvasRef]);

  // Initialize fabric canvas
  useEffect(() => {
    if (!canvasElRef.current || !currentPage) return;

    let mounted = true;

    const init = async () => {
      const { initCanvas, setCanvasBackground, loadCanvasJSON } = await import('@/lib/canvas/fabricManager');

      if (!canvasElRef.current || !mounted) return;

      const width = currentPage.width;
      const height = currentPage.height;

      // Dispose old canvas if exists
      if (canvasRef.current) {
        try {
          canvasRef.current.dispose();
        } catch {
          // ignore disposal errors
        }
        canvasRef.current = null;
      }

      const canvas = await initCanvas(canvasElRef.current, width, height);
      canvasRef.current = canvas;
      // Register for toolbar actions (clear annotations, etc.)
      setActiveCanvas(canvas);

      // Set background with PDF page image
      try {
        await setCanvasBackground(canvas, currentPage.imageDataUrl, width, height);
      } catch (err) {
        console.error('Background set failed:', err);
      }

      // Load saved state if exists
      const savedState = canvasStates[currentPageIndex];
      if (savedState) {
        await loadCanvasJSON(canvas, savedState);
        // Re-apply background since loadFromJSON may overwrite it
        try {
          await setCanvasBackground(canvas, currentPage.imageDataUrl, width, height);
        } catch (err) {
          console.error('Background reset failed:', err);
        }
      }

      // Event listeners
      canvas.on('selection:created', (e) => {
        const obj = e.selected?.[0];
        if (obj) setSelectedElement(obj.toString());
      });

      canvas.on('selection:cleared', () => {
        setSelectedElement(null);
      });

      canvas.on('object:modified', () => {
        const json = JSON.stringify(canvas.toJSON());
        updateCanvasState(currentPageIndex, json);
        pushSnapshot(currentPageIndex, json);
      });

      canvas.on('path:created', () => {
        const json = JSON.stringify(canvas.toJSON());
        updateCanvasState(currentPageIndex, json);
        pushSnapshot(currentPageIndex, json);
      });

      initializedForPage.current = currentPageIndex;
      setIsReady(true);
    };

    init();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage?.imageDataUrl]);

  // Handle page switching
  useEffect(() => {
    if (!canvasRef.current || !currentPage || !isReady) return;
    // Skip if this is the initial page we already set up
    if (initializedForPage.current === currentPageIndex) return;

    const switchPage = async () => {
      const canvas = canvasRef.current!;
      const { setCanvasBackground, loadCanvasJSON, clearCanvasObjects } = await import(
        '@/lib/canvas/fabricManager'
      );

      clearCanvasObjects(canvas);
      canvas.setDimensions({
        width: currentPage.width,
        height: currentPage.height,
      });
      await setCanvasBackground(canvas, currentPage.imageDataUrl, currentPage.width, currentPage.height);

      // Load saved canvas state
      const savedState = canvasStates[currentPageIndex];
      if (savedState) {
        await loadCanvasJSON(canvas, savedState);
        await setCanvasBackground(
          canvas,
          currentPage.imageDataUrl,
          currentPage.width,
          currentPage.height
        );
      }

      initializedForPage.current = currentPageIndex;
    };

    switchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageIndex, isReady]);

  // Handle tool changes (freehand drawing/eraser mode)
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const handleToolChange = async () => {
      const { enableDrawingMode, disableDrawingMode } = await import(
        '@/lib/canvas/fabricManager'
      );

      if (activeTool === 'pen') {
        await enableDrawingMode(canvas, drawingOptions.color, drawingOptions.width, drawingOptions.brushType);
      } else {
        disableDrawingMode(canvas);
      }

      // For drag-draw tools, click-place tools, and eraser, disable fabric selection
      // so clicks don't accidentally select existing objects while placing new ones
      if (
        DRAG_DRAW_TOOLS.includes(activeTool) ||
        CLICK_PLACE_TOOLS.includes(activeTool) ||
        activeTool === 'eraser'
      ) {
        canvas.selection = false;
        canvas.forEachObject((obj) => {
          obj.selectable = false;
          obj.evented = false;
        });
      } else if (activeTool === 'select') {
        canvas.selection = true;
        canvas.forEachObject((obj) => {
          obj.selectable = true;
          obj.evented = true;
        });
      }
    };

    handleToolChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, drawingOptions]);

  // =============================================
  // CLICK-TO-PLACE handler (text, highlight, redact)
  // Pro behavior: place ONE object → auto-switch to select
  // =============================================
  const handleClickPlace = useCallback(
    async (e: React.MouseEvent) => {
      if (!canvasRef.current) return;

      // Prevent double-placing — one-shot per tool activation
      if (hasPlacedRef.current) return;
      hasPlacedRef.current = true;

      const canvas = canvasRef.current;
      const { x, y } = getCanvasCoords(e);

      const elements = await import('@/lib/canvas/elements');

      let placedObj: import('fabric').FabricObject | null = null;

      switch (activeTool) {
        case 'text': {
          const textEl = await elements.createTextElement(
            'Type here...',
            x,
            y,
            textOptions
          );
          canvas.add(textEl);
          placedObj = textEl;

          // Switch to select first so the object becomes selectable/editable
          switchToSelect();

          // Now make the text editable
          canvas.setActiveObject(textEl);
          textEl.enterEditing();
          textEl.selectAll();
          canvas.requestRenderAll();
          saveState();
          return; // Early return — already switched
        }

        case 'highlight': {
          const highlight = await elements.createHighlight(x, y);
          canvas.add(highlight);
          placedObj = highlight;
          break;
        }

        case 'redact': {
          const redact = await elements.createRedactBox(x, y);
          canvas.add(redact);
          placedObj = redact;
          break;
        }

        default:
          break;
      }

      if (placedObj) {
        canvas.renderAll();
        saveState();

        // Switch to select and make placed object active
        switchToSelect();
        canvas.setActiveObject(placedObj);
        canvas.renderAll();
      }
    },
    [activeTool, textOptions, getCanvasCoords, saveState, canvasRef, switchToSelect]
  );

  // =============================================
  // DRAG-TO-DRAW handlers (rectangle, circle, ellipse, line, arrow)
  // =============================================
  const handleDragStart = useCallback(
    async (e: React.MouseEvent) => {
      if (!canvasRef.current || !DRAG_DRAW_TOOLS.includes(activeTool)) return;

      const { x, y } = getCanvasCoords(e);
      isDragging.current = true;
      dragOrigin.current = { x, y };

      const elements = await import('@/lib/canvas/elements');
      const shape = await elements.createShape(
        activeTool as import('@/types').ShapeOptions['type'],
        x,
        y,
        shapeOptions,
        1,
        1
      );
      shape.selectable = false;
      shape.evented = false;

      canvasRef.current.add(shape);
      dragShapeRef.current = shape;
      canvasRef.current.renderAll();
    },
    [activeTool, shapeOptions, getCanvasCoords, canvasRef]
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || !dragShapeRef.current || !canvasRef.current) return;

      const { x, y } = getCanvasCoords(e);
      const origin = dragOrigin.current;
      const shape = dragShapeRef.current;

      const w = Math.abs(x - origin.x);
      const h = Math.abs(y - origin.y);
      const left = Math.min(x, origin.x);
      const top = Math.min(y, origin.y);

      const type = activeTool as import('@/types').ShapeOptions['type'];

      if (type === 'rectangle') {
        shape.set({ left, top, width: w, height: h });
      } else if (type === 'circle') {
        const radius = Math.max(w, h) / 2;
        shape.set({ left, top, radius } as Record<string, unknown>);
      } else if (type === 'ellipse') {
        shape.set({ left, top, rx: w / 2, ry: h / 2 } as Record<string, unknown>);
      } else if (type === 'line') {
        shape.set({ x1: origin.x, y1: origin.y, x2: x, y2: y } as Record<string, unknown>);
      } else if (type === 'arrow') {
        // For arrow group, reposition entire group
        shape.set({ left: origin.x, top: origin.y, scaleX: w / 180 || 0.01, scaleY: 1 } as Record<string, unknown>);
      }

      shape.setCoords();
      canvasRef.current.renderAll();
    },
    [activeTool, getCanvasCoords, canvasRef]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current || !dragShapeRef.current || !canvasRef.current) return;

    isDragging.current = false;
    const shape = dragShapeRef.current;

    // Make the shape selectable again
    shape.selectable = true;
    shape.evented = true;

    dragShapeRef.current = null;
    saveState();

    // Pro behavior: after drawing shape, switch to select and highlight it
    switchToSelect();
    canvasRef.current.setActiveObject(shape);
    canvasRef.current.renderAll();
  }, [saveState, canvasRef, switchToSelect]);

  // =============================================
  // ERASER handler
  // =============================================
  const handleEraser = useCallback(
    async (e: React.MouseEvent) => {
      if (!canvasRef.current || activeTool !== 'eraser') return;

      const { x, y } = getCanvasCoords(e);
      const { eraseObjectAt } = await import('@/lib/canvas/fabricManager');
      const removed = eraseObjectAt(canvasRef.current, x, y);
      if (removed) {
        saveState();
      }
    },
    [activeTool, getCanvasCoords, saveState, canvasRef]
  );

  // =============================================
  // Unified mouse handlers
  // =============================================
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (CLICK_PLACE_TOOLS.includes(activeTool)) {
        handleClickPlace(e);
      } else if (DRAG_DRAW_TOOLS.includes(activeTool)) {
        handleDragStart(e);
      } else if (activeTool === 'eraser') {
        handleEraser(e);
      }
    },
    [activeTool, handleClickPlace, handleDragStart, handleEraser]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (DRAG_DRAW_TOOLS.includes(activeTool)) {
        handleDragMove(e);
      }
    },
    [activeTool, handleDragMove]
  );

  const handleMouseUp = useCallback(() => {
    if (DRAG_DRAW_TOOLS.includes(activeTool)) {
      handleDragEnd();
    }
  }, [activeTool, handleDragEnd]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!canvasRef.current) return;

      // Delete selected object
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if editing text
        const activeObj = canvasRef.current.getActiveObject();
        if (activeObj && (activeObj as unknown as { isEditing?: boolean }).isEditing) return;

        const { deleteSelectedObject } = await import('@/lib/canvas/fabricManager');
        deleteSelectedObject(canvasRef.current);
        saveState();
      }

      // Escape key to cancel placement and go back to select
      if (e.key === 'Escape') {
        switchToSelect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasRef, saveState, switchToSelect]);

  // Determine cursor based on active tool
  const getCursor = () => {
    if (DRAG_DRAW_TOOLS.includes(activeTool)) return 'crosshair';
    if (CLICK_PLACE_TOOLS.includes(activeTool)) return 'crosshair';
    if (activeTool === 'eraser') return 'crosshair';
    return 'default';
  };

  // Should we show an overlay to intercept events above the fabric canvas?
  const needsOverlay =
    DRAG_DRAW_TOOLS.includes(activeTool) ||
    CLICK_PLACE_TOOLS.includes(activeTool) ||
    activeTool === 'eraser';

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-[#F1F5F9] flex items-start justify-center p-8"
    >
      <div
        className="relative shadow-2xl"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
        }}
      >
        <canvas ref={canvasElRef} />

        {/* Transparent overlay that captures mouse events for draw/place/eraser tools.
            Prevents events from reaching Fabric's internal handlers to avoid
            accidentally selecting existing objects while placing new ones. */}
        {needsOverlay && (
          <div
            className="absolute inset-0 z-10"
            style={{ cursor: getCursor() }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        )}
      </div>

      {!currentPage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#F8FAFC] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#CBD5E1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#64748B] text-sm">Upload a PDF to get started</p>
          </div>
        </div>
      )}
    </div>
  );
}
