'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ToastContainer } from '@/components/ui/toast-container';
import { useToastStore } from '@/components/ui/ToastProvider';
import { ArrowLeft, Image as ImageIcon, Upload, Download, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';

export default function PdfToImagePage() {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [scale, setScale] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      addToast({ type: 'error', message: 'Please upload a PDF.' });
      return;
    }
    setIsLoading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
      GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const pdf = await getDocument({ data: bytes.slice() }).promise;

      setPdfBytes(bytes);
      setFileName(file.name);
      setPageCount(pdf.numPages);

      // Generate previews
      const thumbs: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 0.4 });
        const c = document.createElement('canvas');
        c.width = vp.width;
        c.height = vp.height;
        await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise;
        thumbs.push(c.toDataURL('image/png'));
        page.cleanup();
      }
      setPreviews(thumbs);
      addToast({ type: 'success', message: `Loaded ${pdf.numPages} pages` });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to load PDF.' });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
      GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const pdf = await getDocument({ data: pdfBytes.slice() }).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale });
        const c = document.createElement('canvas');
        c.width = vp.width;
        c.height = vp.height;
        const ctx = c.getContext('2d')!;

        if (format === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, c.width, c.height);
        }

        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const ext = format === 'jpeg' ? 'jpg' : 'png';
        const dataUrl = c.toDataURL(mimeType, format === 'jpeg' ? 0.92 : 1);

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${fileName.replace('.pdf', '')}-page-${i}.${ext}`;
        link.click();

        page.cleanup();
        await new Promise((r) => setTimeout(r, 250));
      }

      addToast({ type: 'success', message: `Downloaded ${pdf.numPages} images!` });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to convert pages.' });
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = async (pageNum: number) => {
    if (!pdfBytes) return;
    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
      GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const pdf = await getDocument({ data: pdfBytes.slice() }).promise;
      const page = await pdf.getPage(pageNum);
      const vp = page.getViewport({ scale });
      const c = document.createElement('canvas');
      c.width = vp.width;
      c.height = vp.height;
      const ctx = c.getContext('2d')!;

      if (format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, c.width, c.height);
      }

      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      const link = document.createElement('a');
      link.href = c.toDataURL(mimeType, format === 'jpeg' ? 0.92 : 1);
      link.download = `${fileName.replace('.pdf', '')}-page-${pageNum}.${ext}`;
      link.click();
      page.cleanup();
    } catch {
      addToast({ type: 'error', message: 'Failed to download page.' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDFA] font-sans">
      <ToastContainer />
      
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-5 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/" className="w-10 h-10 bg-[#F0FDFA] rounded-full flex items-center justify-center text-[#0D9488] hover:bg-[#0D9488] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0D9488] rounded-xl flex items-center justify-center shadow-sm">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-[#134E4A] tracking-tight">PDF to Images</h1>
            </div>
          </div>
          {pdfBytes && (
            <Button
              onClick={handleDownloadAll}
              disabled={isProcessing}
              className="bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-6 rounded-xl font-bold text-base shadow-sm transition-transform hover:-translate-y-0.5"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Converting...</>
              ) : (
                <><Download className="w-5 h-5 mr-2" /> Download All ({pageCount})</>
              )}
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {!pdfBytes ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#0D9488]/30 hover:border-[#0D9488] bg-white rounded-3xl p-16 text-center cursor-pointer transition-all hover:shadow-xl"
          >
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-[#0D9488] animate-spin" />
                <p className="text-xl font-bold text-[#134E4A]">Processing PDF...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-[#F0FDFA] rounded-2xl flex items-center justify-center text-[#0D9488]">
                  <Upload className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#134E4A] mb-2">Upload PDF Document</h2>
                  <p className="text-[#134E4A]/60 font-medium">Extract all pages into high-quality images</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Options Panel */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#F0FDFA] rounded-xl flex items-center justify-center text-[#0D9488]">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-[#134E4A] tracking-tight">{fileName}</p>
                    <p className="text-sm font-medium text-[#134E4A]/60">{pageCount} pages total</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-8 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-[#134E4A]">Format</span>
                    <div className="flex bg-white p-1 rounded-xl border border-[#E2E8F0]">
                      {(['png', 'jpeg'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setFormat(fmt)}
                          className={`px-5 py-2 rounded-lg text-sm font-bold uppercase transition-all ${
                            format === fmt
                              ? 'bg-[#0D9488] text-white shadow-sm'
                              : 'text-[#134E4A]/60 hover:text-[#134E4A]'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-[#134E4A]">Quality</span>
                    <div className="flex bg-white p-1 rounded-xl border border-[#E2E8F0]">
                      {[
                        { s: 1, label: 'Standard' },
                        { s: 2, label: 'High' },
                        { s: 3, label: 'Max' },
                      ].map((opt) => (
                        <button
                          key={opt.s}
                          onClick={() => setScale(opt.s)}
                          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                            scale === opt.s
                              ? 'bg-[#0D9488] text-white shadow-sm'
                              : 'text-[#134E4A]/60 hover:text-[#134E4A]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Previews Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {previews.map((thumb, idx) => (
                <div
                  key={idx}
                  className="group relative bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden hover:border-[#0D9488] hover:shadow-xl transition-all cursor-default"
                >
                  <img src={thumb} alt={`Page ${idx + 1}`} className="w-full h-auto bg-gray-50" />
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleDownloadSingle(idx + 1)}
                      className="bg-[#F97316] text-white p-4 rounded-full hover:bg-[#EA580C] hover:scale-110 transition-all shadow-lg"
                    >
                      <Download className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-[#134E4A]">
                    Page {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
