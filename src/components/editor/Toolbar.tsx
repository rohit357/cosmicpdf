'use client';

import { useEditorStore } from '@/store/editorStore';
import { usePdfStore } from '@/store/pdfStore';
import { useHistoryStore } from '@/store/historyStore';
import { useUIStore } from '@/store/uiStore';
import { useToastStore } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/button';
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Download, Upload,
  FileText, Maximize2, Trash2, Keyboard, PanelRightOpen,
  ScrollText, Pencil, ArrowLeft
} from 'lucide-react';
import { useRef, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { hasPropertiesContent } from '@/lib/editor/toolPanels';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

interface ToolbarProps {
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export default function Toolbar({ onExport, onUndo, onRedo }: ToolbarProps) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const fileName = usePdfStore((s) => s.fileName);
  const setFile = usePdfStore((s) => s.setFile);
  const canUndo = useHistoryStore((s) => s.undoStack.length > 0);
  const canRedo = useHistoryStore((s) => s.redoStack.length > 0);
  const setActiveSheet = useUIStore((s) => s.setActiveSheet);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const addToast = useToastStore((s) => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.type !== 'application/pdf') {
        addToast({ type: 'error', message: 'Please upload a PDF file.' });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        addToast({ type: 'error', message: 'File too large. Maximum size is 100MB.' });
        return;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      setFile(file.name, bytes);
      addToast({ type: 'success', message: `Loaded: ${file.name}` });
    },
    [setFile, addToast]
  );

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  // Ctrl+S shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onExport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExport]);

  const handleClearAnnotations = async () => {
    const { getActiveCanvas } = await import('@/lib/canvas/canvasRegistry');
    const canvas = getActiveCanvas();
    if (canvas) {
      const { clearCanvasObjects, setCanvasBackground } = await import('@/lib/canvas/fabricManager');
      clearCanvasObjects(canvas);
      const pages = usePdfStore.getState().pages;
      const idx = useEditorStore.getState().currentPageIndex;
      if (pages[idx]) {
        await setCanvasBackground(canvas, pages[idx].imageDataUrl, pages[idx].width, pages[idx].height);
      }
      usePdfStore.getState().updateCanvasState(idx, JSON.stringify(canvas.toJSON()));
      addToast({ type: 'info', message: 'Annotations cleared.' });
    }
    setShowMoreMenu(false);
  };

  return (
    <header className="h-12 md:h-14 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-2 md:px-4 shrink-0 gap-1">
      {/* Left: Back + Hamburger (mobile) + File info */}
      <div className="flex items-center gap-1.5 md:gap-3 min-w-0">
        <Link
          href="/"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors shrink-0"
          title="Back to home"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Hamburger removed on phones: the bottom toolbar + sheets (M1) replace
            the sidebar drawer as the mobile tool surface. Desktop sidebar is
            always visible and needs no toggle. */}

        <FileText className="w-4 h-4 text-[#64748B] shrink-0 hidden sm:block" />
        <span className="text-xs md:text-sm font-medium text-[#0F172A] truncate max-w-[100px] md:max-w-[200px]">
          {fileName || 'Untitled PDF'}
        </span>
      </div>

      {/* Center: Undo/Redo + Zoom (desktop; on phones undo/redo live in the
          bottom toolbar and zoom is pinch/double-tap + kebab presets) */}
      <div className="flex items-center gap-0.5 md:gap-1">
        <Button variant="ghost" size="icon" className="hidden md:inline-flex h-8 w-8" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden md:inline-flex h-8 w-8" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" aria-label="Redo">
          <Redo2 className="w-4 h-4" />
        </Button>

        <div className="hidden md:block w-px h-5 bg-[#E2E8F0] mx-2" />

        <Button variant="ghost" size="icon" className="hidden md:inline-flex h-8 w-8" onClick={() => setZoom(zoom - 0.1)} title="Zoom Out" aria-label="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <button
          className="text-[10px] md:text-xs font-medium text-[#64748B] min-w-[32px] md:min-w-[40px] text-center hover:text-[#0F172A] cursor-pointer transition-colors"
          onClick={() => setZoom(1)} title="Reset zoom" aria-label="Reset zoom to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button variant="ghost" size="icon" className="hidden md:inline-flex h-8 w-8" onClick={() => setZoom(zoom + 0.1)} title="Zoom In" aria-label="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden md:inline-flex h-8 w-8" onClick={() => setZoom(1)} title="Fit to Page" aria-label="Fit to page">
          <Maximize2 className="w-4 h-4" />
        </Button>

        <div className="hidden md:block w-px h-5 bg-[#E2E8F0] mx-2" />

        {/* View mode: single-page edit vs continuous scroll preview.
            Switching closes any mobile sheet: the bottom toolbar unmounts in
            scroll mode, so a sheet left open would pop back on return. */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:h-8 md:w-8 pointer-coarse:h-11 pointer-coarse:w-11"
          onClick={() => {
            setActiveSheet(null);
            setViewMode(viewMode === 'edit' ? 'scroll' : 'edit');
          }}
          title={viewMode === 'edit' ? 'Scroll view (all pages)' : 'Back to edit'}
          aria-label={viewMode === 'edit' ? 'Switch to scroll view' : 'Switch to edit view'}
        >
          {viewMode === 'edit'
            ? <ScrollText className="w-3.5 h-3.5 md:w-4 md:h-4" />
            : <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />}
        </Button>
      </div>

      {/* Right: Upload + Download + Properties toggle (mobile) + More */}
      <div className="flex items-center gap-1 md:gap-2">
        <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 hidden sm:flex" onClick={() => fileInputRef.current?.click()} title="Open PDF" aria-label="Open PDF file">
          <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </Button>

        <Button
          onClick={onExport}
          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white h-7 md:h-8 px-2.5 md:px-4 text-xs md:text-sm rounded-lg"
          title="Export PDF (Ctrl+S)"
        >
          <Download className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" />
          <span className="hidden sm:inline">Download</span>
        </Button>

        {/* Properties sheet (mobile) — desktop panel is always visible ≥md.
            Hidden for signature/image tools: their options are already on screen
            in the overlay panel, so the sheet would open empty. Hidden in scroll
            mode too: the sheet only opens in edit mode, so the tap did nothing. */}
        {viewMode === 'edit' && hasPropertiesContent(activeTool) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11 md:hidden"
            onClick={() => setActiveSheet('properties')}
            title="Tool Properties"
            aria-label="Open tool properties"
          >
            <PanelRightOpen className="w-4 h-4" />
          </Button>
        )}

        {/* More Options */}
        <div className="relative" ref={menuRef}>
          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 pointer-coarse:h-11 pointer-coarse:w-11" onClick={() => setShowMoreMenu(!showMoreMenu)} title="More Options" aria-label="More options" aria-expanded={showMoreMenu}>
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" />
            </svg>
          </Button>

          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-[#E2E8F0] shadow-xl z-50 py-1">
              <button onClick={() => { setZoom(1); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
                <Maximize2 className="w-4 h-4 text-[#64748B]" /> Reset Zoom (100%)
              </button>
              <button onClick={() => { setZoom(0.5); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
                <ZoomOut className="w-4 h-4 text-[#64748B]" /> Zoom to 50%
              </button>
              <button onClick={() => { setZoom(1.5); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
                <ZoomIn className="w-4 h-4 text-[#64748B]" /> Zoom to 150%
              </button>
              <div className="h-px bg-[#E2E8F0] my-1" />
              {/* Show upload option on mobile since it's hidden in toolbar */}
              <button onClick={() => { fileInputRef.current?.click(); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] hover:bg-[#F8FAFC] transition-colors sm:hidden">
                <Upload className="w-4 h-4 text-[#64748B]" /> Open Another PDF
              </button>
              <button onClick={handleClearAnnotations} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#DC2626] hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" /> Clear All Annotations
              </button>
              <div className="h-px bg-[#E2E8F0] my-1" />
              <button onClick={() => { setShowShortcuts(true); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
                <Keyboard className="w-4 h-4 text-[#64748B]" /> Keyboard Shortcuts
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-[360px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0F172A] mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-3">
              {[
                ['Ctrl + Z', 'Undo'],
                ['Ctrl + Y', 'Redo'],
                ['Ctrl + S', 'Export/Download PDF'],
                ['Delete', 'Delete selected object'],
                ['Backspace', 'Delete selected object'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">{desc}</span>
                  <kbd className="px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs font-mono text-[#0F172A]">{key}</kbd>
                </div>
              ))}
            </div>
            <Button onClick={() => setShowShortcuts(false)} className="w-full mt-6 bg-[#0F172A] hover:bg-[#1E293B] text-white">
              Got it
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
