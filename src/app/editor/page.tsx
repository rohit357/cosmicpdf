'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePdfStore } from '@/store/pdfStore';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useUIStore } from '@/store/uiStore';
import { useToastStore } from '@/components/ui/ToastProvider';
import { ToastContainer } from '@/components/ui/toast-container';
import { renderPDFProgressive, DEFAULT_RENDER_SCALE } from '@/lib/pdf/renderer';
import { exportAnnotatedPDF, downloadPDF } from '@/lib/pdf/engine';
import dynamic from 'next/dynamic';
import type { Canvas as FabricCanvas } from 'fabric';

// Dynamically import heavy UI components
const Sidebar = dynamic(() => import('@/components/editor/Sidebar'), { ssr: false });
const Toolbar = dynamic(() => import('@/components/editor/Toolbar'), { ssr: false });
const CanvasEditor = dynamic(() => import('@/components/editor/Canvas'), { ssr: false });
const PageStrip = dynamic(() => import('@/components/editor/PageStrip'), { ssr: false });
const BottomToolbar = dynamic(() => import('@/components/editor/BottomToolbar'), { ssr: false });
const PropertiesPanel = dynamic(() => import('@/components/editor/PropertiesPanel'), { ssr: false });
const SignaturePad = dynamic(() => import('@/components/tools/SignaturePad'), { ssr: false });
const ImageStamp = dynamic(() => import('@/components/tools/ImageStamp'), { ssr: false });
const ScrollView = dynamic(() => import('@/components/editor/ScrollView'), { ssr: false });

export default function EditorPage() {
  const router = useRouter();
  const canvasRef = useRef<FabricCanvas | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  // Background render progress: { done, total } while pages stream in, else null
  const [renderProgress, setRenderProgress] = useState<{ done: number; total: number } | null>(null);

  const pdfBytes = usePdfStore((s) => s.pdfBytes);
  const fileName = usePdfStore((s) => s.fileName);
  const addPage = usePdfStore((s) => s.addPage);
  const pages = usePdfStore((s) => s.pages);
  const canvasStates = usePdfStore((s) => s.canvasStates);

  const activeTool = useEditorStore((s) => s.activeTool);
  const currentPageIndex = useEditorStore((s) => s.currentPageIndex);

  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  const propertiesPanelOpen = useUIStore((s) => s.propertiesPanelOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const viewMode = useUIStore((s) => s.viewMode);

  const addToast = useToastStore((s) => s.addToast);

  // Auto-close sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  // Redirect if no PDF loaded
  useEffect(() => {
    if (!pdfBytes) {
      router.push('/');
    }
  }, [pdfBytes, router]);

  // Render PDF pages on load.
  // Pages stream in one at a time so the editor becomes usable as soon as the
  // first page is ready; the rest render in the background. A ref guards against
  // re-entry, since appending pages changes `pages.length` (an effect dependency).
  const renderStartedRef = useRef(false);
  useEffect(() => {
    if (!pdfBytes || pages.length > 0 || renderStartedRef.current) return;
    renderStartedRef.current = true;

    const renderPDF = async () => {
      try {
        // Create a fresh copy to avoid detached/shared buffer issues
        const freshBuffer = pdfBytes.slice().buffer as ArrayBuffer;

        await renderPDFProgressive(freshBuffer, {
          onPage: (page, total) => {
            addPage(page);
            setRenderProgress({ done: page.pageIndex + 1, total });

            // Auto-fit zoom once, based on the first page width.
            if (page.pageIndex === 0) {
              // Available width = viewport - sidebar(220) - properties(250) - padding(64) - scrollbar(16)
              const sidebarW = window.innerWidth >= 768 ? 220 : 0;
              const propsW = window.innerWidth >= 768 ? 250 : 0;
              const padding = 64;
              const available = window.innerWidth - sidebarW - propsW - padding;
              const fitZoom = Math.min(available / page.width, 1); // never exceed 100%
              const clampedZoom = Math.max(0.3, Math.min(1, fitZoom));
              useEditorStore.getState().setZoom(clampedZoom);
            }
          },
        });

        addToast({ type: 'success', message: `Loaded ${usePdfStore.getState().pages.length} pages` });
      } catch (error) {
        console.error('Failed to render PDF:', error);
        addToast({ type: 'error', message: 'Failed to render PDF. File may be corrupted.' });
        renderStartedRef.current = false; // allow retry on transient failure
      } finally {
        setRenderProgress(null);
      }
    };

    renderPDF();
  }, [pdfBytes, pages.length, addPage, addToast]);

  // Handle undo
  const handleUndo = useCallback(async () => {
    const snapshot = undo();
    if (!snapshot || !canvasRef.current) return;

    const { loadCanvasJSON, setCanvasBackground } = await import('@/lib/canvas/fabricManager');
    await loadCanvasJSON(canvasRef.current, snapshot.canvasJSON);

    const page = pages[snapshot.pageIndex];
    if (page) {
      await setCanvasBackground(canvasRef.current, page.imageDataUrl, page.width, page.height);
    }
  }, [undo, pages]);

  // Handle redo
  const handleRedo = useCallback(async () => {
    const snapshot = redo();
    if (!snapshot || !canvasRef.current) return;

    const { loadCanvasJSON, setCanvasBackground } = await import('@/lib/canvas/fabricManager');
    await loadCanvasJSON(canvasRef.current, snapshot.canvasJSON);

    const page = pages[snapshot.pageIndex];
    if (page) {
      await setCanvasBackground(canvasRef.current, page.imageDataUrl, page.width, page.height);
    }
  }, [redo, pages]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (pages.length === 0) return;
    setIsExporting(true);

    try {
      const { exportCanvasAsPNG, setCanvasBackground, loadCanvasJSON, clearCanvasObjects } =
        await import('@/lib/canvas/fabricManager');

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Save current page state
      const currentJSON = JSON.stringify(canvas.toJSON());

      const pageImages: string[] = [];

      for (let i = 0; i < pages.length; i++) {
        // Load each page's state
        clearCanvasObjects(canvas);
        canvas.setDimensions({ width: pages[i].width, height: pages[i].height });
        await setCanvasBackground(canvas, pages[i].imageDataUrl, pages[i].width, pages[i].height);

        if (canvasStates[i]) {
          await loadCanvasJSON(canvas, canvasStates[i]);
          await setCanvasBackground(canvas, pages[i].imageDataUrl, pages[i].width, pages[i].height);
        }

        const dataUrl = exportCanvasAsPNG(canvas);
        pageImages.push(dataUrl);
      }

      // Restore current page
      clearCanvasObjects(canvas);
      const page = pages[currentPageIndex];
      canvas.setDimensions({ width: page.width, height: page.height });
      await setCanvasBackground(canvas, page.imageDataUrl, page.width, page.height);
      if (currentJSON) {
        await loadCanvasJSON(canvas, currentJSON);
        await setCanvasBackground(canvas, page.imageDataUrl, page.width, page.height);
      }

      // Create and download PDF.
      // Stored page sizes are canvas pixels (points * DEFAULT_RENDER_SCALE);
      // convert back to PDF points so exported pages match the original size.
      const pageDimensions = pages.map((p) => ({
        width: p.width / DEFAULT_RENDER_SCALE,
        height: p.height / DEFAULT_RENDER_SCALE,
      }));
      const pdfOutput = await exportAnnotatedPDF(pageImages, pageDimensions);
      const exportName = fileName?.replace('.pdf', '-edited.pdf') || 'cosmic-pdf-export.pdf';
      downloadPDF(pdfOutput, exportName);

      addToast({ type: 'success', message: 'PDF downloaded successfully!' });
    } catch (error) {
      console.error('Export failed:', error);
      addToast({ type: 'error', message: 'Failed to export PDF.' });
    } finally {
      setIsExporting(false);
    }
  }, [pages, canvasStates, currentPageIndex, fileName, addToast]);

  // Handle signature placement
  const handleSignaturePlace = useCallback(
    async (dataUrl: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const center = canvas.getVpCenter();
      
      const { createImageElement } = await import('@/lib/canvas/elements');
      const imgElement = await createImageElement(dataUrl, center.x, center.y, 200);
      
      // Fabric expects originX and originY to be center for correct placement if we pass center coordinates
      imgElement.set({ originX: 'center', originY: 'center' });
      
      canvas.add(imgElement);
      canvas.setActiveObject(imgElement);
      canvas.renderAll();

      const json = JSON.stringify(canvas.toJSON());
      usePdfStore.getState().updateCanvasState(currentPageIndex, json);
      useHistoryStore.getState().pushSnapshot(currentPageIndex, json);
      addToast({ type: 'success', message: 'Signature placed!' });
    },
    [currentPageIndex, addToast]
  );

  // Handle image stamp placement
  const handleImagePlace = useCallback(
    async (dataUrl: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const center = canvas.getVpCenter();

      const { createImageElement } = await import('@/lib/canvas/elements');
      const imgElement = await createImageElement(dataUrl, center.x, center.y, 300);
      
      imgElement.set({ originX: 'center', originY: 'center' });

      canvas.add(imgElement);
      canvas.setActiveObject(imgElement);
      canvas.renderAll();

      const json = JSON.stringify(canvas.toJSON());
      usePdfStore.getState().updateCanvasState(currentPageIndex, json);
      useHistoryStore.getState().pushSnapshot(currentPageIndex, json);
      addToast({ type: 'success', message: 'Image placed!' });
    },
    [currentPageIndex, addToast]
  );

  // Keyboard shortcut: Ctrl+Z, Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  if (!pdfBytes) return null;

  const showSignaturePanel = ['signature-draw', 'signature-type', 'signature-upload'].includes(activeTool);
  const showImagePanel = activeTool === 'image-stamp' || activeTool === 'bg-remove';
  const showRightPanel = propertiesPanelOpen;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ToastContainer />

      {/* Export loading overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#DC2626] border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium text-[#0F172A]">Exporting PDF...</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar onExport={handleExport} onUndo={handleUndo} onRedo={handleRedo} />

      {/* Background page-render progress (non-blocking; editor is already usable) */}
      {renderProgress && renderProgress.done < renderProgress.total && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-lg bg-[#0F172A] px-4 py-2.5 text-white shadow-xl">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-sm font-medium">
            Rendering pages… {renderProgress.done}/{renderProgress.total}
          </span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center: edit canvas (kept mounted to preserve fabric state) and,
            in scroll mode, a read-only continuous page preview on top. */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          <div className={`flex-1 flex flex-col overflow-hidden min-w-0 ${viewMode === 'scroll' ? 'hidden' : ''}`}>
            <CanvasEditor canvasRef={canvasRef} />
            <PageStrip />
          </div>
          {viewMode === 'scroll' && <ScrollView />}
          {/* Phone-only bottom navigation (undo/redo + tool sheets) */}
          <BottomToolbar onUndo={handleUndo} onRedo={handleRedo} />
        </div>

        {/* Right Panel — hidden on mobile unless propertiesPanelOpen.
            Not shown in scroll mode (read-only preview has no properties). */}
        {showRightPanel && viewMode === 'edit' && (
          <>
            {showSignaturePanel ? (
              <div className="
                fixed md:relative z-30 md:z-auto
                right-0 top-12 md:top-auto bottom-0
                w-[280px] bg-[#1E293B] border-l border-white/5 overflow-y-auto shrink-0
              ">
                <SignaturePad onPlace={handleSignaturePlace} />
              </div>
            ) : showImagePanel ? (
              <div className="
                fixed md:relative z-30 md:z-auto
                right-0 top-12 md:top-auto bottom-0
                w-[280px] bg-[#1E293B] border-l border-white/5 overflow-y-auto shrink-0
              ">
                <ImageStamp onPlace={handleImagePlace} />
              </div>
            ) : (
              <div className="
                hidden md:block
                w-[280px] shrink-0
              ">
                <PropertiesPanel />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
