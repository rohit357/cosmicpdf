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

  // Pinch-zoom state: active touch pointers on the scroll container and the
  // pinch baseline (finger distance + zoom) captured when the 2nd finger lands.
  const pinchPointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchBaseline = useRef<{ distance: number; zoom: number } | null>(null);

  // Double-tap detection (touch): last tap time + position.
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const currentPageIndex = useEditorStore((s) => s.currentPageIndex);
  const activeTool = useEditorStore((s) => s.activeTool);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setSelectedElement = useEditorStore((s) => s.setSelectedElement);
  const drawingOptions = useEditorStore((s) => s.drawingOptions);
  const textOptions = useEditorStore((s) => s.textOptions);
  const shapeOptions = useEditorStore((s) => s.shapeOptions);
  const highlightOptions = useEditorStore((s) => s.highlightOptions);

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

  // Helper: get canvas-local coordinates from a pointer/mouse event.
  // Divides by zoom because the page wrapper is CSS-scaled; clientX/Y are in
  // screen space, fabric objects live in unscaled canvas space.
  const getCanvasCoords = useCallback(
    (e: { clientX: number; clientY: number }) => {
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
      // Dispose drops fabric listeners, so selection:cleared never fires —
      // reset selection state explicitly (keeps the mobile context bar honest).
      setSelectedElement(null);

      const canvas = await initCanvas(canvasElRef.current, width, height);
      // Effect was cleaned up while the canvas was being created — tear it down.
      if (!mounted) {
        try {
          canvas.dispose();
        } catch {
          // ignore disposal errors
        }
        return;
      }
      canvasRef.current = canvas;
      // Register for toolbar actions (clear annotations, etc.)
      setActiveCanvas(canvas);

      // Set background with PDF page image
      try {
        await setCanvasBackground(canvas, currentPage.imageDataUrl, width, height);
      } catch (err) {
        console.error('Background set failed:', err);
      }
      if (!mounted || canvas !== canvasRef.current) return;

      // Load saved state if exists
      const savedState = canvasStates[currentPageIndex];
      if (savedState) {
        await loadCanvasJSON(canvas, savedState);
        if (!mounted || canvas !== canvasRef.current) return;
        // Re-apply background since loadFromJSON may overwrite it
        try {
          await setCanvasBackground(canvas, currentPage.imageDataUrl, width, height);
        } catch (err) {
          console.error('Background reset failed:', err);
        }
        if (!mounted || canvas !== canvasRef.current) return;
      }

      // Event listeners.
      // Selection state is read back from the canvas rather than from the event
      // payload: `selection:updated` also fires when a member is removed from a
      // multi-selection, and its `selected` array is empty then.
      const syncSelection = () => {
        const active = canvas.getActiveObject();
        setSelectedElement(active ? active.toString() : null);
      };

      canvas.on('selection:created', syncSelection);
      canvas.on('selection:updated', syncSelection);
      canvas.on('selection:cleared', syncSelection);

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
      if (!mounted || canvas !== canvasRef.current) return;
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
      const { setCanvasBackground, loadCanvasJSON, clearCanvasObjects, isCanvasDisposed } = await import(
        '@/lib/canvas/fabricManager'
      );

      // The canvas may have been disposed/recreated during the dynamic import.
      if (isCanvasDisposed(canvas) || canvas !== canvasRef.current) return;

      clearCanvasObjects(canvas);
      canvas.setDimensions({
        width: currentPage.width,
        height: currentPage.height,
      });
      await setCanvasBackground(canvas, currentPage.imageDataUrl, currentPage.width, currentPage.height);
      if (isCanvasDisposed(canvas) || canvas !== canvasRef.current) return;

      // Load saved canvas state
      const savedState = canvasStates[currentPageIndex];
      if (savedState) {
        await loadCanvasJSON(canvas, savedState);
        if (isCanvasDisposed(canvas) || canvas !== canvasRef.current) return;
        await setCanvasBackground(
          canvas,
          currentPage.imageDataUrl,
          currentPage.width,
          currentPage.height
        );
        if (isCanvasDisposed(canvas) || canvas !== canvasRef.current) return;
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
        await enableDrawingMode(
          canvas,
          drawingOptions.color,
          drawingOptions.width,
          drawingOptions.brushType,
          drawingOptions.opacity
        );
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
        // Drop any existing selection: its handles disappear with
        // selectable=false, but fabric would still report an active object —
        // leaving the mobile selection bar acting on something invisible.
        canvas.discardActiveObject();
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
    async (e: React.PointerEvent) => {
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
          const highlight = await elements.createHighlight(
            x,
            y,
            undefined,
            undefined,
            highlightOptions.color,
            highlightOptions.opacity
          );
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
    [activeTool, textOptions, highlightOptions, getCanvasCoords, saveState, canvasRef, switchToSelect]
  );

  // =============================================
  // DRAG-TO-DRAW handlers (rectangle, circle, ellipse, line, arrow)
  // =============================================
  const handleDragStart = useCallback(
    async (e: React.PointerEvent) => {
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
    (e: React.PointerEvent) => {
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
    async (e: React.PointerEvent) => {
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
  // Unified pointer handlers (mouse, touch, pen)
  // =============================================
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only react to the primary pointer; multi-touch (pinch) is handled by
      // the container and must not start a draw/place operation.
      if (!e.isPrimary) return;
      // Capture so we keep receiving move/up even if the finger leaves the overlay.
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore capture errors (unsupported / already released)
      }
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

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (DRAG_DRAW_TOOLS.includes(activeTool)) {
        handleDragMove(e);
      } else if (activeTool === 'eraser' && e.isPrimary && e.buttons !== 0) {
        // Drag-to-erase: keep erasing while the pointer is pressed and moving.
        handleEraser(e);
      }
    },
    [activeTool, handleDragMove, handleEraser]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      if (DRAG_DRAW_TOOLS.includes(activeTool)) {
        handleDragEnd();
      }
    },
    [activeTool, handleDragEnd]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!canvasRef.current) return;

      // Delete selected object
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObj = canvasRef.current.getActiveObject();
        // Nothing selected: no edit to record. Saving here pushed a snapshot
        // identical to the previous one, so the next undo appeared to do nothing.
        if (!activeObj) return;
        // Don't delete if editing text
        if ((activeObj as unknown as { isEditing?: boolean }).isEditing) return;

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

  // =============================================
  // Pinch-to-zoom (two-finger) on the scroll container.
  // A pinch pinches the whole page wrapper via the existing CSS zoom; the
  // browser still handles one-finger scroll (pan) because touchAction stays
  // 'pan-x pan-y' on the container.
  // =============================================
  const handleContainerPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    pinchPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchPointers.current.size === 2) {
      const [a, b] = Array.from(pinchPointers.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      pinchBaseline.current = { distance, zoom };
      lastTapRef.current = null; // a pinch is not a tap
      return;
    }

    // Double-tap zoom (select mode only — draw tools use taps to place objects):
    // two taps within 300ms and 32px toggle between 100% and 150%.
    if (activeTool === 'select' && pinchPointers.current.size === 1) {
      const now = performance.now();
      const last = lastTapRef.current;
      if (
        last &&
        now - last.time < 300 &&
        Math.hypot(e.clientX - last.x, e.clientY - last.y) < 32
      ) {
        lastTapRef.current = null;
        setZoom(zoom < 1.25 ? 1.5 : 1);
      } else {
        lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
      }
    }
  }, [zoom, setZoom, activeTool]);

  const handleContainerPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    if (!pinchPointers.current.has(e.pointerId)) return;
    pinchPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinchPointers.current.size === 2 && pinchBaseline.current) {
      const [a, b] = Array.from(pinchPointers.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const { distance: baseDist, zoom: baseZoom } = pinchBaseline.current;
      if (baseDist > 0) {
        const nextZoom = baseZoom * (distance / baseDist);
        setZoom(nextZoom); // store clamps to [0.25, 3]
      }
    }
  }, [setZoom]);

  const handleContainerPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    pinchPointers.current.delete(e.pointerId);
    if (pinchPointers.current.size < 2) {
      pinchBaseline.current = null;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-[#F1F5F9] flex items-start justify-center p-2 md:p-8"
      style={{ touchAction: 'pan-x pan-y' }}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
      onPointerCancel={handleContainerPointerUp}
    >
      <div
        className="relative shadow-2xl"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <canvas ref={canvasElRef} />

        {/* Transparent overlay that captures pointer events for draw/place/eraser
            tools. Prevents events from reaching Fabric's internal handlers to
            avoid accidentally selecting existing objects while placing new ones.
            touchAction 'none' stops the browser from scrolling/zooming the page
            when drawing with a finger. */}
        {needsOverlay && (
          <div
            className="absolute inset-0 z-10"
            style={{ cursor: getCursor(), touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
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
