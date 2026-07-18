'use client';
/* eslint-disable @next/next/no-img-element -- previews are local data URLs; next/image not applicable */

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ToastContainer } from '@/components/ui/toast-container';
import { useToastStore } from '@/components/ui/ToastProvider';
import { imagesToPDF, downloadPDF } from '@/lib/pdf/engine';
import { ArrowLeft, FileImage, Upload, Download, Loader2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface ImageFile {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export default function ImageToPdfPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newImages: ImageFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const dims = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = dataUrl;
      });
      newImages.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        dataUrl,
        ...dims,
      });
    }
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const moveImage = (index: number, dir: 'up' | 'down') => {
    const arr = [...images];
    const swapIdx = dir === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]];
    setImages(arr);
  };

  const handleConvert = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfBytes = await imagesToPDF(images.map((i) => ({ dataUrl: i.dataUrl, width: i.width, height: i.height })));
      downloadPDF(pdfBytes, 'images-to-pdf.pdf');
      addToast({ type: 'success', message: 'PDF created!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to convert images.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <ToastContainer />
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[#64748B] hover:text-[#0F172A]"><ArrowLeft className="w-5 h-5" /></Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#0891B2] rounded-lg flex items-center justify-center">
                <FileImage className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-[#0F172A]">Image to PDF</h1>
            </div>
          </div>
          <Button onClick={handleConvert} disabled={images.length === 0 || isProcessing}
            className="bg-[#0891B2] hover:bg-[#0E7490] text-white">
            {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Converting...</>
              : <><Download className="w-4 h-4 mr-2" /> Convert & Download</>}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#E2E8F0] hover:border-[#0891B2] rounded-2xl p-10 text-center cursor-pointer bg-white mb-6">
          <Upload className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
          <p className="text-lg font-semibold text-[#0F172A]">Drop images here</p>
          <p className="text-sm text-[#64748B]">PNG, JPG, WEBP — arrange order, then convert</p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <motion.div key={img.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="relative bg-white rounded-xl border border-[#E2E8F0] overflow-hidden group">
                <img src={img.dataUrl} alt={img.name} className="w-full h-40 object-contain p-2" />
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">{idx + 1}</div>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/80" onClick={() => moveImage(idx, 'up')} disabled={idx === 0}>
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/80" onClick={() => moveImage(idx, 'down')} disabled={idx === images.length - 1}>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/80 text-red-500" onClick={() => setImages((p) => p.filter((i) => i.id !== img.id))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-[#64748B] px-2 py-1 truncate border-t border-[#E2E8F0]">{img.name}</p>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
