'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ToastContainer } from '@/components/ui/toast-container';
import { useToastStore } from '@/components/ui/ToastProvider';
import { mergePDFs, downloadPDF } from '@/lib/pdf/engine';
import {
  FileText, Upload, Merge, Trash2, GripVertical,
  ArrowLeft, Download, Loader2, ChevronUp, ChevronDown
} from 'lucide-react';
import Link from 'next/link';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
}

export default function MergeToolPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: UploadedFile[] = [];
      for (const file of Array.from(fileList)) {
        if (file.type !== 'application/pdf') {
          addToast({ type: 'error', message: `${file.name} is not a PDF.` });
          continue;
        }
        if (file.size > 100 * 1024 * 1024) {
          addToast({ type: 'error', message: `${file.name} is too large (max 100MB).` });
          continue;
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        newFiles.push({
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          bytes,
        });
      }
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [addToast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newFiles.length) return;
    [newFiles[index], newFiles[swapIndex]] = [newFiles[swapIndex], newFiles[index]];
    setFiles(newFiles);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      addToast({ type: 'warning', message: 'Please upload at least 2 PDFs to merge.' });
      return;
    }

    setIsProcessing(true);
    try {
      const merged = await mergePDFs(files.map((f) => f.bytes));
      downloadPDF(merged, 'merged.pdf');
      addToast({ type: 'success', message: 'PDFs merged successfully!' });
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', message: 'Failed to merge PDFs.' });
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

      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[#64748B] hover:text-[#0F172A] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#DC2626] rounded-lg flex items-center justify-center">
                <Merge className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-[#0F172A]">Merge PDFs</h1>
            </div>
          </div>
          <Button
            onClick={handleMerge}
            disabled={files.length < 2 || isProcessing}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Merging...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Merge & Download</>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#E2E8F0] hover:border-[#DC2626] rounded-2xl p-10 text-center cursor-pointer transition-all bg-white hover:bg-red-50/30"
        >
          <Upload className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
          <p className="text-lg font-semibold text-[#0F172A] mb-1">Drop PDFs here or click to browse</p>
          <p className="text-sm text-[#64748B]">Upload multiple PDF files to merge them into one</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-8 space-y-3">
            <p className="text-sm font-medium text-[#64748B]">
              {files.length} file{files.length !== 1 ? 's' : ''} — drag to reorder
            </p>
            {files.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 bg-white rounded-xl border border-[#E2E8F0] px-4 py-3 hover:shadow-sm transition-all"
              >
                <GripVertical className="w-4 h-4 text-[#CBD5E1] cursor-grab" />
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#DC2626]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] truncate">{file.name}</p>
                  <p className="text-xs text-[#64748B]">{formatSize(file.size)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveFile(index, 'up')}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveFile(index, 'down')}
                    disabled={index === files.length - 1}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#64748B] hover:text-[#DC2626]"
                    onClick={() => removeFile(file.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
