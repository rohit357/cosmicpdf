'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ToastContainer } from '@/components/ui/toast-container';
import { useToastStore } from '@/components/ui/ToastProvider';
import { splitPDF, extractPage, downloadPDF } from '@/lib/pdf/engine';
import { getPDFPageCount } from '@/lib/pdf/renderer';
import { ArrowLeft, Scissors, Upload, Download, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';

export default function SplitToolPage() {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [splitMode, setSplitMode] = useState<'range' | 'single' | 'every'>('range');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const [singlePage, setSinglePage] = useState(1);
  const [everyN, setEveryN] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      addToast({ type: 'error', message: 'Please upload a PDF.' });
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const count = await getPDFPageCount(bytes.buffer as ArrayBuffer);
    setPdfBytes(bytes);
    setFileName(file.name);
    setPageCount(count);
    setRangeEnd(count);
    addToast({ type: 'success', message: `Loaded ${count} pages` });
  };

  const handleSplit = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);

    try {
      if (splitMode === 'single') {
        const result = await extractPage(pdfBytes, singlePage - 1);
        downloadPDF(result, `${fileName.replace('.pdf', '')}-page${singlePage}.pdf`);
      } else if (splitMode === 'range') {
        const results = await splitPDF(pdfBytes, [[rangeStart - 1, rangeEnd - 1]]);
        results.forEach((r) => {
          downloadPDF(r, `${fileName.replace('.pdf', '')}-pages${rangeStart}-${rangeEnd}.pdf`);
        });
      } else if (splitMode === 'every') {
        const ranges: [number, number][] = [];
        for (let i = 0; i < pageCount; i += everyN) {
          ranges.push([i, Math.min(i + everyN - 1, pageCount - 1)]);
        }
        const results = await splitPDF(pdfBytes, ranges);
        results.forEach((r, i) => {
          downloadPDF(r, `${fileName.replace('.pdf', '')}-part${i + 1}.pdf`);
        });
      }
      addToast({ type: 'success', message: 'PDF split successfully!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to split PDF.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <ToastContainer />
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-[#64748B] hover:text-[#0F172A]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#059669] rounded-lg flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-[#0F172A]">Split PDF</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {!pdfBytes ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#E2E8F0] hover:border-[#059669] rounded-2xl p-10 text-center cursor-pointer transition-all bg-white"
          >
            <Upload className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
            <p className="text-lg font-semibold text-[#0F172A]">Upload a PDF to split</p>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-5 h-5 text-[#059669]" />
                <div>
                  <p className="font-medium text-[#0F172A]">{fileName}</p>
                  <p className="text-sm text-[#64748B]">{pageCount} pages</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  {(['range', 'single', 'every'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSplitMode(mode)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        splitMode === mode
                          ? 'bg-[#059669] text-white'
                          : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {mode === 'range' ? 'Page Range' : mode === 'single' ? 'Single Page' : 'Every N Pages'}
                    </button>
                  ))}
                </div>

                {splitMode === 'range' && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-[#64748B]">From page</label>
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={rangeStart}
                      onChange={(e) => setRangeStart(Number(e.target.value))}
                      className="w-20 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                    />
                    <label className="text-sm text-[#64748B]">to</label>
                    <input
                      type="number"
                      min={rangeStart}
                      max={pageCount}
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(Number(e.target.value))}
                      className="w-20 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {splitMode === 'single' && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-[#64748B]">Extract page</label>
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={singlePage}
                      onChange={(e) => setSinglePage(Number(e.target.value))}
                      className="w-20 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {splitMode === 'every' && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-[#64748B]">Split every</label>
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={everyN}
                      onChange={(e) => setEveryN(Number(e.target.value))}
                      className="w-20 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                    />
                    <label className="text-sm text-[#64748B]">pages</label>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleSplit}
              disabled={isProcessing}
              className="bg-[#059669] hover:bg-[#047857] text-white w-full py-6 text-base"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Splitting...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Split & Download</>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
