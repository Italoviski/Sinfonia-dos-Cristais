#!/usr/bin/env node
/**
 * True Pixel Art Sprite & Scenery Auditor
 * Inspects all PNG files in assets/ for:
 * - Exact dimensions & aspect ratios
 * - Grid divisibility (e.g., 4x4, 4x3, 4x5, 3x3, 2x2)
 * - Presence of non-integer cell sizes (which cause mixels and UV jitter)
 * - Alpha channel cleanliness (detecting blurry semi-transparent anti-aliasing halos)
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const assetsDir = join(root, 'assets');

const EXPECTED_GRIDS = [
  { match: /16-quadros/i, cols: 4, rows: 4, role: 'character-16' },
  { match: /12-quadros/i, cols: 4, rows: 3, role: 'character-or-fx-12' },
  { match: /8-quadros/i, cols: 4, rows: 2, role: 'map-fairy-8' },
  { match: /20-quadros/i, cols: 4, rows: 5, role: 'transition-20' },
  { match: /quatro-estados|porta-estados|porta-abertura|paineis-mundos/i, cols: 2, rows: 2, role: 'quad-atlas-2x2' },
  { match: /pixel-gems/i, cols: 3, rows: 3, role: 'gems-3x3' },
  { match: /pixel-ecology/i, cols: 4, rows: 3, role: 'ecology-4x3' }
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.png')) files.push(full);
  }
  return files;
}

function parsePngInfo(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('Invalid PNG header');
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf.readUInt8(24);
  const colorType = buf.readUInt8(25);
  return { width, height, bitDepth, colorType, hasAlpha: colorType === 6 || colorType === 4 };
}

function analyzeAlphaAndColors(buf, info) {
  if (info.bitDepth !== 8 || (info.colorType !== 6 && info.colorType !== 2)) {
    return { semiTransparentRatio: null };
  }
  const idatParts = [];
  let offset = 8;
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') idatParts.push(buf.subarray(offset + 8, offset + 8 + len));
    if (type === 'IEND') break;
    offset += 12 + len;
  }
  try {
    const raw = inflateSync(Buffer.concat(idatParts));
    const bpp = info.colorType === 6 ? 4 : 3;
    const stride = info.width * bpp + 1;
    let totalPixels = 0;
    let semiTransparent = 0;
    let opaque = 0;
    for (let y = 0; y < info.height; y++) {
      const rowStart = y * stride + 1;
      for (let x = 0; x < info.width; x++) {
        totalPixels++;
        if (bpp === 4) {
          const a = raw[rowStart + x * 4 + 3];
          if (a > 0) {
            if (a < 250 && a > 5) semiTransparent++;
            else opaque++;
          }
        } else {
          opaque++;
        }
      }
    }
    const visible = Math.max(1, opaque + semiTransparent);
    return {
      semiTransparentRatio: bpp === 4 ? Number(((semiTransparent / visible) * 100).toFixed(2)) : 0
    };
  } catch {
    return { semiTransparentRatio: null };
  }
}

const files = await walk(assetsDir);
const results = [];
let warnings = 0;

for (const file of files) {
  const rel = relative(root, file).replace(/\\/g, '/');
  const buf = await readFile(file);
  const info = parsePngInfo(buf);
  const alphaStats = analyzeAlphaAndColors(buf, info);
  const issues = [];

  const gridSpec = EXPECTED_GRIDS.find(g => g.match.test(rel));
  let cellInfo = 'single-frame';
  if (gridSpec) {
    const cellW = info.width / gridSpec.cols;
    const cellH = info.height / gridSpec.rows;
    cellInfo = `${gridSpec.cols}x${gridSpec.rows} (${cellW.toFixed(1)}x${cellH.toFixed(1)}px)`;
    if (!Number.isInteger(cellW) || !Number.isInteger(cellH)) {
      issues.push(`Célula não-inteira (${cellW.toFixed(2)}×${cellH.toFixed(2)}px) -> causa mixels e desalinhamento de âncora`);
    }
  }

  if (alphaStats.semiTransparentRatio !== null && alphaStats.semiTransparentRatio > 8) {
    issues.push(`Alto índice de pixels semitransparentes (${alphaStats.semiTransparentRatio}%) -> anti-aliasing suave em vez de contorno pixelado 1-bit`);
  }

  if (issues.length) warnings++;
  results.push({
    file: rel,
    dimensions: `${info.width}×${info.height}`,
    alpha: info.hasAlpha ? 'RGBA' : 'RGB',
    grid: cellInfo,
    semiAlphaPct: alphaStats.semiTransparentRatio !== null ? `${alphaStats.semiTransparentRatio}%` : 'N/A',
    status: issues.length ? '⚠️ REQUER CONVERSÃO PIXEL ART' : '✅ OK',
    issues
  });
}

console.log('=== AUDITORIA DE PIXEL ART E GRADES DE SPRITES (SINFONIA DOS CRISTAIS) ===\n');
console.table(
  results.map(r => ({
    Arquivo: r.file,
    Dimensões: r.dimensions,
    Canal: r.alpha,
    Grade: r.grid,
    SemiAlfa: r.semiAlphaPct,
    Status: r.status
  }))
);

if (warnings > 0) {
  console.log(`\nForam detectados ${warnings} arquivos com problemas de grade não-inteira ou anti-aliasing de IA:`);
  for (const r of results.filter(x => x.issues.length)) {
    console.log(` - ${r.file}: ${r.issues.join(' | ')}`);
  }
}
