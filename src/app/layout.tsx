import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// viewportFit 'cover' lets the app draw behind notches/home bars;
// safe-area-inset-* env() padding keeps interactive chrome clear of them.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "CosmicPDF — Modern PDF Tools.",
  description:
    "100% free, 100% private browser-based PDF editor. Edit, sign, merge, split, compress, and annotate PDFs — all without uploading your files. Zero server uploads. Works offline.",
  keywords: [
    "PDF editor",
    "free PDF editor",
    "online PDF editor",
    "merge PDF",
    "split PDF",
    "sign PDF",
    "compress PDF",
    "annotate PDF",
    "browser PDF editor",
    "private PDF editor",
  ],
  authors: [{ name: "Rohit Sharma" }],
  openGraph: {
    title: "CosmicPDF — Free. Private. Powerful.",
    description:
      "Edit PDFs entirely in your browser. No uploads, no signups, no bs.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
