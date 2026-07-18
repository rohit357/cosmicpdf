'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToastContainer } from '@/components/ui/toast-container';
import { useToastStore } from '@/components/ui/ToastProvider';
import { compressPDF, downloadPDF } from '@/lib/pdf/engine';
import { ArrowLeft, FileDown, Upload, Download, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';

export default function CompressToolPage() {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('');
  const [originalSize, setOriginalSize] = useState(0);
  const [quality, setQuality] = useState(0.6);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    setPdfBytes(bytes);
    setFileName(file.name);
    setOriginalSize(file.size);
  };

  const handleCompress = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const compressed = await compressPDF(pdfBytes, { quality });
      const reduction = ((originalSize - compressed.length) / originalSize * 100).toFixed(1);
      downloadPDF(compressed, `${fileName.replace('.pdf', '')}-compressed.pdf`);
      addToast({
        type: 'success',
        message: `Compressed! Reduced by ${reduction}% (${formatSize(originalSize)} → ${formatSize(compressed.length)})`,
      });
    } catch {
      addToast({ type: 'error', message: 'Failed to compress PDF.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <ToastContainer />
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-[#64748B] hover:text-[#0F172A]"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#D97706] rounded-lg flex items-center justify-center">
              <FileDown className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-[#0F172A]">Compress PDF</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {!pdfBytes ? (
          <div onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#E2E8F0] hover:border-[#D97706] rounded-2xl p-10 text-center cursor-pointer bg-white">
            <Upload className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
            <p className="text-lg font-semibold text-[#0F172A]">Upload a PDF to compress</p>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-5 h-5 text-[#D97706]" />
                <div>
                  <p className="font-medium text-[#0F172A]">{fileName}</p>
                  <p className="text-sm text-[#64748B]">Original size: {formatSize(originalSize)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#0F172A] mb-3 block">
                  Compression Quality: {Math.round(quality * 100)}%
                </label>
                <Slider
                  value={[quality * 100]}
                  onValueChange={(val) => setQuality((Array.isArray(val) ? val[0] : val) / 100)}
                  min={10}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-[#64748B] mt-1">
                  <span>Smallest file</span>
                  <span>Best quality</span>
                </div>
              </div>
            </div>

            <Button onClick={handleCompress} disabled={isProcessing}
              className="bg-[#D97706] hover:bg-[#B45309] text-white w-full py-6 text-base">
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Compressing...</>
                : <><Download className="w-4 h-4 mr-2" /> Compress & Download</>}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
