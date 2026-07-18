const fs = require('fs');

let content = fs.readFileSync('src/lib/pdf/engine.ts', 'utf-8');

// Remove static import
content = content.replace("import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';\n", "");

// Add helper
const helper = `
let _pdfLib: typeof import('pdf-lib') | null = null;
async function getPdfLib() {
  if (!_pdfLib) {
    _pdfLib = await import('pdf-lib');
  }
  return _pdfLib;
}
`;

content = content.replace("import type { WatermarkOptions", helper + "\nimport type { WatermarkOptions");

// Find all export async function declarations
const funcPattern = /(export async function [^\(]+\([^\)]*\)(?: *: *Promise<[^>]+>)? *\{)/g;

content = content.replace(funcPattern, (match) => {
  return match + "\n  const { PDFDocument, rgb, StandardFonts, degrees } = await getPdfLib();";
});

fs.writeFileSync('src/lib/pdf/engine.ts', content);
console.log('Done!');
