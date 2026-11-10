// Gera o mapa limpo (sem placas duplicadas nem marcadores de pedra pintados) a partir da arte original.
// Uso: node scripts/build-clean-map.mjs <origem.png>
// Pipeline: reduÃ§Ã£o por Ã¡rea para 640x360 nativo -> profundidade de cor 5 bits (SNES) -> ampliaÃ§Ã£o nearest para 1672x941.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
const outDir = 'assets/story/interface-extra/';
const data = 'data:image/png;base64,' + readFileSync(src).toString('base64');
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
const [native, full] = await page.evaluate(async (url) => {
  const img = new Image(); img.src = url; await img.decode();
  const W = 640, H = 360, sx = img.width / W, sy = img.height / H;
  const a = new OffscreenCanvas(img.width, img.height), ac = a.getContext('2d'); ac.drawImage(img, 0, 0);
  const s = ac.getImageData(0, 0, img.width, img.height).data;
  const n = new OffscreenCanvas(W, H), nc = n.getContext('2d'), out = nc.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    let r = 0, g = 0, b = 0, c = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * img.width + xx) * 4; r += s[i]; g += s[i + 1]; b += s[i + 2]; c++; }
    const q = (v) => Math.min(255, Math.round(v / c / 8) * 8), o = (y * W + x) * 4;
    out.data[o] = q(r); out.data[o + 1] = q(g); out.data[o + 2] = q(b); out.data[o + 3] = 255;
  }
  nc.putImageData(out, 0, 0);
  const f = new OffscreenCanvas(1672, 941), fc = f.getContext('2d'); fc.imageSmoothingEnabled = false; fc.drawImage(n, 0, 0, 1672, 941);
  const toUrl = async (c) => { const blob = await c.convertToBlob({ type: 'image/png' }); return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); }); };
  return [await toUrl(n), await toUrl(f)];
}, data);
const save = (name, url) => writeFileSync(outDir + name, Buffer.from(url.split(',')[1], 'base64'));
save('mapa-true-pixel-native-640x360.png', native);
save('mapa-sem-personagem.png', full);
await browser.close();
console.log('Mapa limpo gerado.');
