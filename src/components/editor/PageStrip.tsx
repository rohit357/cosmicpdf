'use client';
/* eslint-disable @next/next/no-img-element */

import { useEditorStore } from '@/store/editorStore';
import { usePdfStore } from '@/store/pdfStore';
import { useToastStore } from '@/components/ui/ToastProvider';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deletePages, downloadPDF } from '@/lib/pdf/engine';

export default function PageStrip() {
  const pages = usePdfStore((s) => s.pages);
  const pdfBytes = usePdfStore((s) => s.pdfBytes);
  const fileName = usePdfStore((s) => s.fileName);
  const currentPageIndex = useEditorStore((s) => s.currentPageIndex);
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage);
  const addToast = useToastStore((s) => s.addToast);

  if (pages.length === 0) return null;

  const handleDeletePage = async (pageIdx: number) => {
    if (!pdfBytes) return;
    if (pages.length <= 1) {
      addToast({ type: 'warning', message: 'Cannot delete the only page.' });
      return;
    }
    try {
      const result = await deletePages(pdfBytes, [pageIdx]);
      downloadPDF(result, `${fileName?.replace('.pdf', '') || 'document'}-page-removed.pdf`);
      addToast({
        type: 'success',
        message: `Downloaded a copy without page ${pageIdx + 1}. The open document is unchanged.`,
      });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete page.' });
    }
  };

  return (
    <div className="h-[100px] bg-white border-t border-[#E2E8F0] flex items-center shrink-0 pb-[env(safe-area-inset-bottom)]">
      {/* Page navigation */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 pointer-coarse:h-11 pointer-coarse:w-11 shrink-0 ml-2"
        disabled={currentPageIndex === 0}
        onClick={() => setCurrentPage(currentPageIndex - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* Thumbnails */}
      <ScrollArea className="flex-1 h-full">
        <div className="flex items-center gap-3 px-3 h-full py-2">
          {pages.map((page, index) => (
            <Tooltip key={page.pageIndex}>
              {/* Wrapper owns `group`/`relative` so the delete button can be a
                  sibling of the trigger instead of nested inside it (nested
                  <button> is invalid HTML and breaks hydration). */}
              <div className="relative shrink-0 h-[76px] group">
                <TooltipTrigger
                    onClick={() => setCurrentPage(index)}
                    className={`
                      block h-full rounded-lg overflow-hidden transition-all duration-200
                      ${currentPageIndex === index
                        ? 'ring-2 ring-[#DC2626] ring-offset-2 shadow-md'
                        : 'border border-[#E2E8F0] hover:border-[#94A3B8] hover:shadow-sm'
                      }
                    `}
                  >
                    <img
                      src={page.thumbnailDataUrl}
                      alt={`Page ${index + 1}`}
                      className="h-full w-auto object-contain bg-white"
                      draggable={false}
                    />
                    {/* Page number badge */}
                    <div className={`
                      absolute bottom-0 inset-x-0 text-[10px] font-medium text-center py-0.5
                      ${currentPageIndex === index
                        ? 'bg-[#DC2626] text-white'
                        : 'bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity'
                      }
                    `}>
                      {index + 1}
                    </div>
                </TooltipTrigger>
                {/* Delete button on hover */}
                {pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePage(index);
                    }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 pointer-coarse:w-7 pointer-coarse:h-7 bg-[#DC2626] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity hover:bg-[#B91C1C] z-10"
                    title={`Download a copy without page ${index + 1}`}
                    aria-label={`Download a copy without page ${index + 1}`}
                  >
                    <Trash2 className="w-2.5 h-2.5 pointer-coarse:w-3.5 pointer-coarse:h-3.5 text-white" />
                  </button>
                )}
              </div>
              <TooltipContent>Page {index + 1}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Forward navigation */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 pointer-coarse:h-11 pointer-coarse:w-11 shrink-0 mr-2"
        disabled={currentPageIndex >= pages.length - 1}
        onClick={() => setCurrentPage(currentPageIndex + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      {/* Page counter */}
      <div className="shrink-0 text-xs text-[#64748B] font-medium mr-4">
        {currentPageIndex + 1} / {pages.length}
      </div>
    </div>
  );
}
