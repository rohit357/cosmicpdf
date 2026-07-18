'use client';
/* eslint-disable @next/next/no-img-element -- page images are local blob URLs; next/image not applicable */

// ==========================================
// COSMIC PDF - Continuous Scroll View
// Read-only vertical stack of all pages (like a traditional PDF reader).
// Additive: does not touch the fabric edit canvas. Clicking a page returns to
// edit mode focused on that page.
// ==========================================

import { useEffect, useRef, useState } from 'react';
import { usePdfStore } from '@/store/pdfStore';
import { useEditorStore } from '@/store/editorStore';
import { useUIStore } from '@/store/uiStore';
import { compositePage } from '@/lib/canvas/composite';
import { Pencil } from 'lucide-react';

export default function ScrollView() {
  const pages = usePdfStore((s) => s.pages);
  const canvasStates = usePdfStore((s) => s.canvasStates);
  const currentPageIndex = useEditorStore((s) => s.currentPageIndex);
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage);
  const setViewMode = useUIStore((s) => s.setViewMode);

  // Composited (background + annotations) image URLs, keyed by page index.
  // Pages without annotations fall back to the plain page image.
  const [composited, setComposited] = useState<Record<number, string>>({});
  const ownedUrlsRef = useRef<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const activePageRef = useRef<HTMLDivElement>(null);

  // Build composites for annotated pages. Runs when the annotation set changes.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const next: Record<number, string> = {};
      const owned: string[] = [];
      for (const page of pages) {
        const json = canvasStates[page.pageIndex];
        if (!json) continue; // no annotations → use plain image via fallback
        try {
          const url = await compositePage(page, json);
          if (cancelled) {
            if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            return;
          }
          next[page.pageIndex] = url;
          if (url.startsWith('blob:')) owned.push(url);
        } catch (err) {
          console.error('Failed to composite page', page.pageIndex, err);
        }
      }
      if (cancelled) {
        owned.forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      // Release any previously owned URLs before swapping in the new set.
      ownedUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      ownedUrlsRef.current = owned;
      setComposited(next);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [pages, canvasStates]);

  // Revoke owned composite URLs on unmount.
  useEffect(() => {
    return () => {
      ownedUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      ownedUrlsRef.current = [];
    };
  }, []);

  // Scroll the current page into view when entering scroll mode.
  useEffect(() => {
    activePageRef.current?.scrollIntoView({ block: 'start' });
    // Only on mount — subsequent scrolling is user-driven.
  }, []);

  const openInEditor = (index: number) => {
    setCurrentPage(index);
    setViewMode('edit');
  };

  if (pages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F1F5F9] text-sm text-[#64748B]">
        No pages to display.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-auto bg-[#F1F5F9] py-6">
      <div className="mx-auto flex flex-col items-center gap-6 px-4">
        {pages.map((page, index) => {
          const src = composited[page.pageIndex] ?? page.imageDataUrl;
          const isActive = index === currentPageIndex;
          return (
            <div
              key={page.pageIndex}
              ref={isActive ? activePageRef : undefined}
              className="w-full max-w-[820px]"
            >
              {/* Page label */}
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-[#64748B]">
                <span>Page {index + 1} / {pages.length}</span>
                <button
                  onClick={() => openInEditor(index)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors"
                  title="Edit this page"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              </div>
              {/* Page image (click to edit) */}
              <button
                onClick={() => openInEditor(index)}
                className={`block w-full rounded-lg overflow-hidden bg-white shadow-md transition-all hover:shadow-xl ${
                  isActive ? 'ring-2 ring-[#DC2626] ring-offset-2' : ''
                }`}
                title={`Edit page ${index + 1}`}
              >
                <img
                  src={src}
                  alt={`Page ${index + 1}`}
                  loading="lazy"
                  className="w-full h-auto"
                  style={{ aspectRatio: `${page.width} / ${page.height}` }}
                  draggable={false}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
