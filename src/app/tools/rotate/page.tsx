'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ToastContainer } from '@/components/ui/toast-container';
import { useToastStore } from '@/components/ui/ToastProvider';
import { rotateAllPages, downloadPDF } from '@/lib/pdf/engine';
import { ArrowLeft, RotateCw, Upload, Download, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';

export default function RotateToolPage() {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('');
  const [rotation, setRotation] = useState(90);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    setPdfBytes(new Uint8Array(await file.arrayBuffer()));
    setFileName(file.name);
  };

  const handleRotate = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const rotated = await rotateAllPages(pdfBytes, rotation);
      downloadPDF(rotated, `${fileName.replace('.pdf', '')}-rotated.pdf`);
      addToast({ type: 'success', message: `Rotated ${rotation}° successfully!` });
    } catch {
      addToast({ type: 'error', message: 'Failed to rotate PDF.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <ToastContainer />
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-[#64748B] hover:text-[#0F172A]"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <RotateCw className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-[#0F172A]">Rotate PDF</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {!pdfBytes ? (
          <div onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#E2E8F0] hover:border-[#2563EB] rounded-2xl p-10 text-center cursor-pointer bg-white">
            <Upload className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
            <p className="text-lg font-semibold text-[#0F172A]">Upload a PDF to rotate</p>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-5 h-5 text-[#2563EB]" />
                <p className="font-medium text-[#0F172A]">{fileName}</p>
              </div>
              <div className="flex gap-3">
                {[90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setRotation(deg)}
                    className={`flex-1 py-4 rounded-xl text-center transition-all ${rotation === deg
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]'}`}
                  >
                    <RotateCw className={`w-6 h-6 mx-auto mb-1`} style={{ transform: `rotate(${deg}deg)` }} />
                    <span className="text-sm font-medium">{deg}°</span>
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleRotate} disabled={isProcessing}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white w-full py-6 text-base">
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rotating...</>
                : <><Download className="w-4 h-4 mr-2" /> Rotate & Download</>}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
