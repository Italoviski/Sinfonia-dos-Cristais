import fs from 'node:fs';

globalThis.window = globalThis;
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};

class ImageData {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
}
globalThis.ImageData = ImageData;

class Image {
  constructor() {
    this._src = '';
    setTimeout(() => this.onload?.(), 2);
  }
  get src() { return this._src; }
  set src(v) { this._src = v; }
}
globalThis.Image = Image;

class Audio {
  constructor() {
    this._src = '';
    this.paused = true;
    this.currentTime = 0;
  }
  load() {}
  play() { return Promise.resolve(); }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
}
globalThis.Audio = Audio;

const mockContext = () => ({
  save: () => {}, restore: () => {}, clip: () => {}, translate: () => {}, scale: () => {},
  fillRect: () => {}, strokeRect: () => {}, drawImage: () => {}, clearRect: () => {},
  setTransform: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
  arc: () => {}, fill: () => {}, stroke: () => {}, closePath: () => {}, rect: () => {},
  createRadialGradient: () => ({ addColorStop: () => {} }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createImageData: (w, h) => new ImageData(w, h),
  getImageData: (x, y, w, h) => new ImageData(w, h),
  putImageData: () => {}, fillText: () => {}, measureText: () => ({ width: 40 })
});

const mockElement = (tag) => ({
  tagName: tag.toUpperCase(),
  style: {},
  classList: { add: () => {}, remove: () => {}, toggle: () => false, contains: () => false },
  setAttribute: () => {}, getAttribute: () => null, appendChild: (c) => c, append: () => {},
  remove: () => {}, addEventListener: () => {}, removeEventListener: () => {},
  getContext: () => mockContext(),
  toDataURL: () => 'data:image/png;base64,AA==',
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 })
});

globalThis.document = {
  createElement: mockElement,
  getElementById: () => mockElement('div'),
  querySelector: () => null,
  querySelectorAll: () => [],
  body: mockElement('body'),
  addEventListener: () => {},
  removeEventListener: () => {},
  readyState: 'complete'
};

const engineCode = fs.readFileSync('js/true-pixel-engine.js', 'utf8');
const caveCode = fs.readFileSync('js/true-pixel-cave.js', 'utf8');
const worldsCode = fs.readFileSync('js/true-pixel-worlds.js', 'utf8');

eval(engineCode);
const E = globalThis.TruePixelEngine;

console.log('Testing TruePixelEngine text measurement & wrapping...');

function auditCode(code, name, textW = 185, maxLines = 3) {
  const regex = /text:\s*['"]([^'"]+)['"]/g;
  let match;
  let count = 0;
  let overflows = [];
  while ((match = regex.exec(code)) !== null) {
    const text = match[1];
    if (text.length < 15 || text.includes('px') || text.includes('rgba') || text.includes('http')) continue;
    count++;
    const lines = E.wrapPixelLines(text, textW);
    if (lines.length > maxLines) {
      overflows.push({ text, lines: lines.length, wrapped: lines });
    }
  }
  console.log(`[${name}] Checked ${count} texts with textW=${textW}. Overflows (> ${maxLines} lines): ${overflows.length}`);
  for (const o of overflows) {
    console.log(`  - [${o.lines} lines]: "${o.text}"`);
    o.wrapped.forEach((l, idx) => console.log(`      L${idx+1}: "${l}" (${E.measurePixelText(l)}px)`));
  }
  return overflows;
}

const caveOver = auditCode(caveCode, 'CaveChapter1', 185, 3);
const worldsOver = auditCode(worldsCode, 'TruePixelWorlds', 185, 3);

// Check Tutorial Cards
console.log('\nAuditing Tutorial Cards...');
const cards = E.StandardTutorialCards;
if (cards) {
  for (const [key, cardList] of Object.entries(cards)) {
    for (let cIdx = 0; cIdx < cardList.length; cIdx++) {
      const card = cardList[cIdx];
      const titleW = E.measurePixelText(card.title || '');
      if (titleW > 220) {
        console.log(`Card ${key}[${cIdx}] title too wide: ${titleW}px: "${card.title}"`);
      }
      if (card.lines) {
        for (const line of card.lines) {
          const lW = E.measurePixelText(line);
          if (lW > 240) {
            console.log(`Card ${key}[${cIdx}] line exceeds 240px (${lW}px): "${line}"`);
          }
        }
      }
    }
  }
}

console.log('\nAuditing Karaoke Phrases in Cave...');
eval(caveCode);
const Karaoke = globalThis.CaveRhythmKaraoke;
if (Karaoke) {
  let karaokeOverflows = 0;
  let maxW = 0;
  for (let i = 0; i < Karaoke.phrases.length; i++) {
    const p = Karaoke.phrases[i];
    if (p.words && p.words.length > 0) {
      const firstW = p.words[0];
      const lastW = p.words[p.words.length - 1];
      const totalW = (lastW.x + lastW.width) - firstW.x;
      if (totalW > maxW) maxW = totalW;
      if (totalW > 260) {
        console.log(`Karaoke Phrase ${i} totalW=${totalW}px (>260px!):`, p.words.map(w => w.text).join(' '));
        karaokeOverflows++;
      }
    }
  }
  console.log(`Karaoke phrases total checked: ${Karaoke.phrases.length}, maxW: ${maxW}px, overflows (>260px): ${karaokeOverflows}`);
}
