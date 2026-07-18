'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePdfStore } from '@/store/pdfStore';
import { useToastStore } from '@/components/ui/ToastProvider';
import { ToastContainer } from '@/components/ui/toast-container';
import {
  FileText, Upload, Shield, Zap, Merge, Scissors, RotateCw,
  PenTool, Image, FileDown, Stamp, Lock,
  EyeOff, ScanLine, ArrowUpDown, Trash2, Maximize2
} from 'lucide-react';
import Link from 'next/link';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const tools = [
  {
    name: 'Edit & Annotate',
    description: 'Text, highlights, shapes, signatures — full annotation suite.',
    icon: PenTool,
    color: '#6366F1',
    glow: 'rgba(99,102,241,0.35)',
    href: null, // opens via file upload → editor
    isEditor: true,
  },
  {
    name: 'Merge PDFs',
    description: 'Combine multiple documents into one seamlessly.',
    icon: Merge,
    color: '#10B981',
    glow: 'rgba(16,185,129,0.35)',
    href: '/tools/merge',
  },
  {
    name: 'Split PDF',
    description: 'Extract specific pages or ranges into new files.',
    icon: Scissors,
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.35)',
    href: '/tools/split',
  },
  {
    name: 'Compress',
    description: 'Slash file size with real JPEG re-encoding.',
    icon: FileDown,
    color: '#EC4899',
    glow: 'rgba(236,72,153,0.35)',
    href: '/tools/compress',
  },
  {
    name: 'Rotate Pages',
    description: 'Rotate individual or all pages in any direction.',
    icon: RotateCw,
    color: '#8B5CF6',
    glow: 'rgba(139,92,246,0.35)',
    href: '/tools/rotate',
  },
  {
    name: 'Watermark',
    description: 'Stamp text watermarks with custom size and opacity.',
    icon: Stamp,
    color: '#06B6D4',
    glow: 'rgba(6,182,212,0.35)',
    href: '/tools/watermark',
  },
  {
    name: 'Image → PDF',
    description: 'Convert JPG/PNG images into a professional PDF.',
    icon: Image,
    color: '#F97316',
    glow: 'rgba(249,115,22,0.35)',
    href: '/tools/img-to-pdf',
  },
  {
    name: 'PDF → Images',
    description: 'Export every page as high-res PNG or JPG.',
    icon: ScanLine,
    color: '#14B8A6',
    glow: 'rgba(20,184,166,0.35)',
    href: '/tools/pdf-to-img',
  },
  {
    name: 'Reorder Pages',
    description: 'Drag-and-drop page ordering, then export.',
    icon: ArrowUpDown,
    color: '#A855F7',
    glow: 'rgba(168,85,247,0.35)',
    href: null,
    isEditor: true,
  },
  {
    name: 'Delete Pages',
    description: 'Select and remove unwanted pages instantly.',
    icon: Trash2,
    color: '#EF4444',
    glow: 'rgba(239,68,68,0.35)',
    href: null,
    isEditor: true,
  },
  {
    name: 'Redact',
    description: 'Black out sensitive content permanently.',
    icon: EyeOff,
    color: '#1E293B',
    glow: 'rgba(30,41,59,0.5)',
    href: null,
    isEditor: true,
  },
  {
    name: 'Inflate PDF',
    description: 'Pad file size to meet minimum upload requirements.',
    icon: Maximize2,
    color: '#0EA5E9',
    glow: 'rgba(14,165,233,0.35)',
    href: null,
    isEditor: true,
  },
];

const stats = [
  { value: '100%', label: 'Client-side' },
  { value: '0', label: 'Server uploads' },
  { value: '12+', label: 'PDF tools' },
  { value: 'Free', label: 'Forever' },
];

export default function HomePage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setFile = usePdfStore((s) => s.setFile);
  const addToast = useToastStore((s) => s.addToast);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        addToast({ type: 'error', message: 'Please upload a PDF file.' });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        addToast({ type: 'error', message: 'File too large. Maximum 100MB.' });
        return;
      }
      setIsLoading(true);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        setFile(file.name, bytes);
        router.push('/editor');
      } catch {
        addToast({ type: 'error', message: 'Failed to read file.' });
        setIsLoading(false);
      }
    },
    [setFile, router, addToast]
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="min-h-screen bg-[#060812] text-white font-sans overflow-x-hidden">
      <ToastContainer />

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center">
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#6366F1] animate-spin" />
            </div>
            <p className="text-lg font-semibold text-white/80 tracking-wide">Loading PDF…</p>
          </div>
        </div>
      )}

      {/* Ambient gradient mesh background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#6366F1]/20 blur-[120px]" />
        <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] rounded-full bg-[#EC4899]/15 blur-[120px]" />
        <div className="absolute bottom-0 left-[20%] w-[700px] h-[400px] rounded-full bg-[#10B981]/10 blur-[120px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#6366F1]/30 group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">CosmicPDF</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
            <Link href="/tools/merge" className="hover:text-white transition-colors">Merge</Link>
            <Link href="/tools/split" className="hover:text-white transition-colors">Split</Link>
            <Link href="/tools/compress" className="hover:text-white transition-colors">Compress</Link>
            <Link href="/tools/pdf-to-img" className="hover:text-white transition-colors">PDF→Image</Link>
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer px-4 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-md shadow-[#6366F1]/30"
          >
            Open PDF
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 mb-7 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-bold tracking-widest uppercase text-[#A5B4FC]"
          >
            <Lock className="w-3 h-3" /> 100% Local · No Uploads · No Tracking
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-6xl md:text-8xl font-black tracking-tight leading-[1.05] mb-6"
          >
            <span className="text-white">CosmicPDF.</span>
            <br />
            <span className="bg-gradient-to-r from-[#6366F1] via-[#A78BFA] to-[#EC4899] bg-clip-text text-transparent">
              Privacy Focused.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="text-lg md:text-xl text-white/50 font-medium max-w-2xl mx-auto mb-12"
          >
            Edit, annotate, merge, split, compress, convert — all in your browser.
            Your files never leave your device.
          </motion.p>

          {/* Upload zone */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.22 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`
                relative mx-auto max-w-xl cursor-pointer rounded-3xl border-2 p-12
                transition-all duration-200
                ${isDragging
                  ? 'border-[#6366F1] bg-[#6366F1]/10 scale-[1.02]'
                  : 'border-white/10 bg-white/[0.03] hover:border-[#6366F1]/60 hover:bg-white/[0.06] hover:-translate-y-0.5'
                }
              `}
            >
              {/* Corner accents */}
              <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-[#6366F1]/60 rounded-tl-lg" />
              <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-[#6366F1]/60 rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-[#6366F1]/60 rounded-bl-lg" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-[#6366F1]/60 rounded-br-lg" />

              <div className="flex flex-col items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-2xl shadow-[#6366F1]/40">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white mb-1">Drop PDF here</p>
                  <p className="text-sm text-white/40">or click to browse — max 100MB</p>
                </div>
                <div className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-bold text-sm shadow-lg shadow-[#6366F1]/30 hover:opacity-90 transition-opacity">
                  Select PDF File
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 py-8 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
              className="text-center"
            >
              <div className="text-3xl font-black bg-gradient-to-r from-[#A78BFA] to-[#6366F1] bg-clip-text text-transparent">{s.value}</div>
              <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tools Grid */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Everything you need.</h2>
            <p className="text-white/40 text-lg">Click any card to launch the tool instantly.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tools.map((tool, i) => {
              const Icon = tool.icon;
              const content = (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="relative group cursor-pointer rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 overflow-hidden transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07]"
                  style={{ boxShadow: `0 0 0 0 ${tool.glow}` }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 40px -8px ${tool.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${tool.glow}`;
                  }}
                >
                  {/* Glow orb */}
                  <div
                    className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-300"
                    style={{ background: tool.glow }}
                  />

                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-md"
                    style={{ background: `${tool.color}22`, border: `1px solid ${tool.color}44` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: tool.color }} />
                  </div>

                  <h3 className="font-bold text-white text-base mb-1.5">{tool.name}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{tool.description}</p>

                  {tool.isEditor && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">
                      Upload PDF
                    </span>
                  )}
                </motion.div>
              );

              if (tool.href) {
                return <Link key={tool.name} href={tool.href} className="block">{content}</Link>;
              }

              return (
                <div
                  key={tool.name}
                  onClick={() => fileInputRef.current?.click()}
                  className="block"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Privacy callout */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-12 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1]/5 via-transparent to-[#EC4899]/5 pointer-events-none" />
            <Shield className="w-12 h-12 mx-auto mb-5" style={{ color: '#6366F1' }} />
            <h3 className="text-3xl font-black text-white mb-3">Your data stays yours.</h3>
            <p className="text-white/50 max-w-xl mx-auto text-lg">
              All processing runs directly in your browser using WebAssembly and Canvas APIs.
              No uploads. No storage. No tracking.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              {['No server', 'No account needed', 'No hidden costs', 'Open in browser'].map((f) => (
                <span key={f} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white/60">
                  <Zap className="w-3.5 h-3.5 inline mr-1.5 text-[#6366F1]" />{f}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white/70">CosmicPDF</span>
          </div>
          <p>Local-first. Privacy-first. Free forever.</p>
        </div>
      </footer>
    </div>
  );
}
