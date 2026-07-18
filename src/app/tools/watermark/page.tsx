'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToastContainer } from '@/components/ui/toast-container';
import { useToastStore } from '@/components/ui/ToastProvider';
import { addWatermark, downloadPDF } from '@/lib/pdf/engine';
import { ArrowLeft, Stamp, Upload, Download, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import type { WatermarkOptions } from '@/types';

export default function WatermarkToolPage() {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [options, setOptions] = useState<WatermarkOptions>({
    text: 'CONFIDENTIAL',
    fontSize: 48,
    fontFamily: 'Helvetica',
    color: '#DC2626',
    opacity: 0.2,
    rotation: -45,
    position: 'diagonal',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    setPdfBytes(new Uint8Array(await file.arrayBuffer()));
    setFileName(file.name);
  };

  const handleApply = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const result = await addWatermark(pdfBytes, options);
      downloadPDF(result, `${fileName.replace('.pdf', '')}-watermarked.pdf`);
      addToast({ type: 'success', message: 'Watermark applied!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to apply watermark.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const positions: WatermarkOptions['position'][] = ['diagonal', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <ToastContainer />
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-[#64748B] hover:text-[#0F172A]"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center">
              <Stamp className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-[#0F172A]">Add Watermark</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {!pdfBytes ? (
          <div onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#E2E8F0] hover:border-[#7C3AED] rounded-2xl p-10 text-center cursor-pointer bg-white">
            <Upload className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
            <p className="text-lg font-semibold text-[#0F172A]">Upload a PDF to watermark</p>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-[#7C3AED]" />
                <p className="font-medium text-[#0F172A]">{fileName}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-[#0F172A] mb-1 block">Watermark Text</label>
                <input type="text" value={options.text}
                  onChange={(e) => setOptions({ ...options, text: e.target.value })}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="text-sm font-medium text-[#0F172A] mb-1 block">Font Size: {options.fontSize}px</label>
                <Slider value={[options.fontSize]} onValueChange={(val) => setOptions({ ...options, fontSize: Array.isArray(val) ? val[0] : val })} min={12} max={120} step={2} />
              </div>

              <div>
                <label className="text-sm font-medium text-[#0F172A] mb-1 block">Color</label>
                <input type="color" value={options.color} onChange={(e) => setOptions({ ...options, color: e.target.value })} className="w-10 h-8 cursor-pointer" />
              </div>

              <div>
                <label className="text-sm font-medium text-[#0F172A] mb-1 block">Opacity: {Math.round(options.opacity * 100)}%</label>
                <Slider value={[options.opacity * 100]} onValueChange={(val) => setOptions({ ...options, opacity: (Array.isArray(val) ? val[0] : val) / 100 })} min={5} max={100} step={5} />
              </div>

              <div>
                <label className="text-sm font-medium text-[#0F172A] mb-2 block">Position</label>
                <div className="grid grid-cols-3 gap-2">
                  {positions.map((pos) => (
                    <button key={pos} onClick={() => setOptions({ ...options, position: pos })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${options.position === pos
                        ? 'bg-[#7C3AED] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]'}`}>
                      {pos.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleApply} disabled={isProcessing}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white w-full py-6 text-base">
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying...</>
                : <><Download className="w-4 h-4 mr-2" /> Apply & Download</>}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
