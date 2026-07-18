'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { usePdfStore } from '@/store/pdfStore';
import { useToastStore } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  mergePDFs, splitPDF, compressPDF, addWatermark, rotateAllPages,
  downloadPDF, imagesToPDF, inflatePDF, deletePages, reorderPages
} from '@/lib/pdf/engine';
import { Loader2, ArrowUpDown, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

export default function FileToolsPanel() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const pdfBytes = usePdfStore((s) => s.pdfBytes);
  const fileName = usePdfStore((s) => s.fileName);
  const pageCount = usePdfStore((s) => s.pageCount);
  const pages = usePdfStore((s) => s.pages);
  const addToast = useToastStore((s) => s.addToast);

  const [isProcessing, setIsProcessing] = useState(false);

  // Split state
  const [splitStart, setSplitStart] = useState(1);
  const [splitEnd, setSplitEnd] = useState(pageCount || 1);

  // Compress state
  const [quality, setQuality] = useState(50);

  // Rotate state
  const [rotationDegrees, setRotationDegrees] = useState(90);

  // Watermark state
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkSize, setWatermarkSize] = useState(48);

  // Inflate state
  const [targetSizeMB, setTargetSizeMB] = useState(5);

  // Reorder state
  const [pageOrder, setPageOrder] = useState<number[]>(() =>
    Array.from({ length: pageCount || 0 }, (_, i) => i)
  );

  // Delete pages state
  const [selectedForDelete, setSelectedForDelete] = useState<Set<number>>(new Set());

  // Keep page-dependent state in sync when the document (page count) changes.
  // These are initialized on mount, which may happen before the PDF finishes
  // loading (pageCount = 0) or persist across a document swap.
  useEffect(() => {
    setSplitEnd(pageCount || 1);
    setPageOrder(Array.from({ length: pageCount || 0 }, (_, i) => i));
    setSelectedForDelete(new Set());
  }, [pageCount]);

  // Reusable execution wrapper
  const executeOperation = async (operation: () => Promise<Uint8Array | Uint8Array[]>, successMsg: string, defaultName: string) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const result = await operation();
      if (Array.isArray(result)) {
        result.forEach((resBytes, index) => {
          downloadPDF(resBytes, `${fileName?.replace('.pdf', '')}-${defaultName}-${index + 1}.pdf`);
        });
      } else {
        downloadPDF(result, `${fileName?.replace('.pdf', '')}-${defaultName}.pdf`);
      }
      addToast({ type: 'success', message: successMsg });
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', message: 'Operation failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pdfBytes) return;
    setIsProcessing(true);
    try {
      const newBytes = new Uint8Array(await file.arrayBuffer());
      const merged = await mergePDFs([pdfBytes, newBytes]);
      downloadPDF(merged, `${fileName?.replace('.pdf', '')}-merged.pdf`);
      addToast({ type: 'success', message: 'PDFs merged successfully!' });
    } catch {
      addToast({ type: 'error', message: 'Merge failed.' });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const movePageInOrder = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...pageOrder];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[index], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[index]];
    setPageOrder(newOrder);
  };

  const toggleDeletePage = (pageIdx: number) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(pageIdx)) {
        next.delete(pageIdx);
      } else {
        // Don't allow deleting all pages
        if (next.size < pageCount - 1) {
          next.add(pageIdx);
        } else {
          addToast({ type: 'warning', message: 'Cannot delete all pages.' });
        }
      }
      return next;
    });
  };

  switch (activeTool) {
    case 'merge':
      return (
        <div className="space-y-4">
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Merge your current PDF with another document.
          </p>
          <div className="relative">
            <input
              type="file"
              accept="application/pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleMergeUpload}
              disabled={isProcessing}
            />
            <Button className="w-full bg-[#059669] hover:bg-[#047857] text-white" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isProcessing ? 'Merging...' : 'Upload PDF to Merge'}
            </Button>
          </div>
        </div>
      );

    case 'split':
      return (
        <div className="space-y-5">
          <p className="text-sm text-[#94A3B8]">Extract a specific page range.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-[#64748B] block mb-1">From Page</label>
              <input
                type="number"
                min={1}
                max={pageCount}
                value={splitStart}
                onChange={(e) => setSplitStart(Number(e.target.value))}
                className="w-full bg-[#0F172A] border border-white/10 rounded px-2 py-1.5 text-white text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[#64748B] block mb-1">To Page</label>
              <input
                type="number"
                min={1}
                max={pageCount}
                value={splitEnd}
                onChange={(e) => setSplitEnd(Number(e.target.value))}
                className="w-full bg-[#0F172A] border border-white/10 rounded px-2 py-1.5 text-white text-sm"
              />
            </div>
          </div>
          <Button
            className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            onClick={() => executeOperation(() => splitPDF(pdfBytes!, [[splitStart - 1, splitEnd - 1]]), 'PDF split successfully', `split-${splitStart}-${splitEnd}`)}
            disabled={isProcessing || splitStart > splitEnd || !pdfBytes}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Split Document
          </Button>
        </div>
      );

    case 'rotate':
      return (
        <div className="space-y-4">
          <label className="text-xs font-medium text-[#94A3B8] uppercase block">Rotation Degrees</label>
          <select
            value={rotationDegrees}
            onChange={(e) => setRotationDegrees(Number(e.target.value))}
            className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value={90}>90° Clockwise</option>
            <option value={180}>180°</option>
            <option value={270}>90° Counter-Clockwise</option>
          </select>
          <Button
            className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            onClick={() => executeOperation(() => rotateAllPages(pdfBytes!, rotationDegrees), 'PDF rotated successfully', 'rotated')}
            disabled={isProcessing || !pdfBytes}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Apply Rotation
          </Button>
        </div>
      );

    case 'reorder':
      return (
        <div className="space-y-4">
          <p className="text-sm text-[#94A3B8]">Drag pages to reorder, then apply.</p>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
            {pageOrder.map((originalIdx, currentPos) => (
              <div
                key={`page-${originalIdx}`}
                className="flex items-center gap-2 bg-[#0F172A] rounded-lg px-3 py-2 border border-white/5"
              >
                <ArrowUpDown className="w-3 h-3 text-[#475569] shrink-0" />
                {pages[originalIdx]?.thumbnailDataUrl && (
                  <img
                    src={pages[originalIdx].thumbnailDataUrl}
                    alt={`Page ${originalIdx + 1}`}
                    className="h-8 w-auto rounded border border-white/10"
                  />
                )}
                <span className="text-xs text-white flex-1">Page {originalIdx + 1}</span>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => movePageInOrder(currentPos, 'up')}
                    disabled={currentPos === 0}
                    className="p-1 text-[#64748B] hover:text-white disabled:opacity-30"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => movePageInOrder(currentPos, 'down')}
                    disabled={currentPos === pageOrder.length - 1}
                    className="p-1 text-[#64748B] hover:text-white disabled:opacity-30"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            onClick={() => executeOperation(() => reorderPages(pdfBytes!, pageOrder), 'Pages reordered!', 'reordered')}
            disabled={isProcessing || !pdfBytes}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Apply New Order
          </Button>
        </div>
      );

    case 'delete-pages':
      return (
        <div className="space-y-4">
          <p className="text-sm text-[#94A3B8]">Select pages to remove from PDF.</p>
          <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                onClick={() => toggleDeletePage(i)}
                className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                  selectedForDelete.has(i)
                    ? 'border-[#DC2626] bg-[#DC2626]/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                {pages[i]?.thumbnailDataUrl && (
                  <img
                    src={pages[i].thumbnailDataUrl}
                    alt={`Page ${i + 1}`}
                    className={`w-full h-auto ${selectedForDelete.has(i) ? 'opacity-40' : ''}`}
                  />
                )}
                <div className="absolute bottom-0 inset-x-0 text-[9px] font-medium text-center py-0.5 bg-black/50 text-white">
                  {i + 1}
                </div>
                {selectedForDelete.has(i) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-[#DC2626]" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#64748B]">
            {selectedForDelete.size} page{selectedForDelete.size !== 1 ? 's' : ''} selected for deletion
          </p>
          <Button
            className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            onClick={() => executeOperation(
              () => deletePages(pdfBytes!, Array.from(selectedForDelete)),
              `Deleted ${selectedForDelete.size} page(s)!`,
              'pages-removed'
            )}
            disabled={isProcessing || selectedForDelete.size === 0 || !pdfBytes}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Delete Selected Pages
          </Button>
        </div>
      );

    case 'compress':
      return (
        <div className="space-y-5">
          <p className="text-sm text-[#94A3B8]">Re-encode pages as compressed JPEG.</p>
          <div>
            <label className="text-xs text-[#64748B] block mb-2">Quality: {quality}%</label>
            <Slider
              value={[quality]}
              onValueChange={(v) => setQuality(Array.isArray(v) ? v[0] : v)}
              min={10} max={100} step={1}
            />
            <div className="flex justify-between text-[10px] text-[#475569] mt-1">
              <span>Smallest</span>
              <span>Best quality</span>
            </div>
          </div>
          <Button
            className="w-full bg-[#D97706] hover:bg-[#B45309] text-white"
            onClick={() => executeOperation(() => compressPDF(pdfBytes!, { quality: quality / 100 }), 'PDF compressed successfully', 'compressed')}
            disabled={isProcessing || !pdfBytes}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Compress PDF
          </Button>
        </div>
      );

    case 'inflate':
      return (
        <div className="space-y-5">
          <p className="text-sm text-[#94A3B8]">Increase PDF file size to meet minimum requirements.</p>
          <div>
            <label className="text-xs text-[#64748B] block mb-2">Target Size: {targetSizeMB} MB</label>
            <Slider
              value={[targetSizeMB]}
              onValueChange={(v) => setTargetSizeMB(Array.isArray(v) ? v[0] : v)}
              min={1} max={50} step={1}
            />
          </div>
          {pdfBytes && (
            <p className="text-xs text-[#475569]">
              Current size: {(pdfBytes.length / (1024 * 1024)).toFixed(2)} MB
            </p>
          )}
          <Button
            className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            onClick={() => executeOperation(
              () => inflatePDF(pdfBytes!, targetSizeMB * 1024 * 1024),
              `PDF inflated to ~${targetSizeMB}MB!`,
              'inflated'
            )}
            disabled={isProcessing || !pdfBytes}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Inflate PDF
          </Button>
        </div>
      );

    case 'watermark':
      return (
        <div className="space-y-5">
          <div>
            <label className="text-xs text-[#64748B] block mb-1">Watermark Text</label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              className="w-full bg-[#0F172A] border border-white/10 rounded px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748B] block mb-2">Text Size: {watermarkSize}px</label>
            <Slider
              value={[watermarkSize]}
              onValueChange={(v) => setWatermarkSize(Array.isArray(v) ? v[0] : v)}
              min={12} max={120} step={1}
            />
          </div>
          <Button
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            onClick={() => executeOperation(() => addWatermark(pdfBytes!, { text: watermarkText, fontSize: watermarkSize, opacity: 0.3, color: '#000000', position: 'center', rotation: 45, fontFamily: 'Helvetica' }), 'Watermark applied!', 'watermarked')}
            disabled={isProcessing || !pdfBytes}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Stamp Watermark
          </Button>
        </div>
      );

    case 'img-to-pdf':
      return (
        <div className="space-y-4">
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Upload images to convert to a new PDF.
          </p>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={async (e) => {
                const files = e.target.files;
                if (!files?.length) return;
                setIsProcessing(true);
                try {
                  const arr: { dataUrl: string; width: number; height: number }[] = [];
                  for (let i = 0; i < files.length; i++) {
                    const dataUrl = await new Promise<string>((res) => {
                      const reader = new FileReader();
                      reader.onload = (ev) => res(ev.target?.result as string);
                      reader.readAsDataURL(files[i]);
                    });
                    // Get actual image dimensions
                    const dims = await new Promise<{ width: number; height: number }>((res) => {
                      const img = new Image();
                      img.onload = () => res({ width: img.naturalWidth, height: img.naturalHeight });
                      img.src = dataUrl;
                    });
                    arr.push({ dataUrl, width: dims.width, height: dims.height });
                  }
                  const pdfBuf = await imagesToPDF(arr);
                  downloadPDF(pdfBuf, 'converted-images.pdf');
                  addToast({ type: 'success', message: 'Images converted to PDF!' });
                } catch (err) {
                  addToast({ type: 'error', message: 'Conversion failed.' });
                  console.error(err);
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing}
            />
            <Button className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isProcessing ? 'Converting...' : 'Select Images'}
            </Button>
          </div>
        </div>
      );

    case 'pdf-to-img':
      return (
        <div className="space-y-4">
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Download your current PDF pages as images.
          </p>
          <Button 
            className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
            disabled={isProcessing || !pdfBytes}
            onClick={async () => {
              if (!pdfBytes) return;
              setIsProcessing(true);
              try {
                const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
                GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
                // Pass a copy: pdf.js may transfer the buffer to its worker and
                // detach it, which would corrupt the shared store bytes used by
                // later operations (compress/inflate/export).
                const loadingTask = getDocument({ data: pdfBytes.slice() });
                const pdf = await loadingTask.promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                  const page = await pdf.getPage(i);
                  const viewport = page.getViewport({ scale: 2.0 });
                  const c = document.createElement('canvas');
                  c.width = viewport.width;
                  c.height = viewport.height;
                  await page.render({ canvasContext: c.getContext('2d')!, viewport }).promise;
                  
                  const link = document.createElement('a');
                  link.href = c.toDataURL('image/png');
                  link.download = `${fileName?.replace('.pdf', '') || 'document'}-page-${i}.png`;
                  link.click();
                  
                  // Small delay to prevent browser crash/blocking on multiple downloads
                  await new Promise((r) => setTimeout(r, 200));
                }
                addToast({ type: 'success', message: 'Pages downloaded!' });
              } catch (err) {
                addToast({ type: 'error', message: 'Extraction failed.' });
                console.error(err);
              } finally {
                setIsProcessing(false);
              }
            }}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Download as Images
          </Button>
        </div>
      );

    default:
      return (
        <div className="p-4 text-center text-sm text-[#64748B]">
          Select a file operation tool from the sidebar.
        </div>
      );
  }
}
