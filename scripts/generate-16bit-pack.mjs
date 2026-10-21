import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const OUT_DIR = join(process.cwd(), 'pacote-equipe-16bits');
const ASSETS_DIR = join(OUT_DIR, 'assets');

for (const sub of ['personagens', 'prologo-undertale', 'cristais', 'efeitos', 'cenarios', 'ui']) {
  mkdirSync(join(ASSETS_DIR, sub), { recursive: true });
}

// === RAW LOSSLESS PNG ENCODER (TRUE PIXEL ART RGBA, ZERO COMPRESSION ARTIFACTS) ===
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // Filter type 0 (None)
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function createSurface(w, h) {
  const data = new Uint8Array(w * h * 4);
  const parseHex = hex => {
    const s = hex.replace('#', '');
    return [
      parseInt(s.slice(0, 2), 16),
      parseInt(s.slice(2, 4), 16),
      parseInt(s.slice(4, 6), 16),
      s.length === 8 ? parseInt(s.slice(6, 8), 16) : 255
    ];
  };
  const cache = new Map();
  const col = hex => {
    if (!cache.has(hex)) cache.set(hex, parseHex(hex));
    return cache.get(hex);
  };
  const pset = (x, y, hex) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= w || y < 0 || y >= h || !hex) return;
    const [r, g, b, a] = col(hex);
    const idx = (y * w + x) * 4;
    data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
  };
  const rect = (x0, y0, rw, rh, hex) => {
    x0 = Math.round(x0); y0 = Math.round(y0); rw = Math.round(rw); rh = Math.round(rh);
    const sx = rw < 0 ? x0 + rw : x0, ex = rw < 0 ? x0 : x0 + rw;
    const sy = rh < 0 ? y0 + rh : y0, ey = rh < 0 ? y0 : y0 + rh;
    for (let y = sy; y < ey; y++) for (let x = sx; x < ex; x++) pset(x, y, hex);
  };
  const line = (x0, y0, x1, y1, hex) => {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      pset(x0, y0, hex);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  const circle = (cx, cy, r, hex, fill = false) => {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    if (r <= 0) return;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.hypot(dx, dy);
        if (fill ? d <= r + 0.3 : Math.abs(d - r) < 0.7) pset(cx + dx, cy + dy, hex);
      }
    }
  };
  const save = relPath => {
    const full = join(ASSETS_DIR, relPath);
    writeFileSync(full, encodePNG(w, h, data));
    return full;
  };
  return { w, h, data, pset, rect, line, circle, save };
}

// ============================================================================
// 1. PROTAGONISTA 16-BIT (GÊNERO NEUTRO / ANDRÓGINO) — 384x384 (6x6 cells of 64x64)
// ============================================================================
function buildProtagonistSheet() {
  const S = createSurface(384, 384);
  const PAL = {
    out: '#0e091c',
    hairD: '#24130e', hairM: '#3f2218', hairL: '#633727', hairH: '#87503b',
    skinD: '#9c6444', skinM: '#c4835f', skinL: '#df9f79',
    tunicD: '#15254a', tunicM: '#23427a', tunicL: '#386bb3', tunicH: '#5ca0e8',
    stripeD: '#b88228', stripeL: '#f5d06e', stripeH: '#fff1b0',
    pantsD: '#161329', pantsM: '#262145',
    bootD: '#291610', bootM: '#4a291d', bootL: '#6b3e2e'
  };

  function drawAndrogynousChild(cx, cy, opts = {}) {
    const {
      bobY = 0, runPhase = 0, falling = false, fallFrame = 0,
      cushionState = 0, lookUp = false, celebrate = false
    } = opts;

    const x0 = cx, y0 = cy + bobY;

    if (falling) {
      // Falling pose (tilted/horizontal in upper-left as in Storyboard Frames 5, 23, 24)
      const tilt = (fallFrame % 2 === 0) ? 0 : 1;
      const flutter = [-1, 0, 1, 0, -1, 1][fallFrame % 6];
      // Flowing poncho/tunic & limbs outstretched while falling
      // Legs trailing top-left
      S.line(x0 - 12, y0 - 8 + flutter, x0 - 4, y0 - 2, PAL.pantsM);
      S.line(x0 - 12, y0 - 7 + flutter, x0 - 4, y0 - 1, PAL.pantsD);
      S.line(x0 - 11, y0 + 4 - flutter, x0 - 4, y0 + 1, PAL.pantsM);
      S.rect(x0 - 14, y0 - 9 + flutter, 3, 3, PAL.bootM);
      S.rect(x0 - 13, y0 + 3 - flutter, 3, 3, PAL.bootM);

      // Torso (Poncho with 16-bit shading & gold stripe)
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 6; dx++) {
          if (Math.abs(dy) === 5 || dx === -5 || dx === 6) S.pset(x0 + dx, y0 + dy, PAL.out);
          else if (dx === 1 || dx === 2) S.pset(x0 + dx, y0 + dy, dy < 0 ? PAL.stripeH : PAL.stripeL);
          else S.pset(x0 + dx, y0 + dy, dy < -1 ? PAL.tunicL : dy > 2 ? PAL.tunicD : PAL.tunicM);
        }
      }
      // Outstretched arms
      S.line(x0 + 2, y0 - 5, x0 + 9, y0 - 10 - flutter, PAL.tunicL);
      S.line(x0 + 2, y0 + 5, x0 + 8, y0 + 10 + flutter, PAL.tunicM);
      S.rect(x0 + 9, y0 - 11 - flutter, 2, 2, PAL.skinL);
      S.rect(x0 + 8, y0 + 10 + flutter, 2, 2, PAL.skinM);

      // Head (right side of torso, facing down-right)
      const hx = x0 + 10, hy = y0 + tilt;
      for (let dy = -6; dy <= 6; dy++) {
        for (let dx = -6; dx <= 6; dx++) {
          if (dx * dx + dy * dy > 38) continue;
          if (dx * dx + dy * dy >= 28) S.pset(hx + dx, hy + dy, PAL.out);
          else if (dx > 1 && Math.abs(dy) < 4) S.pset(hx + dx, hy + dy, PAL.skinM);
          else S.pset(hx + dx, hy + dy, dy < -2 ? PAL.hairL : dy > 2 ? PAL.hairD : PAL.hairM);
        }
      }
      // Speed lines around falling protagonist
      for (let i = 0; i < 4; i++) {
        const lx = x0 - 16 + ((i * 9 + fallFrame * 3) % 32);
        const ly = y0 - 18 - (i * 4);
        S.line(lx, ly, lx, ly - 6, i % 2 === 0 ? '#9ef0ff' : '#5ca0e8');
      }
      return;
    }

    // Standard upright / seated poses (16-bit gender-neutral child)
    const seated = cushionState === 1 || cushionState === 2;
    const baseY = seated ? y0 + 4 : y0;

    // Shadow under feet
    for (let dx = -7; dx <= 7; dx++) {
      S.pset(x0 + dx, y0 + 15, '#090614');
      if (Math.abs(dx) < 6) S.pset(x0 + dx, y0 + 14, '#120c28');
    }

    // Legs & Boots (animated for Walk/Run in row 1)
    const legSwing = runPhase ? Math.round(Math.sin((runPhase / 6) * Math.PI * 2) * 4) : 0;
    const legLiftL = runPhase && legSwing > 0 ? -2 : 0;
    const legLiftR = runPhase && legSwing < 0 ? -2 : 0;

    if (!seated) {
      // Left leg
      S.rect(x0 - 5 + legSwing, baseY + 7 + legLiftL, 4, 5, PAL.pantsM);
      S.rect(x0 - 5 + legSwing, baseY + 12 + legLiftL, 5, 3, PAL.bootM);
      S.pset(x0 - 4 + legSwing, baseY + 12 + legLiftL, PAL.bootL);
      // Right leg
      S.rect(x0 + 1 - legSwing, baseY + 7 + legLiftR, 4, 5, PAL.pantsD);
      S.rect(x0 + 1 - legSwing, baseY + 12 + legLiftR, 5, 3, PAL.bootD);
      S.pset(x0 + 2 - legSwing, baseY + 12 + legLiftR, PAL.bootM);
    } else {
      // Seated on magic cushion
      S.rect(x0 - 7, baseY + 8, 6, 3, PAL.bootM);
      S.rect(x0 + 2, baseY + 8, 6, 3, PAL.bootL);
    }

    // Poncho / Tunic (16-bit shaded trapezoidal silhouette with iconic neutral stripe)
    for (let dy = -2; dy <= 7; dy++) {
      const hw = 6 + Math.floor((dy + 2) * 0.25);
      for (let dx = -hw; dx <= hw; dx++) {
        const edge = Math.abs(dx) === hw || dy === -2 || dy === 7;
        if (edge) {
          S.pset(x0 + dx, baseY + dy, PAL.out);
        } else if (dy === 2 || dy === 3) {
          // Neutral golden-cream stripe across chest
          S.pset(x0 + dx, baseY + dy, dx < -2 ? PAL.stripeD : dx < 2 ? PAL.stripeH : PAL.stripeL);
        } else {
          const shade = dx < -3 ? PAL.tunicD : dx < 1 ? PAL.tunicL : dx < 4 ? PAL.tunicM : PAL.tunicD;
          S.pset(x0 + dx, baseY + dy, dy === -1 && Math.abs(dx) < 3 ? PAL.tunicH : shade);
        }
      }
    }

    // Arms (celebrating, rubbing head on cushion, or swinging)
    if (celebrate) {
      const lift = (opts.frame % 2 === 0) ? -1 : 0;
      S.rect(x0 - 9, baseY - 5 + lift, 3, 6, PAL.tunicL);
      S.rect(x0 + 6, baseY - 5 + lift, 3, 6, PAL.tunicL);
      S.rect(x0 - 9, baseY - 7 + lift, 3, 2, PAL.skinL);
      S.rect(x0 + 6, baseY - 7 + lift, 3, 2, PAL.skinL);
    } else if (cushionState === 2) {
      // Hand rubbing head while recovering from impact
      S.rect(x0 - 8, baseY - 3, 3, 5, PAL.tunicL);
      S.rect(x0 - 8, baseY - 5, 2, 2, PAL.skinL);
    }

    // Head & Symmetric Bob Hair (Androgynous 16-bit design)
    const headY = baseY - 9 + (lookUp ? -1 : 0);
    for (let dy = -7; dy <= 6; dy++) {
      const hw = dy < -4 ? 5 : dy < 3 ? 7 : 6;
      for (let dx = -hw; dx <= hw; dx++) {
        const border = Math.abs(dx) === hw || dy === -7 || dy === 6;
        if (border) {
          S.pset(x0 + dx, headY + dy, PAL.out);
          continue;
        }
        // Symmetric chin-length bob framing face on both sides + straight bangs
        const isHair = dy <= -1 || Math.abs(dx) >= 5 || (dy === 0 && Math.abs(dx) !== 2);
        if (isHair) {
          const hCol = (dy === -4 && Math.abs(dx) <= 4) ? PAL.hairH
            : dy < -2 ? PAL.hairL
            : (dx < 0 ? PAL.hairM : PAL.hairD);
          S.pset(x0 + dx, headY + dy, hCol);
        } else {
          // Lower face / warm neutral skin with subtle shadow under bangs
          S.pset(x0 + dx, headY + dy, dy === 1 ? PAL.skinD : dx < 1 ? PAL.skinL : PAL.skinM);
        }
      }
    }
    // Subtle neutral eyes under bangs
    if (cushionState === 1 || cushionState === 2) {
      // Blinking / dazed recovery eyes (> <)
      S.pset(x0 - 2, headY + 1, PAL.out);
      S.pset(x0 + 2, headY + 1, PAL.out);
    } else {
      S.rect(x0 - 3, headY + 1, 1, 2, PAL.out);
      S.rect(x0 + 2, headY + 1, 1, 2, PAL.out);
    }
  }

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const cx = col * 64 + 32;
      const cy = row * 64 + 38;
      if (row === 0) {
        // Row 0: Idle breathing
        drawAndrogynousChild(cx, cy, { bobY: [0, 0, -1, -1, 0, 1][col], frame: col });
      } else if (row === 1) {
        // Row 1: Walk / Run toward next level
        drawAndrogynousChild(cx, cy, { bobY: col % 2 === 0 ? -1 : 0, runPhase: col + 1, frame: col });
      } else if (row === 2) {
        // Row 2: Freefall down the cavern shaft
        drawAndrogynousChild(cx, cy - 4, { falling: true, fallFrame: col, frame: col });
      } else if (row === 3) {
        // Row 3: Magic Cushion Landing & Recovery while sweet voice hums
        const cState = col < 2 ? 1 : col < 4 ? 2 : 0;
        drawAndrogynousChild(cx, cy, { cushionState: cState, bobY: [3, 1, 2, 0, -1, 0][col], frame: col });
      } else if (row === 4) {
        // Row 4: Observing floating crystals & Imaginary Mouse tutorial
        drawAndrogynousChild(cx, cy, { lookUp: col >= 2 && col <= 4, bobY: col % 3 === 0 ? -1 : 0, frame: col });
      } else if (row === 5) {
        // Row 5: Victory / Harmony celebration
        drawAndrogynousChild(cx, cy, { celebrate: true, bobY: col % 2 === 0 ? -2 : 0, frame: col });
      }
    }
  }
  return S.save('personagens/protagonista-16bit-spritesheet.png');
}

// ============================================================================
// 2. FADA DAS GEMAS 16-BIT — 256x192 (4x3 cells of 64x64)
// ============================================================================
function buildFairySheet() {
  const S = createSurface(256, 192);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = col * 64 + 32, cy = row * 64 + 34;
      const bob = [0, -1, -2, -1][col];
      const wing = [-2, 0, 2, 0][col];

      if (row === 0) {
        // Trapped in crystal / humming sweet voice rings
        S.circle(cx, cy, 16 + col * 3, col % 2 === 0 ? '#9ef0ff' : '#c77dff', false);
      }

      // Luminous 16-bit Crystal Butterfly Wings
      for (const dir of [-1, 1]) {
        for (let dy = -8; dy <= 6; dy++) {
          const wSpan = dy < 0 ? 11 - Math.abs(dy + 4) : 8 - dy;
          for (let dx = 3; dx <= 3 + wSpan; dx++) {
            const x = cx + dir * dx, y = cy + dy + bob + (dx > 6 ? wing : 0);
            const edge = dx === 3 + wSpan || Math.abs(dy) >= 6;
            S.pset(x, y, row === 0 ? (edge ? '#3fc6f0' : '#1d4c8c') : (edge ? '#ffffff' : dx > 7 ? '#9ef0ff' : '#ff8ae2'));
          }
        }
      }

      // Fairy Body & Petal Dress
      for (let dy = -9; dy <= 10; dy++) {
        const hw = dy < -3 ? 4 : dy < 3 ? 3 : Math.min(6, 2 + Math.floor((dy - 2) * 0.7));
        for (let dx = -hw; dx <= hw; dx++) {
          if (row === 0) {
            S.pset(cx + dx, cy + dy + bob, dy < -3 ? '#12224d' : '#1b3670');
          } else {
            const c = dy < -4 ? '#3b1d0e' : dy < 0 ? '#8c5032' : dy < 4 ? '#2f6fd6' : (dx + dy) % 2 === 0 ? '#7fc4ff' : '#3fc6f0';
            S.pset(cx + dx, cy + dy + bob, c);
          }
        }
      }

      if (row === 2) {
        // Channeling the Fairy Gem Butterfly aura
        S.circle(cx, cy + bob, 20 + col * 2, '#ffd35a', false);
      }
    }
  }
  return S.save('personagens/fada-16bit-spritesheet.png');
}

// ============================================================================
// 3. PRÓLOGO ESTILO UNDERTALE (3 PAINÉIS SÉPIA 16-BIT — FRAMES 22, 19, 20)
// ============================================================================
const SEPIA = {
  bg: '#160b04', d1: '#2b1608', d2: '#4d280f', m1: '#784119',
  m2: '#a65f26', l1: '#d48c3b', l2: '#f2be68', hi: '#ffeb9c'
};

function buildUndertalePanels() {
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

  // Painel 1 (Frame 22): História do Mundo - Contexto (A Guardiã/Espírito dos Cristais e os Humanos em Harmonia)
  {
    const S = createSurface(320, 140);
    // Warm golden sepia background with subtle Bayer 4x4 gradient at bottom
    for (let y = 0; y < 140; y++) {
      for (let x = 0; x < 320; x++) {
        const c = y < 104 ? SEPIA.l1 : (y < 118 && bay(x, y) < 8) ? SEPIA.l1 : SEPIA.m2;
        S.pset(x, y, c);
      }
    }
    // Central Monumental Crystal Arch & 4 Primordial Gems in the background
    for (let y = 18; y < 116; y++) {
      const hw = y < 58 ? Math.round(38 * Math.pow((y - 18) / 40, 0.58)) : 38;
      for (let dx = -hw; dx <= hw; dx++) {
        const adx = Math.abs(dx);
        if (adx >= hw - 2 || adx === 0) S.pset(160 + dx, y, SEPIA.m1);
        else if ((dx + y) % 5 === 0) S.pset(160 + dx, y, SEPIA.m2);
      }
    }
    // 4 Primordial Gems floating in harmony at the top center
    for (const [gx, gy, r] of [[160, 34, 7], [138, 52, 5], [182, 52, 5], [160, 68, 5]]) {
      for (let dy = -r; dy <= r; dy++) {
        const span = r - Math.abs(dy);
        S.rect(gx - span, gy + dy, span * 2 + 1, 1, Math.abs(dy) < 2 ? SEPIA.hi : SEPIA.l2);
      }
      S.line(gx - r - 1, gy, gx, gy - r - 1, SEPIA.d1);
      S.line(gx, gy - r - 1, gx + r + 1, gy, SEPIA.d1);
      S.line(gx + r + 1, gy, gx, gy + r + 1, SEPIA.d1);
      S.line(gx, gy + r + 1, gx - r - 1, gy, SEPIA.d1);
    }

    // LEFT FIGURE (x=96, y=28..122): The Great Crystal Spirit / Fairy Guardian (Undertale Frame 22 left character homology)
    const lx = 96;
    // Large crystalline butterfly wings behind the Guardian
    for (const dir of [-1, 1]) {
      for (let dy = 38; dy <= 88; dy++) {
        const wSpan = dy < 62 ? 16 + Math.floor((62 - dy) * 0.5) : 12 + Math.floor((88 - dy) * 0.3);
        S.rect(lx + dir * 14, dy, dir * wSpan, 1, SEPIA.l2);
        S.pset(lx + dir * (14 + wSpan), dy, SEPIA.d2);
      }
    }
    // Guardian Head, Crown & Flowing Ears/Locks
    for (let y = 28; y <= 54; y++) {
      const hw = y < 36 ? 8 + Math.floor((y - 28) * 0.8) : 14;
      S.rect(lx - hw, y, hw * 2, 1, SEPIA.l2);
      S.pset(lx - hw, y, SEPIA.d2); S.pset(lx + hw, y, SEPIA.d2);
    }
    // Crown horns/crest
    S.rect(lx - 8, 22, 4, 6, SEPIA.hi); S.rect(lx + 4, 22, 4, 6, SEPIA.hi);
    // Guardian Robe with the 4-Crystal Delta Rune Emblem on Chest
    for (let y = 55; y <= 114; y++) {
      const hw = 15 + Math.floor((y - 55) * 0.12);
      S.rect(lx - hw, y, hw * 2, 1, SEPIA.d1);
      //Sleeves
      S.rect(lx - hw - 5, y, 5, 1, y > 96 ? SEPIA.l2 : SEPIA.l1);
      S.rect(lx + hw, y, 5, 1, y > 96 ? SEPIA.l2 : SEPIA.l1);
    }
    // Chest Emblem (Winged Crystal Crest)
    S.circle(lx, 74, 5, SEPIA.m2, true);
    S.rect(lx - 9, 71, 4, 3, SEPIA.l1); S.rect(lx + 5, 71, 4, 3, SEPIA.l1);
    S.rect(lx - 6, 81, 3, 3, SEPIA.l1); S.rect(lx - 1, 81, 3, 3, SEPIA.l1); S.rect(lx + 4, 81, 3, 3, SEPIA.l1);
    // Guardian Feet
    S.rect(lx - 16, 115, 12, 6, SEPIA.l2); S.rect(lx + 4, 115, 12, 6, SEPIA.l2);

    // RIGHT FIGURE (x=222, y=34..122): The Human Child / Harmonic Guardian holding a Crystal Tuning Staff
    const rx = 222;
    //Symmetric Bob Hair & Shaded Face (Undertale Frame 22 right figure homology)
    for (let y = 32; y <= 58; y++) {
      const hw = y < 40 ? 9 + Math.floor((y - 32) * 0.5) : 13;
      for (let dx = -hw; dx <= hw; dx++) {
        const isFace = y > 47 && Math.abs(dx) < 8;
        S.pset(rx + dx, y, isFace ? SEPIA.l1 : SEPIA.d1);
      }
    }
    // Flowing Cloak / Poncho with Golden Stripe
    for (let y = 59; y <= 108; y++) {
      const hw = 10 + Math.floor((y - 59) * 0.22);
      const col = (y >= 76 && y <= 81) ? SEPIA.l2 : SEPIA.d1;
      S.rect(rx - hw, y, hw * 2, 1, col);
    }
    // Legs & Boots
    S.rect(rx - 9, 109, 5, 12, SEPIA.bg);
    S.rect(rx + 4, 109, 5, 12, SEPIA.bg);
    // Diagonal Crystal Tuning Staff held in hand
    for (let i = -24; i <= 34; i++) {
      const sx = rx + 6 + i, sy = 92 - i;
      S.rect(sx, sy, 2, 2, i > 24 ? SEPIA.hi : SEPIA.d1);
    }
    S.save('prologo-undertale/painel-01-historia-do-mundo.png');
  }

  // Painel 2 (Frame 19): A Criança na Floresta Entrando na Caverna
  {
    const S = createSurface(320, 140);
    // Warm Sepia Forest Clearing background
    for (let y = 0; y < 140; y++) {
      for (let x = 0; x < 320; x++) {
        S.pset(x, y, y < 28 ? SEPIA.d1 : y < 92 ? SEPIA.l1 : SEPIA.m2);
      }
    }
    // Craggy Mountain Cliff & Dark Cavern Mouth on the Right (x=140..280)
    for (let y = 16; y < 108; y++) {
      const leftEdge = 135 - Math.floor((y - 16) * 0.25) + Math.floor(Math.sin(y * 0.3) * 3);
      for (let x = leftEdge; x < 285; x++) {
        const dCave = Math.hypot((x - 228) * 0.85, (y - 78) * 1.1);
        if (dCave < 36 && y > 38) {
          S.pset(x, y, dCave < 26 ? SEPIA.bg : SEPIA.d1);
        } else {
          const rockShade = ((x + y * 2) % 17 === 0) ? SEPIA.d2 : x < 185 ? SEPIA.m2 : SEPIA.m1;
          S.pset(x, y, rockShade);
        }
      }
    }
    // Top Forest Canopy Leaves with Bayer Dithering
    for (let y = 0; y < 38; y++) {
      for (let x = 0; x < 320; x++) {
        const canopy = 22 + Math.floor(Math.sin(x * 0.08) * 8 + Math.cos(x * 0.22) * 4);
        if (y < canopy) S.pset(x, y, y < canopy - 6 ? SEPIA.bg : SEPIA.d1);
      }
    }
    // Winding Forest Path & Grass Tufts
    for (let y = 92; y < 140; y++) {
      const pathCenter = 115 + Math.floor((140 - y) * 1.6);
      const pathW = 28 + Math.floor((y - 92) * 0.7);
      for (let x = 0; x < 320; x++) {
        const dist = Math.abs(x - pathCenter);
        if (dist < pathW) S.pset(x, y, dist < pathW - 6 ? SEPIA.l1 : SEPIA.m2);
        else S.pset(x, y, ((x * 3 + y) % 11 === 0) ? SEPIA.d2 : SEPIA.m1);
      }
    }
    // Foreground Detailed Tree Trunks (Left and Right framing the shot like Frame 19)
    for (const [tx, tw] of [[12, 18], [52, 28], [274, 34]]) {
      for (let y = 0; y < 134; y++) {
        const rootSpread = y > 110 ? Math.floor((y - 110) * 0.6) : 0;
        for (let dx = -rootSpread; dx < tw + rootSpread; dx++) {
          const x = tx + dx;
          const bark = ((dx + Math.floor(y * 0.2)) % 6 === 0);
          S.pset(x, y, dx > tw - 5 ? SEPIA.m1 : bark ? SEPIA.bg : SEPIA.d1);
        }
      }
    }
    // The Gender-Neutral Child walking toward the cave (x=108, y=72..106)
    const cx = 108, cy = 88;
    // Oval ground shadow
    for (let dy = -4; dy <= 4; dy++) {
      const sw = Math.round(11 * Math.sqrt(1 - (dy * dy) / 20));
      S.rect(cx - sw, cy + 16 + dy, sw * 2, 1, SEPIA.d1);
    }
    // Boots & Stepping Legs
    S.rect(cx - 6, cy + 8, 4, 7, SEPIA.bg);
    S.rect(cx + 2, cy + 6, 4, 7, SEPIA.bg);
    // Striped Tunic / Poncho
    for (let dy = -4; dy <= 7; dy++) {
      const hw = 7 + Math.floor((dy + 4) * 0.2);
      S.rect(cx - hw, cy + dy, hw * 2, 1, (dy >= 1 && dy <= 3) ? SEPIA.hi : SEPIA.d2);
      S.pset(cx - hw, cy + dy, SEPIA.bg); S.pset(cx + hw, cy + dy, SEPIA.bg);
    }
    // Wind-swept Symmetric Bob Hair (Head)
    for (let dy = -16; dy <= -4; dy++) {
      const hw = dy < -13 ? 6 : 9;
      S.rect(cx - hw, cy + dy, hw * 2, 1, dy < -11 ? SEPIA.m1 : SEPIA.d1);
      S.pset(cx - hw, cy + dy, SEPIA.bg); S.pset(cx + hw, cy + dy, SEPIA.bg);
    }
    S.save('prologo-undertale/painel-02-crianca-na-floresta.png');
  }

  // Painel 3 (Frame 20): Surpreendida pelo Buraco e Caindo no Calabouço
  {
    const S = createSurface(320, 140);
    S.rect(0, 0, 320, 140, SEPIA.d1);
    // Sunlit Abyss Opening at the Top with Concentric Contour Rings & Hanging Stalactites (Frame 20)
    for (let y = 0; y < 62; y++) {
      const span = Math.round(142 * Math.sqrt(Math.max(0, 1 - Math.pow(y / 62, 2))));
      for (let x = 160 - span; x <= 160 + span; x++) {
        const d = Math.hypot((x - 160) * 0.75, y * 1.35);
        const ringLine = Math.floor(d) % 11 === 0;
        S.pset(x, y, ringLine ? SEPIA.m2 : d < 35 ? SEPIA.hi : d < 72 ? SEPIA.l2 : SEPIA.l1);
      }
    }
    // Jagged dark stalactites/crags hanging from the top rim of the hole
    for (const [sx, sw, sh] of [[18, 28, 32], [116, 16, 22], [248, 32, 36], [285, 24, 28]]) {
      for (let dy = 0; dy < sh; dy++) {
        const hw = Math.max(1, Math.round((sw / 2) * (1 - dy / sh)));
        S.rect(sx - hw, dy, hw * 2, 1, SEPIA.d1);
      }
    }
    // Massive Vertical Subterranean Cliff Walls Below the Rim
    for (let y = 38; y < 140; y++) {
      const rimSpan = y < 62 ? Math.round(142 * Math.sqrt(Math.max(0, 1 - Math.pow(y / 62, 2)))) : 0;
      for (let x = 0; x < 320; x++) {
        if (y < 62 && Math.abs(x - 160) <= rimSpan) continue;
        const distCenter = Math.abs(x - 155);
        const crack = ((x + Math.floor(Math.sin(y * 0.14) * 3)) % 22 === 0);
        const shade = distCenter > 125 ? SEPIA.bg : distCenter > 88 ? SEPIA.d2 : crack ? SEPIA.d2 : SEPIA.m1;
        S.pset(x, y, shade);
      }
    }
    // Falling Child Silhouette Tumbling Mid-Air in the Chasm (x=116, y=88 — matching Frame 20)
    const fx = 116, fy = 90;
    // Trailing legs & boots above
    S.line(fx - 7, fy - 12, fx - 3, fy - 4, SEPIA.bg);
    S.line(fx + 5, fy - 13, fx + 2, fy - 4, SEPIA.bg);
    // Tumbling Torso with Golden Stripe
    for (let dy = -4; dy <= 5; dy++) {
      S.rect(fx - 6, fy + dy, 12, 1, (dy === 0 || dy === 1) ? SEPIA.hi : SEPIA.bg);
    }
    // Outstretched Arms & Hands
    S.line(fx - 6, fy + 2, fx - 12, fy + 8, SEPIA.l2);
    S.line(fx + 6, fy + 2, fx + 12, fy + 9, SEPIA.l2);
    // Head & Hair Tumbling Downward
    S.circle(fx, fy + 9, 5, SEPIA.l2, true);
    S.circle(fx, fy + 7, 6, SEPIA.bg, false);
    S.save('prologo-undertale/painel-03-queda-no-calabouco.png');
  }
}

// ============================================================================
// 4. CRISTAIS 16-BIT SPRITESHEET — 256x192 (4x3 cells of 64x64)
// ============================================================================
function buildCrystalsSheet() {
  const S = createSurface(256, 192);

  function drawGemHex(cx, cy, pal, shimmer = 0, dark = false) {
    for (let dy = -18; dy <= 18; dy++) {
      const hw = dy < -8 ? Math.round((18 + dy) * 1.1)
        : dy > 8 ? Math.round((18 - dy) * 1.1)
        : 11;
      for (let dx = -hw; dx <= hw; dx++) {
        const border = Math.abs(dx) === hw || Math.abs(dy) === 18;
        if (border) {
          S.pset(cx + dx, cy + dy, pal.out);
        } else if (dx < -3 && dy < 4) {
          S.pset(cx + dx, cy + dy, (dx + dy + shimmer) % 5 === 0 ? pal.hi : pal.l);
        } else if (Math.abs(dx) <= 3) {
          S.pset(cx + dx, cy + dy, dy < -2 ? pal.hi : pal.m);
        } else {
          S.pset(cx + dx, cy + dy, pal.d);
        }
      }
    }
    if (dark) {
      // Dark shadow aura & cracks
      S.circle(cx, cy, 22 + (shimmer % 2), '#9b5cff', false);
    }
  }

  const Q_PAL = { out: '#0e1638', hi: '#ffffff', l: '#9ef0ff', m: '#3fc6f0', d: '#1b6ca8' };
  const O_PAL = { out: '#381008', hi: '#ffffd0', l: '#ffd84a', m: '#ff781e', d: '#b82e14' };
  const D_PAL = { out: '#a86eff', hi: '#6e5a8f', l: '#493968', m: '#2b2042', d: '#160f26' };

  for (let col = 0; col < 4; col++) {
    drawGemHex(col * 64 + 32, 32, Q_PAL, col, false);
  }
  drawGemHex(32, 96, O_PAL, 0, false);
  drawGemHex(96, 96, O_PAL, 2, false);
  drawGemHex(160, 96, D_PAL, 0, true);
  drawGemHex(224, 96, D_PAL, 1, true);

  // Row 2: Left-side 3 Cushion-Generator Crystals (Storyboard Frames 24-29)
  for (let col = 0; col < 4; col++) {
    const cx = col * 64 + 32, cy = 160;
    for (const [ox, h] of [[-14, 24], [-2, 20], [11, 22]]) {
      for (let y = 0; y < h; y++) {
        const hw = Math.max(1, Math.round(5 * (1 - y / h)));
        S.rect(cx + ox - hw, cy + 20 - y, hw * 2, 1, col % 2 === 0 ? '#3fc6f0' : '#7aeaff');
        S.pset(cx + ox - hw, cy + 20 - y, '#ffffff');
      }
    }
  }

  return S.save('cristais/cristais-16bit-spritesheet.png');
}

// ============================================================================
// 5. EFEITOS 16-BIT (ALMOFADA MÁGICA, EXPLOSÃO + RAIOS AZUIS, ONDAS AZUIS) — 384x256
// ============================================================================
function buildEffectsSheet() {
  const S = createSurface(384, 256);

  // Row 0: Magic Cushion (Almofada de Magia gerada pelos cristais - Frame 25)
  for (let col = 0; col < 6; col++) {
    const cx = col * 64 + 32, cy = 36;
    const squash = [0, 3, -2, 1, 0, 0][col];
    for (let dy = -10 + squash; dy <= 10; dy++) {
      const hw = Math.round(24 * Math.sqrt(Math.max(0, 1 - Math.pow(dy / 12, 2))));
      for (let dx = -hw; dx <= hw; dx++) {
        const edge = Math.abs(dx) >= hw - 1 || dy === -10 + squash || dy === 10;
        S.pset(cx + dx, cy + dy, edge ? '#ffffff' : dy < 0 ? '#c8fbff' : (dx + dy + col) % 2 === 0 ? '#7aeaff' : '#b58cff');
      }
    }
  }

  // Row 1: Crystal Shatter Explosion + Blue Lightning Arcs (Frame 28)
  for (let col = 0; col < 6; col++) {
    const cx = col * 64 + 32, cy = 96;
    const rad = 6 + col * 4;
    S.circle(cx, cy, rad, col % 2 === 0 ? '#ffffff' : '#3fc6f0', col === 0);
    // Flying crystal shards & blue lightning spirals
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2 + col * 0.25;
      const sx = cx + Math.cos(ang) * (rad + 2);
      const sy = cy + Math.sin(ang) * (rad + 2);
      S.rect(sx - 2, sy - 2, 4, 4, a % 2 === 0 ? '#9ef0ff' : '#ffffff');
      S.line(cx + Math.cos(ang) * 4, cy + Math.sin(ang) * 4, sx, sy, '#3fc6f0');
    }
  }

  // Row 2: Concentric Blue Energy Waves Unblocking the Exit Rocks (Frame 29)
  for (let col = 0; col < 6; col++) {
    const cx = col * 64 + 16, cy = 160;
    for (let w = 0; w < 3; w++) {
      const r = 10 + w * 10 + col * 3;
      for (let a = -1.1; a <= 1.1; a += 0.05) {
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        S.pset(px, py, w % 2 === 0 ? '#9ef0ff' : '#3fc6f0');
        S.pset(px + 1, py, '#ffffff');
      }
    }
  }

  // Row 3: Stepped Equation Wave + Parentheses + Pips
  for (let col = 0; col < 6; col++) {
    const cx = col * 64 + 32, cy = 224;
    for (let x = -22; x <= 22; x++) {
      const wy = ((x + col * 2) % 6 < 3) ? -1 : 1;
      S.pset(cx + x, cy + wy, '#d8b4ff');
      S.pset(cx + x, cy + wy + 1, '#8c52ff');
    }
  }

  return S.save('efeitos/efeitos-16bit-spritesheet.png');
}

// ============================================================================
// 6. OBSTÁCULO DE PEDRAS DA SAÍDA (FRAMES 24..29) — 384x96 (4 cells of 96x96)
// ============================================================================
function buildExitRocksSheet() {
  const S = createSurface(384, 96);
  const boulders = [
    [52, 78, 12], [68, 80, 13], [82, 78, 12],
    [58, 62, 11], [74, 64, 12], [66, 48, 10]
  ];
  for (let col = 0; col < 4; col++) {
    const ox = col * 96;
    // Upper stone ledge overhanging the exit (as drawn in Storyboard Frames 24-29)
    for (let y = 14; y < 44; y++) {
      const startX = 28 + Math.floor((y - 14) * 1.4);
      S.rect(ox + startX, y, 96 - startX, 1, y < 18 ? '#4c5f9e' : '#26315e');
    }
    if (col < 3) {
      boulders.forEach(([bx, by, br], i) => {
        if (col === 2 && i % 2 === 0) return; // half disintegrated
        const shiftX = col === 2 ? (i - 2) * 4 : 0;
        const shiftY = col === 2 ? 6 : 0;
        const cx = ox + bx + shiftX, cy = by + shiftY;
        for (let dy = -br; dy <= br; dy++) {
          for (let dx = -br; dx <= br; dx++) {
            const d = Math.hypot(dx, dy);
            if (d > br + 0.3) continue;
            if (d >= br - 1) S.pset(cx + dx, cy + dy, col === 1 ? '#9ef0ff' : '#09071a');
            else if (col === 1 && Math.abs(dx + dy) <= 1) S.pset(cx + dx, cy + dy, '#ffffff');
            else S.pset(cx + dx, cy + dy, (dx + dy < -3) ? '#42528f' : (dx + dy < 3) ? '#283263' : '#161b3d');
          }
        }
      });
    } else {
      // Frame 3: Exit open with glowing cyan pathway arch
      for (let y = 44; y < 88; y++) {
        S.rect(ox + 58, y, 34, 1, '#122854');
        S.pset(ox + 58, y, '#9ef0ff');
      }
    }
  }
  return S.save('cenarios/obstaculo-pedras-saida-spritesheet.png');
}

// ============================================================================
// 7. UI 16-BIT (MOUSE IMAGINÁRIO, MENU 3 ESTRELAS "CONTINUAR") — 384x192
// ============================================================================
function buildUISheet() {
  const S = createSurface(384, 192);
  // Row 0: Imaginary Mouse Cursor (Normal, Click & Hold, Dragging with Trail)
  for (let col = 0; col < 6; col++) {
    const cx = col * 64 + 26, cy = 24;
    // Classic 16-bit Pixel Arrow/Hand Cursor
    for (let y = 0; y < 16; y++) {
      const w = y < 11 ? y + 1 : 5;
      for (let x = 0; x < w; x++) {
        const edge = x === 0 || x === w - 1 || y === 15 || (y === 10 && x > 4);
        S.pset(cx + x, cy + y, edge ? '#0a0820' : col >= 2 ? '#ffe478' : '#ffffff');
      }
    }
    if (col >= 1 && col <= 3) {
      // Click & Hold ring ("clique no cristal e não solte")
      S.circle(cx + 2, cy + 2, 6 + col * 3, '#9ef0ff', false);
    }
    if (col >= 4) {
      // Dragging trail ("arraste ele até o cristal sombrio")
      S.circle(cx - 10, cy + 6, 3, '#9ef0ff', true);
      S.circle(cx - 18, cy + 8, 2, '#c77dff', true);
    }
  }

  // Row 1: 16-bit Stars for the 3-Star Completion Menu (Frame 29)
  for (let col = 0; col < 6; col++) {
    const cx = col * 64 + 32, cy = 96;
    const lit = col >= 1;
    S.circle(cx, cy, 12, lit ? '#ffd35a' : '#262145', true);
    S.circle(cx, cy, 12, lit ? '#ffffff' : '#5a49c4', false);
  }

  // Row 2: "Continuar" Button 16-bit Frame
  S.rect(16, 144, 160, 32, '#1d3166');
  S.rect(18, 146, 156, 28, '#2e579c');
  S.rect(20, 148, 152, 2, '#9ef0ff');

  return S.save('ui/ui-16bit-spritesheet.png');
}

// ============================================================================
// 8. CENÁRIOS 16-BIT (MENU, POÇO DA QUEDA E FASES 1 A 5) — 320x180 & 320x360
// ============================================================================
function buildScenarioPNGs() {
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

  function drawMonumentalDoorOnSurface(S, cx, topY, litGems = 1) {
    for (let y = topY; y < 146; y++) {
      const hw = y < topY + 46 ? Math.round(44 * Math.pow((y - topY) / 46, 0.58)) : 44;
      const ihw = y < topY + 52 ? Math.round(32 * Math.pow(Math.max(0, y - (topY + 12)) / 40, 0.6)) : 32;
      for (let dx = -hw; dx <= hw; dx++) {
        const x = cx + dx, adx = Math.abs(dx);
        if (adx > ihw || y < topY + 12) {
          const leaf = ((dx + y) % 7 === 0) && adx > ihw + 2 && adx < hw - 2;
          S.pset(x, y, adx >= hw - 1 ? '#07051a' : leaf ? '#4d74e6' : '#26388a');
        } else {
          S.pset(x, y, adx === 0 ? '#07051a' : '#162058');
        }
      }
    }
    // Twin Columns
    for (const dir of [-1, 1]) {
      const px = cx + dir * 38;
      S.rect(px - 6, topY + 46, 12, 68, '#20307a');
      S.rect(px - 7, topY + 44, 14, 4, '#4d74e6');
      S.rect(px - 7, topY + 76, 14, 4, '#4d74e6');
      S.rect(px - 2, topY + 71, 4, 5, '#3fc6f0');
    }
    // Top Butterfly Fairy Gem + 3 Golden Filigree Sockets
    const BFLY = [
      '............oBo............',
      '...........oBCBo...........',
      '..........oBCWCBo..........',
      '.oGGGGGo..oBCWCBo..oGGGGGo.',
      'oGWWWWWGo..oBCBGo.oGWWWWWGo',
      'oGWCCCCWGo..oGo..oGWCCCCWGo',
      'oGWCBBBCWGo.oGo.oGWCBBBCWGo',
      '.oGWCBPMCWGoHYHoGWCMBCWGo..',
      '..oGWCMPMCGHYWYHGCMPCWGo...',
      '...oGGCMPMGHYWYHGMPCGGo....',
      '....ooGGPPGHYWYHGPPGGoo....',
      '...oGWCBBBGHYWYHGBBBCWGo...',
      '..oGWCCCCWGGHYHGGWCCCCWGo..',
      '..oGWWBCWGo.oGo.oGWCBWWGo..',
      '...oGCCCGo..oBo..oGCCCGo...',
      '....oGGGo..oBCBo..oGGGo....',
      '...........oBWBBo..........',
      '...........oBCBo...........',
      '............oBo............'
    ];
    const BPAL = litGems >= 1
      ? { o: '#6f3b10', G: '#e59a28', H: '#ffe066', Y: '#ffae22', W: '#ffffff', C: '#9ef0ff', B: '#3fc6f0', P: '#ff72e0', M: '#c77dff' }
      : { o: '#261838', G: '#6b4c35', H: '#9c7348', Y: '#6b4c35', W: '#48528a', C: '#303869', B: '#20264d', P: '#3b285c', M: '#2a1d45' };
    for (let r = 0; r < BFLY.length; r++) {
      for (let c = 0; c < BFLY[r].length; c++) {
        const colHex = BPAL[BFLY[r][c]];
        if (colHex) S.pset(cx - 13 + c, topY + 26 + r, colHex);
      }
    }
    for (const [sx, sy] of [[cx - 15, topY + 62], [cx + 15, topY + 62], [cx, topY + 82]]) {
      S.circle(sx, sy, 7, '#e59a28', false);
      S.circle(sx, sy, 6, '#9c5a18', false);
    }
    // Peripheral glowing cyan & magenta cavern crystals framing the scene
    for (const [gx, gy, gh, c1, c2] of [
      [24, 146, 38, '#9ef0ff', '#2590c8'], [44, 146, 26, '#ff9cf5', '#b02898'],
      [148, 146, 24, '#3fc6f0', '#1b6ca8'], [286, 146, 32, '#9ef0ff', '#2590c8'],
      [304, 146, 42, '#ff9cf5', '#b02898']
    ]) {
      for (let dy = 0; dy < gh; dy++) {
        const hw = Math.max(1, Math.round(7 * (1 - dy / gh)));
        S.rect(gx - hw, gy - dy, hw * 2, 1, c2);
        S.pset(gx - hw, gy - dy, c1);
      }
    }
  }

  // 01: Menu Principal 16-bit com Porta Ancestral à Direita (Frame 1)
  {
    const S = createSurface(320, 180);
    const bands = ['#050414', '#0a0824', '#111038', '#18184f', '#22246b'];
    for (let y = 0; y < 180; y++) {
      const v = (y / 180) * 4;
      const idx = Math.min(3, Math.floor(v));
      const f = v - idx;
      for (let x = 0; x < 320; x++) {
        S.pset(x, y, f * 16 > bay(x, y) ? bands[idx + 1] : bands[idx]);
      }
    }
    drawMonumentalDoorOnSurface(S, 218, 28, 1);
    S.rect(0, 146, 320, 34, '#0c1033');
    for (let y = 148; y < 180; y += 3) {
      S.rect(170, y, 96, 1, y % 2 === 0 ? '#3fc6f0' : '#ff72e0');
    }
    S.save('cenarios/01-menu-porta-ancestral.png');
  }

  // 02: Poço Vertical da Queda Livre (320x360 tileable - Frames 5 e 23)
  {
    const S = createSurface(320, 360);
    for (let y = 0; y < 360; y++) {
      for (let x = 0; x < 320; x++) {
        const stripe = ((x + Math.floor(Math.sin(y * 0.05) * 4)) % 24 === 0);
        S.pset(x, y, stripe ? '#060414' : x > 220 ? '#141236' : '#0b0922');
      }
    }
    // Right-wall protruding rock formations (matching Storyboard Frames 5 & 23)
    const ledges = [[40, 95, 75], [140, 200, 88], [235, 290, 70], [305, 350, 82]];
    for (const [y0, y1, span] of ledges) {
      const ym = (y0 + y1) / 2;
      for (let y = y0; y <= y1; y++) {
        const w = Math.round(span * (1 - Math.pow((y - ym) / ((y1 - y0) / 2), 2)));
        S.rect(320 - w, y, w, 1, y < ym ? '#323e7a' : '#1c224d');
        S.pset(320 - w, y, '#6b82d6');
      }
    }
    S.save('cenarios/02-poco-queda-vertical.png');
  }

  // 03..07: Câmaras das Fases 1 a 5 (320x180)
  const levelConfigs = [
    { file: 'cenarios/03-caverna-fase1-o-despertar.png', id: 1 },
    { file: 'cenarios/04-caverna-fase2-galeria-dos-ecos.png', id: 2 },
    { file: 'cenarios/05-caverna-fase3-lago-subterraneo.png', id: 3 },
    { file: 'cenarios/06-caverna-fase4-jardim-mineral.png', id: 4 },
    { file: 'cenarios/07-caverna-fase5-santuario-da-fada.png', id: 5 }
  ];

  for (const cfg of levelConfigs) {
    const S = createSurface(320, 180);
    const bands = ['#07061a', '#0d0c2b', '#151442', '#1f1f5c'];
    for (let y = 0; y < 148; y++) {
      const v = (y / 148) * 3;
      const idx = Math.min(2, Math.floor(v));
      const f = v - idx;
      for (let x = 0; x < 320; x++) {
        S.pset(x, y, f * 16 > bay(x, y) ? bands[idx + 1] : bands[idx]);
      }
    }
    // Level-specific background landmark
    if (cfg.id === 1) {
      // Distant outcrop
      for (let y = 84; y < 148; y++) S.rect(160 - (y - 80), y, (y - 80) * 2, 1, '#181b4a');
    } else if (cfg.id === 2) {
      // Twin stone fountain arches
      S.circle(96, 110, 26, '#232963', true);
      S.circle(224, 110, 26, '#232963', true);
    } else if (cfg.id === 3) {
      // Subterranean mirror lake
      S.rect(60, 136, 200, 12, '#1a4278');
    } else if (cfg.id === 4) {
      // Giant ancestral geode
      S.circle(160, 112, 34, '#262059', true);
      S.circle(160, 112, 20, '#4c2ca6', true);
    } else if (cfg.id === 5) {
      // Monumental Ancient Door + Ceiling Fairy Prison Crystal
      drawMonumentalDoorOnSurface(S, 160, 28, 0);
    }
    // Cavern stone floor
    S.rect(0, 148, 320, 4, '#384685');
    S.rect(0, 152, 320, 28, '#171b3d');
    // Left-side 3 Cushion-Generator Crystals (as in Storyboard Frames 24-29)
    for (const [cx, h] of [[18, 34], [32, 28], [46, 32]]) {
      for (let dy = 0; dy < h; dy++) {
        const hw = Math.max(1, Math.round(6 * (1 - dy / h)));
        S.rect(cx - hw, 148 - dy, hw * 2, 1, '#2d8ac4');
        S.pset(cx - hw, 148 - dy, '#9ef0ff');
      }
    }
    S.save(cfg.file);
  }
}

const files = [
  buildProtagonistSheet(),
  buildFairySheet(),
  buildCrystalsSheet(),
  buildEffectsSheet(),
  buildExitRocksSheet(),
  buildUISheet()
];
buildUndertalePanels();
buildScenarioPNGs();

const manifest = {
  project: 'Crystal Math Mania — Sinfonia dos Cristais (Novo Roteiro 16-Bit True Pixel Art)',
  baseResolution: { width: 320, height: 180, aspectRatio: '16:9', scaling: 'integer-nearest-neighbor' },
  frameRates: {
    physicsAndCamera: 60,
    energyWavesAndLightning: 24,
    characterAndCrystalSprites: 12,
    waterAndTypewriter: 8
  },
  protagonist: {
    file: 'assets/personagens/protagonista-16bit-spritesheet.png',
    design: '16-bit gender-neutral / androgynous child traveler (symmetric chin-length bob hair, indigo poncho with golden-cream stripe)',
    cellSize: { width: 64, height: 64 },
    animations: {
      idle: { row: 0, frames: 6, fps: 8 },
      runToNextStage: { row: 1, frames: 6, fps: 12 },
      freefallInShaft: { row: 2, frames: 6, fps: 12 },
      magicCushionLandingAndRecovery: { row: 3, frames: 6, fps: 12 },
      observeAndFollowMouse: { row: 4, frames: 6, fps: 8 },
      victoryHarmony: { row: 5, frames: 6, fps: 12 }
    }
  },
  fairy: {
    file: 'assets/personagens/fada-16bit-spritesheet.png',
    cellSize: { width: 64, height: 64 },
    animations: {
      trappedHummingVoice: { row: 0, frames: 4, fps: 8 },
      liberatedFlight: { row: 1, frames: 4, fps: 12 },
      doorGemActivation: { row: 2, frames: 4, fps: 12 }
    }
  },
  undertaleProloguePanels: [
    {
      scene: 3,
      storyboardRef: 'Frame 22',
      file: 'assets/prologo-undertale/painel-01-historia-do-mundo.png',
      size: { width: 320, height: 140 },
      caption: 'Há muito tempo, a natureza cantava através de Quatro Gemas Primordiais. Mas um silêncio sombrio adormeceu os biomas e selou sua canção nas profundezas...'
    },
    {
      scene: 4,
      storyboardRef: 'Frame 19',
      file: 'assets/prologo-undertale/painel-02-crianca-na-floresta.png',
      size: { width: 320, height: 140 },
      caption: 'Em um certo dia, uma criança quando estava brincando sozinha pela floresta se perdeu e acabou entrando em uma caverna.'
    },
    {
      scene: 5,
      storyboardRef: 'Frame 20',
      file: 'assets/prologo-undertale/painel-03-queda-no-calabouco.png',
      size: { width: 320, height: 140 },
      caption: 'Logo ela foi surpreendida ao se deparar com um buraco e cair no calabouço.'
    }
  ],
  crystals: {
    file: 'assets/cristais/cristais-16bit-spritesheet.png',
    cellSize: { width: 64, height: 64 },
    rows: {
      0: 'Quartzo de Luz (4 quadros de brilho 16-bit)',
      1: 'Opala de Fogo (cols 0-1) e Cristal Sombrio (cols 2-3)',
      2: 'Trio de Cristais da Base Esquerda geradores da Almofada Mágica'
    }
  },
  effects: {
    file: 'assets/efeitos/efeitos-16bit-spritesheet.png',
    cellSize: { width: 64, height: 64 },
    rows: {
      0: 'Almofada de Magia gerada pelos cristais (Frame 25)',
      1: 'Explosão de Fragmentos e Raios Azuis na anulação (Frame 28)',
      2: 'Ondas de Energia Azul que desbloqueiam as pedras da saída (Frame 29)',
      3: 'Linha Ondulante de Equação Cristalina'
    }
  },
  exitRocksObstacle: {
    file: 'assets/cenarios/obstaculo-pedras-saida-spritesheet.png',
    cellSize: { width: 96, height: 96 },
    frames: ['0: Saída bloqueada', '1: Atingida pelas ondas azuis', '2: Desmoronando', '3: Caminho livre para a próxima fase']
  },
  ui: {
    file: 'assets/ui/ui-16bit-spritesheet.png',
    cellSize: { width: 64, height: 64 },
    rows: {
      0: 'Mouse Imaginário (Cursor guia: normal, clicando e segurando, arrastando)',
      1: 'Estrelas 16-bit do Menu de Conclusão (apagada / acesa)',
      2: 'Botão Continuar (única opção do menu de 3 estrelas conforme Frame 29)'
    }
  }
};

writeFileSync(join(ASSETS_DIR, 'atlas-manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Pacote de assets 16-bit gerado com sucesso em:', ASSETS_DIR);
