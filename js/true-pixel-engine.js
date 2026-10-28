'use strict';
/**
 * TRUE PIXEL ART ENGINE — Sinfonia dos Cristais
 * Baseado estritamente na arquitetura de `demo-pixel-art.html`:
 * - Canvas lógico 320x180 (imageSmoothingEnabled = false, image-rendering: pixelated)
 * - Matrizes procedurais fromMap / silhouette / Uint32Array
 * - Dithering Bayer 4x4
 * - Sprites a 12 FPS e Lógica a 60 Hz
 * - Banco Central de Animações Reutilizáveis em Loop (SpriteBank / ActorAnimator)
 * - Caixa de Diálogo Global com encaixes das gemas faltantes no topo e Retrato (Somente Rosto) em loop
 * - Sistema de Tutorial Paginado (Vignette / Animated Tutorial Card) com botão Avançar
 */
(function (global) {
  const W = 320, H = 180, SPRITE_FPS = 12, SIM_HZ = 60;
  const R = Math.round;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeInOut = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

  // Matriz Bayer 4x4 idêntica à demo-pixel-art.html
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

  function mulberry(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hex(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const C32 = new Map();
  function c32(h) {
    let v = C32.get(h);
    if (v === undefined) {
      const [r, g, b] = hex(h);
      v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
      C32.set(h, v);
    }
    return v;
  }

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
  }

  function fromMap(rows, map) {
    const h = rows.length, w = rows[0].length;
    const [c, x] = mk(w, h);
    for (let j = 0; j < h; j++) {
      const row = rows[j];
      for (let i = 0; i < w; i++) {
        const col = map[row[i]];
        if (col) {
          x.fillStyle = col;
          x.fillRect(i, j, 1, 1);
        }
      }
    }
    return c;
  }

  function silhouette(rows, col) {
    const m = {};
    for (const r of rows) {
      for (const ch of r) {
        if (ch !== '.') m[ch] = col;
      }
    }
    return fromMap(rows, m);
  }

  function mirrorCanvas(c) {
    const [m, x] = mk(c.width, c.height);
    x.translate(c.width, 0);
    x.scale(-1, 1);
    x.drawImage(c, 0, 0);
    if (c.hib) m.hib = true;
    return m;
  }

  // Utilitários de desenho 1-bit / True Pixel no contexto alvo
  function P1(ctx, x, y, col) {
    ctx.fillStyle = col;
    ctx.fillRect(R(x), R(y), 1, 1);
  }

  function drawRing(ctx, cx, cy, r, col) {
    cx = R(cx); cy = R(cy); r = R(r);
    if (r <= 0) return;
    ctx.fillStyle = col;
    let x = r, y = 0, e = 1 - r;
    while (x >= y) {
      ctx.fillRect(cx + x, cy + y, 1, 1);
      ctx.fillRect(cx + y, cy + x, 1, 1);
      ctx.fillRect(cx - y, cy + x, 1, 1);
      ctx.fillRect(cx - x, cy + y, 1, 1);
      ctx.fillRect(cx - x, cy - y, 1, 1);
      ctx.fillRect(cx - y, cy - x, 1, 1);
      ctx.fillRect(cx + y, cy - x, 1, 1);
      ctx.fillRect(cx + x, cy - y, 1, 1);
      y++;
      if (e < 0) e += 2 * y + 1;
      else { x--; e += 2 * (y - x) + 1; }
    }
  }

  function drawStar(ctx, cx, cy, s, core, tip) {
    cx = R(cx); cy = R(cy); s = R(s);
    if (s <= 0) return;
    ctx.fillStyle = tip;
    ctx.fillRect(cx - s, cy, 2 * s + 1, 1);
    ctx.fillRect(cx, cy - s, 1, 2 * s + 1);
    const inner = Math.floor(s * 0.55);
    ctx.fillStyle = core;
    ctx.fillRect(cx - inner, cy, 2 * inner + 1, 1);
    ctx.fillRect(cx, cy - inner, 1, 2 * inner + 1);
  }

  // ============================================================================
  // FONTE BITMAP PROPORCIONAL ESTILO OWLBOY (Maiúsculas, Minúsculas e Acentos PT-BR)
  // Renderizada com precisão sub-lógica (1:1 com os 640x360 pixels físicos) e
  // cálculo exato de largura para que NENHUM texto saia de esquadro!
  // ============================================================================
  const BASE_GLYPHS = {
    // Maiúsculas (7 linhas)
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    // Minúsculas (8 linhas: 0..6 corpo + 7 descendente)
    a: ['....', '....', '.###', '#..#', '#..#', '#..#', '.###', '....'],
    b: ['#...', '#...', '###.', '#..#', '#..#', '#..#', '###.', '....'],
    c: ['....', '....', '.###', '#...', '#...', '#...', '.###', '....'],
    d: ['...#', '...#', '.###', '#..#', '#..#', '#..#', '.###', '....'],
    e: ['....', '....', '.##.', '#..#', '####', '#...', '.###', '....'],
    f: ['..##', '.#..', '####', '.#..', '.#..', '.#..', '.#..', '....'],
    g: ['....', '....', '.###', '#..#', '#..#', '.###', '...#', '###.'],
    h: ['#...', '#...', '###.', '#..#', '#..#', '#..#', '#..#', '....'],
    i: ['.#.', '...', '##.', '.#.', '.#.', '.#.', '###', '...'],
    j: ['..#', '...', '.##', '..#', '..#', '..#', '#.#', '.#.'],
    k: ['#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#', '....'],
    l: ['##.', '.#.', '.#.', '.#.', '.#.', '.#.', '###', '...'],
    m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#...#', '#...#', '.....'],
    n: ['....', '....', '###.', '#..#', '#..#', '#..#', '#..#', '....'],
    o: ['....', '....', '.##.', '#..#', '#..#', '#..#', '.##.', '....'],
    p: ['....', '....', '###.', '#..#', '#..#', '###.', '#...', '#...'],
    q: ['....', '....', '.###', '#..#', '#..#', '.###', '...#', '...#'],
    r: ['....', '....', '#.##', '##..', '#...', '#...', '#...', '....'],
    s: ['....', '....', '.###', '#...', '.##.', '...#', '###.', '....'],
    t: ['.#..', '.#..', '####', '.#..', '.#..', '.#..', '..##', '....'],
    u: ['....', '....', '#..#', '#..#', '#..#', '#..#', '.###', '....'],
    v: ['....', '....', '#..#', '#..#', '#..#', '.##.', '.##.', '....'],
    w: ['.....', '.....', '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.', '.....'],
    x: ['....', '....', '#..#', '.##.', '.##.', '.##.', '#..#', '....'],
    y: ['....', '....', '#..#', '#..#', '#..#', '.###', '...#', '###.'],
    z: ['....', '....', '####', '..#.', '.#..', '#...', '####', '....'],
    // Dígitos e pontuação
    '0': ['.###.', '#..##', '#.#.#', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
    '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
    '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    '4': ['#...#', '#...#', '#...#', '#####', '....#', '....#', '....#'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['.###.', '#....', '####.', '#...#', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    '!': ['#', '#', '#', '#', '#', '.', '#'],
    '?': ['###.', '...#', '..#.', '.#..', '.#..', '....', '.#..'],
    '.': ['..', '..', '..', '..', '..', '..', '##'],
    ',': ['..', '..', '..', '..', '..', '.#', '#.'],
    ':': ['..', '.#', '..', '..', '.#', '..', '..'],
    ';': ['..', '.#', '..', '..', '.#', '#.', '..'],
    '-': ['...', '...', '...', '###', '...', '...', '...'],
    '+': ['...', '.#.', '.#.', '###', '.#.', '.#.', '...'],
    '=': ['...', '...', '###', '...', '###', '...', '...'],
    '/': ['...#', '..#.', '..#.', '.#..', '.#..', '#...', '#...'],
    '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'],
    ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
    '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
    '\'': ['#', '#', '.', '.', '.', '.', '.'],
    '>': ['#..', '.#.', '..#', '.#.', '#..', '...', '...'],
    '<': ['..#', '.#.', '#..', '.#.', '..#', '...', '...'],
    '%': ['#..#', '...#', '..#.', '.#..', '#...', '#..#', '....']
  };

  const ACCENT_MAP = {
    'Á': ['A', 'acute', false], 'À': ['A', 'grave', false], 'Â': ['A', 'circ', false], 'Ã': ['A', 'tilde', false],
    'É': ['E', 'acute', false], 'Ê': ['E', 'circ', false],
    'Í': ['I', 'acute', false],
    'Ó': ['O', 'acute', false], 'Ô': ['O', 'circ', false], 'Õ': ['O', 'tilde', false],
    'Ú': ['U', 'acute', false],
    'Ç': ['C', 'cedilla', false],
    'á': ['a', 'acute', true], 'à': ['a', 'grave', true], 'â': ['a', 'circ', true], 'ã': ['a', 'tilde', true],
    'é': ['e', 'acute', true], 'ê': ['e', 'circ', true],
    'í': ['i', 'acute', true],
    'ó': ['o', 'acute', true], 'ô': ['o', 'circ', true], 'õ': ['o', 'tilde', true],
    'ú': ['u', 'acute', true],
    'ç': ['c', 'cedilla', true]
  };

  function getGlyphInfo(ch) {
    let acc = ACCENT_MAP[ch];
    let key = acc ? acc[0] : ch;
    let g = BASE_GLYPHS[key];
    if (!g) {
      const up = ch.toUpperCase();
      acc = ACCENT_MAP[up];
      key = acc ? acc[0] : up;
      g = BASE_GLYPHS[key];
    }
    if (!g) return { g: null, acc: null, w: 3 };
    return { g, acc, w: g[0].length };
  }

  function measurePixelText(text) {
    const s = String(text || '');
    let total = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === ' ') {
        total += 3;
      } else {
        const info = getGlyphInfo(ch);
        total += info.w + 1;
      }
    }
    return Math.max(0, total - 1);
  }

  function drawPixelChar(ctx, ch, x, y, col, shadowCol) {
    const { g, acc, w } = getGlyphInfo(ch);
    if (!g) return 3;
    const rows = g.length;

    const drawAccent = (ox, oy) => {
      if (!acc) return;
      const type = acc[1];
      const isLow = acc[2];
      const ay = oy + (isLow ? 0 : -2);
      const ax = ox + Math.max(0, Math.floor((w - 3) / 2));
      if (type === 'acute') {
        ctx.fillRect(ax + 2, ay, 1, 1);
        ctx.fillRect(ax + 1, ay + 1, 1, 1);
      } else if (type === 'grave') {
        ctx.fillRect(ax, ay, 1, 1);
        ctx.fillRect(ax + 1, ay + 1, 1, 1);
      } else if (type === 'circ') {
        ctx.fillRect(ax + 1, ay, 1, 1);
        ctx.fillRect(ax, ay + 1, 1, 1);
        ctx.fillRect(ax + 2, ay + 1, 1, 1);
      } else if (type === 'tilde') {
        ctx.fillRect(ax, ay + 1, 1, 1);
        ctx.fillRect(ax + 1, ay, 1, 1);
        ctx.fillRect(ax + 2, ay + 1, 1, 1);
      } else if (type === 'cedilla') {
        ctx.fillRect(ox + 1, oy + 7, 1, 1);
        ctx.fillRect(ox, oy + 8, 2, 1);
      }
    };

    if (shadowCol) {
      ctx.fillStyle = shadowCol;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < w; i++) {
          if (g[j][i] === '#') ctx.fillRect(x + i + 0.5, y + j + 0.5, 1, 1);
        }
      }
      drawAccent(x + 0.5, y + 0.5);
    }
    ctx.fillStyle = col;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < w; i++) {
        if (g[j][i] === '#') ctx.fillRect(x + i, y + j, 1, 1);
      }
    }
    drawAccent(x, y);
    return w + 1;
  }

  function wrapPixelLines(text, maxWidth = 999) {
    const paragraphs = String(text || '').split('\n');
    const lines = [];
    for (const para of paragraphs) {
      const words = para.split(' ').filter(Boolean);
      if (!words.length) {
        lines.push('');
        continue;
      }
      let curLine = words[0];
      let curW = measurePixelText(curLine);
      for (let w = 1; w < words.length; w++) {
        const word = words[w];
        const wordW = measurePixelText(word);
        if (curW + 3 + wordW <= maxWidth) {
          curLine += ' ' + word;
          curW += 3 + wordW;
        } else {
          lines.push(curLine);
          curLine = word;
          curW = wordW;
        }
      }
      lines.push(curLine);
    }
    return lines;
  }

  function drawPixelText(ctx, text, x, y, col = '#2c221e', shadowCol = null, maxWidth = 999, lineHeight = 10, align = 'left') {
    x = R(x); y = R(y);
    const lines = wrapPixelLines(text, maxWidth);
    let cy = y;
    for (const line of lines) {
      const lw = measurePixelText(line);
      let cx = x;
      if (align === 'center') {
        cx = R(x + (maxWidth - lw) / 2);
      } else if (align === 'right') {
        cx = R(x + maxWidth - lw);
      }
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === ' ') cx += 3;
        else cx += drawPixelChar(ctx, ch, cx, cy, col, shadowCol);
      }
      cy += lineHeight;
    }
    return lines.length * lineHeight;
  }

  function drawPixelTextCentered(ctx, text, centerX, y, col = '#2c221e', shadowCol = null, maxWidth = 280, lineHeight = 10) {
    const lines = wrapPixelLines(text, maxWidth);
    let cy = R(y);
    for (const line of lines) {
      const lw = measurePixelText(line);
      let cx = R(centerX - lw / 2);
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === ' ') cx += 3;
        else cx += drawPixelChar(ctx, ch, cx, cy, col, shadowCol);
      }
      cy += lineHeight;
    }
  }

  // ============================================================================
  // MOLDURA DE PERGAMINHO ESTILO OWLBOY (drawParchmentBox)
  // Fundo pergaminho (#f4eedf), sombreamento nas bordas (#e6decb), borda dupla
  // fina marrom-escuro (#2c221e e #8c7d70) e rabicho de fala apontando ao ator.
  // ============================================================================
  function drawParchmentBox(ctx, bx, by, bw, bh, opts = {}) {
    bx = R(bx); by = R(by); bw = R(bw); bh = R(bh);
    // Sombra projetada suave sob a caixa
    ctx.fillStyle = 'rgba(12, 8, 6, 0.45)';
    ctx.fillRect(bx + 2, by + 3, bw, bh);

    // Borda externa marrom-escuro (#2c221e) com cantos chanfrados estilo Owlboy
    ctx.fillStyle = '#2c221e';
    ctx.fillRect(bx + 1, by, bw - 2, bh);
    ctx.fillRect(bx, by + 1, bw, bh - 2);

    // Fundo de pergaminho quente (#f4eedf) + sombreamento interno (#e8dfc9)
    ctx.fillStyle = '#e8dfc9';
    ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
    ctx.fillStyle = '#f4eedf';
    ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 6);

    // Borda interna fina (#8c7d70) + cantoneiras (#5c4938)
    ctx.fillStyle = '#8c7d70';
    ctx.fillRect(bx + 2, by + 2, bw - 4, 1);
    ctx.fillRect(bx + 2, by + bh - 3, bw - 4, 1);
    ctx.fillRect(bx + 2, by + 2, 1, bh - 4);
    ctx.fillRect(bx + bw - 3, by + 2, 1, bh - 4);

    ctx.fillStyle = '#5c4938';
    ctx.fillRect(bx + 2, by + 2, 3, 2);
    ctx.fillRect(bx + bw - 5, by + 2, 3, 2);
    ctx.fillRect(bx + 2, by + bh - 4, 3, 2);
    ctx.fillRect(bx + bw - 5, by + bh - 4, 3, 2);

    // Faixa opcional de cabeçalho
    if (opts.headerH) {
      const hh = opts.headerH;
      ctx.fillStyle = opts.headerBg || '#3d2b24';
      ctx.fillRect(bx + 3, by + 3, bw - 6, hh);
      ctx.fillStyle = '#8c7d70';
      ctx.fillRect(bx + 3, by + 3 + hh, bw - 6, 1);
    }

    // Rabicho do balão de fala apontando para o personagem que está falando
    if (opts.tailX !== undefined) {
      const tx = clamp(R(opts.tailX), bx + 18, bx + bw - 18);
      const dir = opts.tailDir || 'up';
      if (dir === 'up') {
        for (let i = 0; i < 6; i++) {
          const hw = 5 - i;
          ctx.fillStyle = '#2c221e';
          ctx.fillRect(tx - hw - 1, by - i, hw * 2 + 3, 1);
          ctx.fillStyle = i < 2 ? '#f4eedf' : '#e8dfc9';
          ctx.fillRect(tx - hw, by - i + 1, hw * 2 + 1, 1);
        }
      } else if (dir === 'down') {
        for (let i = 0; i < 6; i++) {
          const hw = 5 - i;
          ctx.fillStyle = '#2c221e';
          ctx.fillRect(tx - hw - 1, by + bh - 1 + i, hw * 2 + 3, 1);
          ctx.fillStyle = i < 2 ? '#f4eedf' : '#e8dfc9';
          ctx.fillRect(tx - hw, by + bh - 2 + i, hw * 2 + 1, 1);
        }
      }
    }
  }


  // ============================================================================
  // 1. BANCO CENTRAL DE ANIMAÇÕES REUTILIZÁVEIS EM LOOP (SpriteBank)
  // Criado UMA ÚNICA VEZ e instanciado em todas as cutscenes e fases do jogo.
  // ============================================================================
  // --- PROTAGONISTA HI-BIT (40x54 PIXELS FÍSICOS — ESTILO OTUS DE OWLBOY) ---
  // Paleta quente terrosa (warm muted Owlboy palette), sem contorno preto duro,
  // sombreamento pictórico suave, tufos de cabelo emplumados, capa em dobras e botas.
  function buildHiBitProtagonist(pose = 'idle0') {
    const W = 40, H = 54;
    const [c, x] = mk(W, H);
    c.hib = true;
    const put = (px, py, col) => {
      const ix = Math.round(px), iy = Math.round(py);
      if (ix >= 0 && iy >= 0 && ix < W && iy < H) {
        x.fillStyle = col;
        x.fillRect(ix, iy, 1, 1);
      }
    };
    const fillEll = (cx, cy, rx, ry, fn) => {
      for (let py = Math.floor(cy - ry - 1); py <= Math.ceil(cy + ry + 1); py++) {
        for (let px = Math.floor(cx - rx - 1); px <= Math.ceil(cx + rx + 1); px++) {
          const dx = (px - cx) / rx, dy = (py - cy) / ry;
          const d = dx * dx + dy * dy;
          if (d <= 1.0) {
            const col = fn(px, py, dx, dy, d);
            if (col) put(px, py, col);
          }
        }
      }
    };

    const HAIR_DARK = '#2a1c1b', HAIR_MID = '#4a312c', HAIR_LIT = '#754d42', HAIR_HI = '#9e6b58';
    const SKIN_DARK = '#b57b5c', SKIN_MID = '#d99e7b', SKIN_LIT = '#f2be9b';
    const CLOAK_DARK = '#3d2522', CLOAK_MID = '#633b34', CLOAK_LIT = '#8c5447', CLOAK_TRIM = '#d9a85b';
    const TUNIC_DARK = '#596157', TUNIC_MID = '#848f7d', TUNIC_LIT = '#b3bfaa';
    const BELT_DARK = '#332219', BELT_GOLD = '#e3b454';
    const BOOT_DARK = '#261917', BOOT_MID = '#422c27', BOOT_LIT = '#63433b';

    if (pose === 'fallen') {
      fillEll(20, 46, 15, 5, (px, py, dx, dy, d) => d > 0.8 ? CLOAK_DARK : (dy < 0 ? CLOAK_LIT : CLOAK_MID));
      fillEll(11, 44, 7, 6, (px, py, dx, dy, d) => d > 0.82 ? HAIR_DARK : (dy < -0.2 ? HAIR_LIT : HAIR_MID));
      fillEll(29, 47, 5, 3, (px, py, dx, dy) => dy < 0 ? BOOT_LIT : BOOT_DARK);
      return c;
    }

    const bobY = (pose === 'idle1' || pose === 'walk1') ? 1 : (pose === 'celeb1' ? -2 : (pose === 'kneel' ? 5 : 0));
    const isFall = pose === 'fall0' || pose === 'fall1';

    // 1. Capa traseira esvoaçante estilo Otus (Owlboy) com dobras pictóricas
    const cloakSpread = (pose === 'celeb1' || isFall) ? 14 : (pose === 'walk0' || pose === 'walk2' ? 12 : 11);
    for (let py = 22 + bobY; py <= 46 + bobY; py++) {
      const t = (py - (22 + bobY)) / 24;
      const halfW = Math.round(7 + t * cloakSpread);
      for (let px = 20 - halfW; px <= 20 + halfW; px++) {
        const dx = (px - 20) / Math.max(1, halfW);
        const fold = Math.sin(dx * 5 + (pose === 'walk0' ? 0.6 : pose === 'walk2' ? -0.6 : 0));
        let col = CLOAK_MID;
        if (Math.abs(dx) > 0.86 || py === 46 + bobY) col = CLOAK_DARK;
        else if (py === 45 + bobY) col = CLOAK_TRIM;
        else if (fold > 0.35 && dx < 0.4) col = CLOAK_LIT;
        else if (fold < -0.35) col = CLOAK_DARK;
        put(px, py, col);
      }
    }

    // 2. Pernas e Botas de couro macio (sem contorno preto duro)
    const legLOff = pose === 'walk0' ? -3 : (pose === 'walk2' ? 3 : 0);
    const legROff = pose === 'walk0' ? 3 : (pose === 'walk2' ? -3 : 0);
    const legY0 = 41 + bobY;
    for (const [lx, off] of [[16, legLOff], [24, legROff]]) {
      const bx = lx + off;
      const by = legY0 - (Math.abs(off) > 0 ? 1 : 0);
      for (let py = by; py <= by + 10; py++) {
        for (let px = bx - 3; px <= bx + 3; px++) {
          if (py < by + 4) {
            put(px, py, px < bx ? TUNIC_MID : TUNIC_DARK);
          } else {
            const isEdge = px === bx - 3 || px === bx + 3 || py === by + 10;
            put(px, py, isEdge ? BOOT_DARK : (px < bx && py < by + 8 ? BOOT_LIT : BOOT_MID));
          }
        }
      }
    }

    // 3. Túnica terrosa/creme-sálvia e cinto com fivela dourada
    fillEll(20, 34 + bobY, 8, 9, (px, py, dx, dy, d) => {
      if (d > 0.84) return TUNIC_DARK;
      if (py >= 36 + bobY && py <= 38 + bobY) {
        return Math.abs(px - 20) <= 2 ? BELT_GOLD : BELT_DARK;
      }
      return (dx + dy < -0.15) ? TUNIC_LIT : (dx > 0.3 ? TUNIC_DARK : TUNIC_MID);
    });

    // 4. Gola/Manto sobre os ombros + broche dourado
    fillEll(20, 25 + bobY, 10, 4.5, (px, py, dx, dy, d) => {
      if (d > 0.82) return CLOAK_DARK;
      if (Math.abs(px - 20) <= 2 && py >= 25 + bobY && py <= 27 + bobY) return BELT_GOLD;
      return dy < 0 ? CLOAK_LIT : CLOAK_MID;
    });

    // 5. Braços e mãos expressivas
    const armY = (pose === 'celeb1' || pose === 'shock0' || isFall) ? 20 + bobY : 29 + bobY;
    for (const side of [-1, 1]) {
      const ax = 20 + side * 10;
      fillEll(ax, armY, 3, 5, (px, py, dx, dy, d) => d > 0.78 ? CLOAK_DARK : (dx * side < 0 ? CLOAK_LIT : CLOAK_MID));
      fillEll(ax + side, armY + (armY < 25 ? -4 : 4), 2.2, 2.2, (px, py, dx, dy) => dy < 0 ? SKIN_LIT : SKIN_DARK);
    }

    // 6. Cabeça e rosto estilo Otus (Owlboy) com bochechas quentes e olhos grandes expressivos
    const headY = 14 + bobY;
    // Cabelo de fundo
    fillEll(20, headY - 1, 11, 10, (px, py, dx, dy, d) => {
      if (d > 0.85) return HAIR_DARK;
      return (dx + dy < -0.25) ? HAIR_LIT : HAIR_MID;
    });
    // Tufos auriculares emplumados (inspirados em Otus de Owlboy)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const tx = 20 + side * (8 + i);
        const ty = headY - 6 - Math.floor(i * 0.6);
        put(tx, ty, HAIR_LIT);
        put(tx, ty + 1, HAIR_MID);
        put(tx, ty + 2, HAIR_DARK);
      }
    }
    // Rosto sombreado suavemente
    fillEll(20, headY + 2, 8.5, 7.5, (px, py, dx, dy, d) => {
      if (d > 0.86) return SKIN_DARK;
      if (dy > 0.45 || dx > 0.45) return SKIN_MID;
      return SKIN_LIT;
    });

    // Olhos grandes expressivos (com pupila profunda e brilho especular)
    for (const ox of [16, 24]) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          put(ox + dx, headY + 2 + dy, '#1f1414');
        }
      }
      put(ox - 1, headY + 1, '#ffffff');
      put(ox, headY + 1, '#ffffff');
      put(ox + 1, headY + 3, '#a3d9c9');
      // Sobrancelha emplumada
      for (let dx = -2; dx <= 2; dx++) {
        put(ox + dx, headY - 1, HAIR_DARK);
      }
    }

    // Boca (idle / talk / shock / celebrate)
    if (pose === 'talk1' || pose === 'celeb1' || pose === 'shock0') {
      for (let dx = -2; dx <= 2; dx++) {
        put(20 + dx, headY + 6, '#592525');
        put(20 + dx, headY + 7, '#c95b5b');
      }
    } else {
      put(19, headY + 6, '#8c5245');
      put(20, headY + 6, '#8c5245');
      put(21, headY + 6, '#8c5245');
    }

    // Franja detalhada em camadas sobre a testa (com dithering suave)
    for (let px = 11; px <= 29; px++) {
      const wave = Math.round(Math.sin((px - 11) * 0.65) * 2);
      for (let py = headY - 8; py <= headY - 1 + wave; py++) {
        const isTip = py === headY - 1 + wave;
        const isHi = py < headY - 5 && ((px + py) & 1) === 0;
        put(px, py, isTip ? HAIR_DARK : (isHi ? HAIR_HI : (py < headY - 4 ? HAIR_LIT : HAIR_MID)));
      }
    }

    return c;
  }


  // ============================================================================
  // RETRATOS DE DIÁLOGO (PORTRAIT / TALKING HEADS EM LOOP — 28x28 SOMENTE ROSTO)
  // Mais detalhados que os sprites normais de jogo!
  // ============================================================================
  function buildProtagonistPortrait(mouthOpen, blink) {
    const [c, x] = mk(28, 28);
    const put = (px, py, col) => {
      if (px >= 0 && py >= 0 && px < 28 && py < 28) {
        x.fillStyle = col;
        x.fillRect(px, py, 1, 1);
      }
    };
    // Fundo circular/moldura interna
    for (let j = 0; j < 28; j++) {
      for (let i = 0; i < 28; i++) {
        put(i, j, ((i + j) & 1) ? '#171136' : '#120d2b');
      }
    }
    // Cabelo de trás e contorno da cabeça
    for (let j = 3; j <= 24; j++) {
      for (let i = 5; i <= 22; i++) {
        const dx = (i - 13.5) / 8.5, dy = (j - 13.5) / 10;
        const d = dx * dx + dy * dy;
        if (d <= 1.05) {
          if (d > 0.86) put(i, j, '#140d2e');
          else if (j < 10 || i < 8 || i > 19) {
            put(i, j, (j < 7 && i < 16) ? '#684ca6' : (j < 9 ? '#4b357a' : '#2c1d4c'));
          } else {
            put(i, j, (j > 19 || i > 17) ? '#d49972' : '#f2c29b');
          }
        }
      }
    }
    // Franja detalhada em pixel art
    const bangs = [
      [8, 8], [9, 8], [9, 9], [10, 8], [11, 8], [12, 9], [13, 10],
      [14, 8], [15, 9], [16, 8], [17, 9], [18, 10], [19, 9]
    ];
    for (const [bx, by] of bangs) put(bx, by, '#4b357a');

    // Sobrancelhas expressivas
    for (let dx = 0; dx < 3; dx++) {
      put(9 + dx, 11, '#2c1d4c');
      put(16 + dx, 11, '#2c1d4c');
    }

    // Olhos grandes detalhados (somente rosto)
    if (blink) {
      for (let dx = 0; dx < 4; dx++) {
        put(9 + dx, 14, '#140d2e');
        put(15 + dx, 14, '#140d2e');
      }
    } else {
      for (const ox of [9, 15]) {
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) {
            put(ox + dx, 13 + dy, '#120824');
          }
        }
        put(ox, 13, '#ffffff');
        put(ox + 2, 15, '#3fc6f0');
      }
    }

    // Nariz e bochechas
    put(13, 16, '#d49972');
    put(8, 16, '#eb9696');
    put(19, 16, '#eb9696');

    // Boca (loop de fala!)
    if (mouthOpen === 0) {
      put(12, 19, '#8c4856');
      put(13, 19, '#8c4856');
      put(14, 19, '#8c4856');
    } else if (mouthOpen === 1) {
      for (let dx = 12; dx <= 15; dx++) {
        put(dx, 18, '#6e2737');
        put(dx, 19, '#ff72e0');
        put(dx, 20, '#6e2737');
      }
      put(13, 18, '#ffffff');
    } else {
      for (let dx = 12; dx <= 14; dx++) {
        put(dx, 18, '#6e2737');
        put(dx, 19, '#d44a6a');
      }
    }

    // Gola/Cachecol ciano na base do queixo
    for (let i = 7; i <= 20; i++) {
      put(i, 23, '#140d2e');
      put(i, 24, i < 14 ? '#3fc6f0' : '#1d70a8');
      put(i, 25, i < 14 ? '#9ef0ff' : '#3fc6f0');
      put(i, 26, '#140d2e');
    }
    return c;
  }

  function buildMysterySilhouettePortrait(pulseStep) {
    const [c, x] = mk(28, 28);
    const put = (px, py, col) => {
      if (px >= 0 && py >= 0 && px < 28 && py < 28) {
        x.fillStyle = col;
        x.fillRect(px, py, 1, 1);
      }
    };
    for (let j = 0; j < 28; j++) {
      for (let i = 0; i < 28; i++) {
        put(i, j, ((i + j) & 1) ? '#0c0820' : '#080518');
      }
    }
    // Ondas sonoras misteriosas ao fundo quando fala
    if (pulseStep > 0) {
      const r = 10 + pulseStep * 2;
      drawRing(x, 14, 14, r, pulseStep === 1 ? '#3fc6f0' : '#7b3fd0');
    }
    // Silhueta pura do rosto misterioso (coroa/tiara, cabelos e perfil em sombra absoluta)
    for (let j = 4; j <= 25; j++) {
      for (let i = 5; i <= 22; i++) {
        const dx = (i - 13.5) / 8, dy = (j - 14) / 10;
        const d = dx * dx + dy * dy;
        if (d <= 1.0) {
          const isRim = d > 0.82;
          put(i, j, isRim ? (pulseStep ? '#9ef0ff' : '#5a49c4') : '#04020c');
        }
      }
    }
    // Silhueta da coroa cristalina no topo da cabeça
    const crown = [[11, 3], [13, 2], [14, 2], [16, 3], [12, 4], [15, 4]];
    for (const [cx, cy] of crown) put(cx, cy, pulseStep ? '#9ef0ff' : '#4a36a8');

    // Brilho sutil de voz na região da boca/olhos em silhueta
    if (pulseStep === 1) {
      put(13, 19, '#9ef0ff');
      put(14, 19, '#9ef0ff');
    } else if (pulseStep === 2) {
      put(12, 19, '#3fc6f0');
      put(13, 18, '#ffffff');
      put(14, 18, '#ffffff');
      put(15, 19, '#3fc6f0');
    }
    return c;
  }

  function buildOrdemPortrait(mouthOpen, blink) {
    const [c, x] = mk(28, 28);
    const put = (px, py, col) => {
      if (px >= 0 && py >= 0 && px < 28 && py < 28) {
        x.fillStyle = col;
        x.fillRect(px, py, 1, 1);
      }
    };
    for (let j = 0; j < 28; j++) {
      for (let i = 0; i < 28; i++) {
        put(i, j, ((i + j) & 1) ? '#1a1244' : '#120c32');
      }
    }
    // Cabelo castanho-dourado e rosto detalhado da Ordem / Fada
    for (let j = 4; j <= 25; j++) {
      for (let i = 4; i <= 23; i++) {
        const dx = (i - 13.5) / 8.5, dy = (j - 14) / 10;
        const d = dx * dx + dy * dy;
        if (d <= 1.05) {
          if (d > 0.86) put(i, j, '#1a0f14');
          else if (j < 10 || i < 8 || i > 19) {
            put(i, j, (j < 8 && i < 16) ? '#6b3a1c' : '#3b1d0e');
          } else {
            put(i, j, (j > 19 || i > 17) ? '#55301a' : '#7a4426');
          }
        }
      }
    }
    // Tiara dourada com Gema Ciano da Fada
    for (let i = 9; i <= 18; i++) put(i, 7, '#ffd35a');
    put(13, 6, '#ffffff');
    put(14, 6, '#3fc6f0');
    put(13, 7, '#3fc6f0');
    put(14, 7, '#9ef0ff');

    // Olhos expressivos luminosos
    if (blink) {
      for (let dx = 0; dx < 3; dx++) {
        put(9 + dx, 14, '#3b1d0e');
        put(16 + dx, 14, '#3b1d0e');
      }
    } else {
      for (const ox of [9, 16]) {
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) put(ox + dx, 13 + dy, '#120806');
        }
        put(ox, 13, '#ffffff');
        put(ox + 2, 15, '#9ef0ff');
      }
    }
    // Boca falando em loop
    if (mouthOpen === 0) {
      put(12, 19, '#ffb8e6');
      put(13, 19, '#ffb8e6');
      put(14, 19, '#ffb8e6');
    } else if (mouthOpen === 1) {
      for (let dx = 12; dx <= 15; dx++) {
        put(dx, 18, '#552030');
        put(dx, 19, '#ff72e0');
        put(dx, 20, '#552030');
      }
      put(13, 18, '#ffffff');
    } else {
      put(12, 19, '#ff72e0');
      put(13, 18, '#ff72e0');
      put(14, 19, '#ff72e0');
    }
    return c;
  }

  // Notas musicais em pixel art para o `music_notes_loop`
  const NOTE_SINGLE = fromMap([
    '..ooo.',
    '..oCBo',
    '..oCo.',
    '..oCo.',
    'oooCo.',
    'oWCCo.',
    'oCCoo.',
    '.ooo..'
  ], { o: '#140d2e', W: '#ffffff', C: '#9ef0ff', B: '#3fc6f0' });

  const NOTE_DOUBLE = fromMap([
    '..oooooo.',
    '..oMMMMBo',
    '..oMo..oM',
    '..oMo..oM',
    'oooMo.ooM',
    'oWMMo.oWM',
    'oMMoo.oMM',
    '.ooo...oo'
  ], { o: '#140d2e', W: '#ffffff', M: '#ffc6f2', B: '#ff72e0' });

  // ============================================================================
  // RAINHA DA "ORDEM" / FADA LIBERTA — SPRITE HI-BIT 48x68 PIXELS (ESTILO MENTOR DE OWLBOY)
  // Proporção alta e elegante como o mentor na print de Owlboy, manto/asas em camadas
  // pictóricas sem contorno preto grosso, coroa dourada delicada e cabelos longos.
  // ============================================================================
  function buildHiBitOrdem(pose = 'idle0') {
    const W = 48, H = 68;
    const [c, x] = mk(W, H);
    c.hib = true;
    const put = (px, py, col) => {
      const ix = Math.round(px), iy = Math.round(py);
      if (ix >= 0 && iy >= 0 && ix < W && iy < H) {
        x.fillStyle = col;
        x.fillRect(ix, iy, 1, 1);
      }
    };
    const fillEll = (cx, cy, rx, ry, fn) => {
      for (let py = Math.floor(cy - ry - 1); py <= Math.ceil(cy + ry + 1); py++) {
        for (let px = Math.floor(cx - rx - 1); px <= Math.ceil(cx + rx + 1); px++) {
          const dx = (px - cx) / rx, dy = (py - cy) / ry;
          const d = dx * dx + dy * dy;
          if (d <= 1.0) {
            const col = fn(px, py, dx, dy, d);
            if (col) put(px, py, col);
          }
        }
      }
    };

    const isSil = pose === 'sil0' || pose === 'sil1' || pose === 'sil2';
    const wingLift = (pose === 'sing1' || pose === 'celeb0' || pose === 'sil1' || pose === 'sil2') ? -3 : 0;
    const wingSpread = (pose === 'sil2' || pose === 'celeb0') ? 2 : 0;
    const bobY = (pose === 'walk1' || pose === 'sing1' || pose === 'sil2') ? -1 : 0;

    const SIL_CORE = '#131824', SIL_MID = '#202b3d', SIL_RIM = pose === 'sil2' ? '#f2cc6b' : (pose === 'sil1' ? '#9ee6ff' : '#65b8d9');
    const WING_DARK = '#26384a', WING_MID = '#3e5c73', WING_LIT = '#6892ab', WING_HI = '#a7d4e8';
    const ROBE_DARK = '#243040', ROBE_MID = '#394d66', ROBE_LIT = '#567291';
    const SASH_DARK = '#8c7248', SASH_MID = '#bfa36f', SASH_LIT = '#e6cf9c';
    const HAIR_DARK = '#291a16', HAIR_MID = '#4a2f27', HAIR_LIT = '#73493c';
    const SKIN_DARK = '#6e4534', SKIN_MID = '#946049', SKIN_LIT = '#b87b60';
    const GOLD_DARK = '#9e742b', GOLD_LIT = '#f2cc6b';

    // 1. Asas / Manto real emplumado em camadas (estilo mentor Asio de Owlboy)
    for (const side of [-1, 1]) {
      for (let layer = 0; layer < 3; layer++) {
        const wy = 26 + layer * 6 + wingLift + bobY;
        const wx = 24 + side * (11 + wingSpread + layer * 2);
        fillEll(wx, wy, 9 - layer, 14 - layer * 2, (px, py, dx, dy, d) => {
          if (isSil) return d > 0.78 ? SIL_RIM : (d > 0.55 ? SIL_MID : SIL_CORE);
          if (d > 0.84) return WING_DARK;
          const feather = ((px + py) & 1) === 0;
          if (dy < -0.25) return feather ? WING_HI : WING_LIT;
          return feather ? WING_LIT : WING_MID;
        });
      }
    }

    // 2. Vestes longas e fluidas até os pés (proporção alta e imponente)
    for (let py = 27 + bobY; py <= 63 + bobY; py++) {
      const t = (py - (27 + bobY)) / 36;
      const halfW = Math.round(7 + t * 9);
      for (let px = 24 - halfW; px <= 24 + halfW; px++) {
        const dx = (px - 24) / Math.max(1, halfW);
        if (isSil) {
          put(px, py, Math.abs(dx) > 0.82 || py >= 62 + bobY ? SIL_RIM : SIL_CORE);
        } else {
          let col = ROBE_MID;
          if (Math.abs(dx) > 0.84 || py === 63 + bobY) col = ROBE_DARK;
          else if (py >= 60 + bobY) col = SASH_MID;
          else if (Math.abs(dx) < 0.28) {
            col = Math.abs(dx) < 0.14 ? SASH_LIT : SASH_MID;
          } else if (dx < -0.3) col = ROBE_LIT;
          else if (dx > 0.45) col = ROBE_DARK;
          put(px, py, col);
        }
      }
    }

    // 3. Cabelo longo em cascatas e busto real
    fillEll(24, 21 + bobY, 11, 12, (px, py, dx, dy, d) => {
      if (isSil) return d > 0.82 ? SIL_RIM : SIL_CORE;
      return d > 0.82 ? HAIR_DARK : (dx < 0 ? HAIR_LIT : HAIR_MID);
    });

    // 4. Braços elegantes (erguidos ao cantar/celebrar/apontar para o mural ou serenamente postados)
    const armUp = (pose === 'sing1' || pose === 'celeb0' || pose === 'sil2');
    for (const side of [-1, 1]) {
      const ax = 24 + side * (armUp ? 13 : 9);
      const ay = (armUp ? 23 : 32) + bobY;
      fillEll(ax, ay, 3.2, 6, (px, py, dx, dy, d) => {
        if (isSil) return d > 0.75 ? SIL_RIM : SIL_CORE;
        return dy > 0.4 ? SKIN_MID : (d > 0.8 ? ROBE_DARK : ROBE_LIT);
      });
    }

    // 5. Rosto esculpido da Rainha da Ordem
    const headY = 16 + bobY;
    fillEll(24, headY, 7.5, 8.5, (px, py, dx, dy, d) => {
      if (isSil) return d > 0.8 ? SIL_RIM : SIL_CORE;
      if (d > 0.85) return SKIN_DARK;
      if (py < headY - 2) return dx < 0 ? HAIR_LIT : HAIR_MID;
      return (dx > 0.35 || dy > 0.45) ? SKIN_MID : SKIN_LIT;
    });

    if (!isSil) {
      // Olhos expressivos luminosos
      for (const ox of [21, 27]) {
        for (let dy = -1; dy <= 1; dy++) {
          put(ox, headY + dy, '#1c1210');
          put(ox + 1, headY + dy, '#1c1210');
        }
        put(ox, headY - 1, '#ffffff');
        put(ox + 1, headY + 1, '#9ee6ff');
      }
      // Boca cantando ou serena
      if (pose === 'sing1' || pose === 'celeb0') {
        for (let dx = -2; dx <= 2; dx++) {
          put(24 + dx, headY + 4, '#4a1c24');
          put(24 + dx, headY + 5, '#d96b7d');
        }
      } else {
        put(23, headY + 4, '#6e352c');
        put(24, headY + 4, '#6e352c');
        put(25, headY + 4, '#6e352c');
      }
    }

    // 6. Coroa real cristalina no topo
    for (let dx = -6; dx <= 6; dx++) {
      const cy = headY - 7;
      const spike = (dx === -5 || dx === 0 || dx === 5) ? 3 : ((dx === -2 || dx === 2) ? 1 : 0);
      for (let s = 0; s <= spike; s++) {
        put(24 + dx, cy - s, isSil ? SIL_RIM : (s === spike ? '#ffffff' : (Math.abs(dx) <= 1 ? '#7be0ff' : GOLD_LIT)));
      }
      put(24 + dx, cy + 1, isSil ? SIL_MID : GOLD_DARK);
    }

    return c;
  }

  // ============================================================================
  // ANIMAIS DE PEDRA COM MUSGO E CRISTAIS LUMINOSOS — HI-BIT 38x36 PIXELS (ESTILO OWLBOY)
  // Criaturas rochosas esculpidas em tons terrosos (#262020, #3b3332, #524846, #6e635f)
  // com musgo vivo (#367030, #539e43, #7ec456) e veios cristalinos suaves.
  // ============================================================================
  function buildHiBitStoneAnimal(neonHi, neonMid, isSing = false) {
    const W = 38, H = 36;
    const [c, x] = mk(W, H);
    c.hib = true;
    const put = (px, py, col) => {
      const ix = Math.round(px), iy = Math.round(py);
      if (ix >= 0 && iy >= 0 && ix < W && iy < H) {
        x.fillStyle = col;
        x.fillRect(ix, iy, 1, 1);
      }
    };
    const fillEll = (cx, cy, rx, ry, fn) => {
      for (let py = Math.floor(cy - ry - 1); py <= Math.ceil(cy + ry + 1); py++) {
        for (let px = Math.floor(cx - rx - 1); px <= Math.ceil(cx + rx + 1); px++) {
          const dx = (px - cx) / rx, dy = (py - cy) / ry;
          const d = dx * dx + dy * dy;
          if (d <= 1.0) {
            const col = fn(px, py, dx, dy, d);
            if (col) put(px, py, col);
          }
        }
      }
    };

    const ROCK_0 = '#262020', ROCK_1 = '#3b3332', ROCK_2 = '#524846', ROCK_3 = '#6e635f';
    const MOSS_0 = '#367030', MOSS_1 = '#539e43', MOSS_2 = '#7ec456';

    // Cristais nas costas do guardião de pedra
    for (const [cx, cy, h] of [[13, 9, 8], [19, 7, 10], [25, 10, 7]]) {
      for (let py = cy - h; py <= cy; py++) {
        const w = Math.max(1, Math.round((1 - (cy - py) / h) * 3));
        for (let px = cx - w; px <= cx + w; px++) {
          put(px, py, px < cx ? '#ffffff' : (px === cx ? neonHi : neonMid));
        }
      }
    }

    // Corpo rochoso esculpido (guardião coruja/golem de pedra estilo Owlboy)
    fillEll(19, 22, 13, 10, (px, py, dx, dy, d) => {
      if (d > 0.85) return ROCK_0;
      if (dy < -0.55) {
        return ((px + py) & 1) === 0 ? MOSS_2 : (dy < -0.7 ? MOSS_1 : MOSS_0);
      }
      if (dx + dy < -0.2) return ROCK_3;
      if (dx + dy > 0.35) return ROCK_1;
      return ROCK_2;
    });

    // Patas de pedra na base
    fillEll(13, 32, 4, 3, (px, py, dx, dy) => dy < 0 ? ROCK_2 : ROCK_0);
    fillEll(25, 32, 4, 3, (px, py, dx, dy) => dy < 0 ? ROCK_2 : ROCK_0);

    // Olhos minerais luminosos e boca cantando
    for (const ox of [15, 23]) {
      put(ox, 19, neonHi);
      put(ox + 1, 19, '#ffffff');
      put(ox, 20, neonMid);
      put(ox + 1, 20, neonHi);
    }
    if (isSing) {
      for (let py = 23; py <= 26; py++) {
        for (let px = 17; px <= 21; px++) {
          put(px, py, py === 23 ? '#ffffff' : neonHi);
        }
      }
    } else {
      for (let px = 17; px <= 21; px++) put(px, 24, ROCK_0);
    }

    return c;
  }

  function makeStoneNeonAnimal(neonHi, neonMid) {
    const idle0 = buildHiBitStoneAnimal(neonHi, neonMid, false);
    const sing0 = buildHiBitStoneAnimal(neonHi, neonMid, true);
    return {
      idle: [idle0],
      sing: [sing0, idle0]
    };
  }

  // Compila todos os sprites Hi-Bit uma única vez no SpriteBank
  const PROTAG_F_IDLE0 = buildHiBitProtagonist('idle0');
  const PROTAG_F_IDLE1 = buildHiBitProtagonist('idle1');
  const PROTAG_F_WALK0 = buildHiBitProtagonist('walk0');
  const PROTAG_F_WALK2 = buildHiBitProtagonist('walk2');
  const PROTAG_F_TALK1 = buildHiBitProtagonist('talk1');
  const PROTAG_F_CELEB1 = buildHiBitProtagonist('celeb1');
  const PROTAG_F_FALL0 = buildHiBitProtagonist('fall0');
  const PROTAG_F_FALL1 = buildHiBitProtagonist('fall1');
  const PROTAG_F_FALLEN = buildHiBitProtagonist('fallen');
  const PROTAG_F_KNEEL = buildHiBitProtagonist('kneel');
  const PROTAG_F_SHOCK0 = buildHiBitProtagonist('shock0');

  const ORDEM_F_SIL0 = buildHiBitOrdem('sil0');
  const ORDEM_F_SIL1 = buildHiBitOrdem('sil1');
  const ORDEM_F_SIL2 = buildHiBitOrdem('sil2');
  const ORDEM_F_IDLE0 = buildHiBitOrdem('idle0');
  const ORDEM_F_WALK1 = buildHiBitOrdem('walk1');
  const ORDEM_F_SING1 = buildHiBitOrdem('sing1');
  const ORDEM_F_CELEB0 = buildHiBitOrdem('celeb0');

  const SpriteBank = {
    protagonist: {
      idle: [PROTAG_F_IDLE0, PROTAG_F_IDLE0, PROTAG_F_IDLE1, PROTAG_F_IDLE1],
      walk: [PROTAG_F_WALK0, PROTAG_F_IDLE1, PROTAG_F_WALK2, PROTAG_F_IDLE1],
      talk: [PROTAG_F_IDLE0, PROTAG_F_TALK1, PROTAG_F_IDLE0, PROTAG_F_TALK1],
      celebrate: [PROTAG_F_IDLE0, PROTAG_F_CELEB1, PROTAG_F_CELEB1, PROTAG_F_IDLE0],
      fall: [PROTAG_F_FALL0, PROTAG_F_FALL1],
      recover_stand: [PROTAG_F_FALLEN, PROTAG_F_FALLEN, PROTAG_F_KNEEL, PROTAG_F_IDLE0],
      shock: [PROTAG_F_SHOCK0, PROTAG_F_IDLE1]
    },
    ordem: {
      back_silhouette: [ORDEM_F_SIL0, ORDEM_F_SIL1, ORDEM_F_SIL2, ORDEM_F_SIL1],
      idle: [ORDEM_F_IDLE0, ORDEM_F_WALK1],
      walk: [ORDEM_F_IDLE0, ORDEM_F_WALK1],
      sing: [ORDEM_F_IDLE0, ORDEM_F_SING1],
      celebrate: [ORDEM_F_CELEB0, ORDEM_F_IDLE0]
    },
    stoneNeonAnimals: {
      cyan: makeStoneNeonAnimal('#a8e6cf', '#56ab91'),
      magenta: makeStoneNeonAnimal('#f2b8c6', '#bd6b82'),
      gold: makeStoneNeonAnimal('#f5df98', '#c49b45')
    },
    portraits: {
      portrait_protagonist: {
        idle: [
          buildProtagonistPortrait(0, false),
          buildProtagonistPortrait(0, false),
          buildProtagonistPortrait(0, false),
          buildProtagonistPortrait(0, true)
        ],
        talk: [
          buildProtagonistPortrait(0, false),
          buildProtagonistPortrait(1, false),
          buildProtagonistPortrait(2, false),
          buildProtagonistPortrait(1, false)
        ]
      },
      portrait_mystery_silhouette: {
        idle: [
          buildMysterySilhouettePortrait(0),
          buildMysterySilhouettePortrait(1),
          buildMysterySilhouettePortrait(0),
          buildMysterySilhouettePortrait(0)
        ],
        talk: [
          buildMysterySilhouettePortrait(0),
          buildMysterySilhouettePortrait(1),
          buildMysterySilhouettePortrait(2),
          buildMysterySilhouettePortrait(1)
        ]
      },
      portrait_ordem: {
        idle: [
          buildOrdemPortrait(0, false),
          buildOrdemPortrait(0, false),
          buildOrdemPortrait(0, false),
          buildOrdemPortrait(0, true)
        ],
        talk: [
          buildOrdemPortrait(0, false),
          buildOrdemPortrait(1, false),
          buildOrdemPortrait(2, false),
          buildOrdemPortrait(1, false)
        ]
      }
    },
    notes: [NOTE_SINGLE, NOTE_DOUBLE]
  };

  // ============================================================================
  // INSTANCIADOR DE ATORES E EFEITOS EM LOOP (ActorAnimator)
  // Renderiza sprites Hi-Bit (640x360) com precisão 1:1 de pixel físico.
  // ============================================================================
  const RH = (v) => Math.round(v * 2) * 0.5;
  const ActorAnimator = {
    /**
     * Desenha um ator do SpriteBank no estado desejado (em loop a 12 FPS).
     */
    drawActor(ctx, actorKey, stateKey, x, y, t, opts = {}) {
      const actor = SpriteBank[actorKey] || SpriteBank.protagonist;
      const frames = actor[stateKey] || actor.idle;
      const f12 = Math.floor(t * SPRITE_FPS);
      const idx = opts.loop === false
        ? clamp(f12, 0, frames.length - 1)
        : ((f12 % frames.length) + frames.length) % frames.length;
      let spr = frames[idx];
      if (opts.flipX) spr = mirrorCanvas(spr);

      const scale = spr.hib ? 0.5 : 1;
      const w = spr.width * scale;
      const h = spr.height * scale;

      let dy = 0;
      if (stateKey === 'celebrate' && (idx === 1 || idx === 2)) dy = -4;
      const dx = RH(x - w / 2), drawY = RH(y - h + dy);
      ctx.drawImage(spr, dx, drawY, w, h);

      if (stateKey === 'celebrate') {
        const starPhase = f12 % 6;
        drawStar(ctx, x - 12, y - 20 - (starPhase & 1), 2, '#ffffff', '#ffd35a');
        drawStar(ctx, x + 12, y - 18 + (starPhase & 1), 2, '#ffffff', '#9ef0ff');
      } else if (stateKey === 'shock' && (f12 & 1) === 0) {
        drawPixelChar(ctx, '!', R(x - 2), R(y - h - 9), '#ffd35a', '#140d2e');
      }
    },

    /**
     * Desenha um retrato (Talking Head 28x28 — somente o rosto) em loop.
     */
    drawPortrait(ctx, portraitKey, isTalking, x, y, t) {
      const pSet = SpriteBank.portraits[portraitKey] || SpriteBank.portraits.portrait_protagonist;
      const frames = isTalking ? pSet.talk : pSet.idle;
      const f12 = Math.floor(t * (isTalking ? 10 : 4));
      const frame = frames[((f12 % frames.length) + frames.length) % frames.length];
      ctx.drawImage(frame, R(x), R(y));
    },

    /**
     * Efeito reutilizável em loop: `music_notes_loop`
     * Notas musicais flutuando a partir de qualquer coordenada (x, y) e direção.
     */
    drawMusicNotesLoop(ctx, originX, originY, t, opts = {}) {
      const count = opts.count || 4;
      const dirX = opts.dirX !== undefined ? opts.dirX : -18;
      const dirY = opts.dirY !== undefined ? opts.dirY : -14;
      const period = opts.period || 2.4;

      for (let i = 0; i < count; i++) {
        const phase = ((t + (i * period) / count) % period) / period;
        const nx = R(originX + dirX * phase + Math.sin(phase * Math.PI * 2 + i) * 4);
        const ny = R(originY + dirY * phase + Math.cos(phase * Math.PI * 2) * 3);
        const spr = SpriteBank.notes[i & 1];
        if (phase < 0.88) {
          ctx.drawImage(spr, nx, ny);
          if (((Math.floor(t * 12) + i) & 3) === 0) {
            P1(ctx, nx + 3, ny - 2, '#ffffff');
          }
        }
      }
    },

    /**
     * Desenha um Animal de Pedra com Cristais Neon (em loop `idle` ou `sing` quando há voz secundária).
     */
    drawStoneNeonAnimal(ctx, variantKey, isSingingExtraVoice, x, y, t, flipX = false) {
      const animSet = SpriteBank.stoneNeonAnimals[variantKey] || SpriteBank.stoneNeonAnimals.cyan;
      const frames = isSingingExtraVoice ? animSet.sing : animSet.idle;
      const f12 = Math.floor(t * SPRITE_FPS);
      let spr = frames[f12 % frames.length];
      if (flipX) spr = mirrorCanvas(spr);
      const scale = spr.hib ? 0.5 : 1;
      const w = spr.width * scale;
      const h = spr.height * scale;
      const bob = isSingingExtraVoice ? ((f12 & 1) ? -1.5 : 0) : 0;
      ctx.drawImage(spr, RH(x - w / 2), RH(y - h + bob), w, h);

      if (isSingingExtraVoice) {
        this.drawMusicNotesLoop(ctx, x, y - h - 2, t, {
          count: 2,
          dirX: flipX ? -10 : 10,
          dirY: -12,
          period: 1.2
        });
      }
    },

    /**
     * Adapta SOMENTE o ícone da fada no círculo da fase no Mapa (`.journey-fairy`)
     * para o novo estilo Hi-Bit Pixel Art do jogo, mantendo o Mapa como placeholder intacto.
     */
    adaptMapFairyIcon() {
      const fairyEl = document.querySelector('.journey-fairy');
      if (!fairyEl) return;
      const cellW = 48, cellH = 68;
      const [sheet, sctx] = mk(cellW * 4, cellH * 2);
      for (let col = 0; col < 4; col++) {
        const idleSpr = SpriteBank.ordem.idle[col % SpriteBank.ordem.idle.length];
        const walkSpr = SpriteBank.ordem.celebrate[col % SpriteBank.ordem.celebrate.length];
        sctx.drawImage(idleSpr, col * cellW, 0);
        sctx.drawImage(walkSpr, col * cellW, cellH);
      }
      const dataUrl = sheet.toDataURL('image/png');
      fairyEl.style.backgroundImage = `url("${dataUrl}")`;
      fairyEl.style.imageRendering = 'pixelated';
    },

    /**
     * Efeito reutilizável em loop: `crystal_tremble_loop`
     * Retorna o deslocamento [dx, dy] em pixels inteiros a 12 FPS e desenha faíscas se ctx for passado.
     */
    getCrystalTrembleOffset(t, active = true, ctx = null, cx = 0, cy = 0) {
      if (!active) return [0, 0];
      const JITTER = [[-1, 0], [1, -1], [-1, 1], [1, 0], [0, -1], [1, 1], [-1, -1], [0, 1]];
      const f24 = Math.floor(t * 24);
      const [dx, dy] = JITTER[((f24 % 8) + 8) % 8];
      if (ctx && (f24 & 1) === 0) {
        drawStar(ctx, cx + dx * 3, cy + dy * 3, 2, '#ffffff', '#ff7043');
      }
      return [dx, dy];
    }
  };

  // ============================================================================
  // TRANSIÇÃO REUTILIZÁVEL: IRIS OUT / IRIS IN (`iris_transition`)
  // Tela preta onde um círculo vai se fechando até ficar tudo preto e vice-versa.
  // ============================================================================
  const IrisTransition = {
    active: false,
    mode: 'out', // 'out' (fechando círculo) | 'in' (abrindo círculo)
    duration: 0.9,
    elapsed: 0,
    cx: 160,
    cy: 90,
    onDone: null,

    start(mode = 'out', cx = 160, cy = 90, duration = 0.85, onDone = null) {
      this.active = true;
      this.mode = mode;
      this.cx = R(cx);
      this.cy = R(cy);
      this.duration = Math.max(0.2, duration);
      this.elapsed = 0;
      this.onDone = onDone;
    },

    update(dt) {
      if (!this.active) return;
      this.elapsed += dt;
      if (this.elapsed >= this.duration) {
        this.elapsed = this.duration;
        this.active = false;
        const cb = this.onDone;
        this.onDone = null;
        if (typeof cb === 'function') cb();
      }
    },

    render(ctx, overrideProgress = null, overrideMode = null) {
      const mode = overrideMode || this.mode;
      let p = overrideProgress !== null
        ? clamp(overrideProgress, 0, 1)
        : clamp(this.elapsed / this.duration, 0, 1);
      if (overrideProgress === null && !this.active && p === 0) return;

      // Quantizado a 24 FPS para fidelidade True Pixel Art
      p = Math.floor(p * 24) / 24;
      const maxR = 200;
      const radius = mode === 'out'
        ? maxR * (1 - easeInOut(p))
        : maxR * easeInOut(p);

      if (radius <= 1) {
        ctx.fillStyle = '#05030f';
        ctx.fillRect(0, 0, W, H);
        return;
      }
      if (radius >= maxR - 1) return;

      ctx.fillStyle = '#05030f';
      for (let y = 0; y < H; y++) {
        const dy = y - this.cy;
        for (let x = 0; x < W; x++) {
          const dx = x - this.cx;
          const d = Math.hypot(dx, dy) + (bay(x, y) - 7.5) * 0.35;
          if (d > radius) {
            ctx.fillRect(x, y, 1, 1);
          } else if (d > radius - 2 && ((x + y) & 1) === 0) {
            ctx.fillStyle = '#3fc6f0';
            ctx.fillRect(x, y, 1, 1);
            ctx.fillStyle = '#05030f';
          }
        }
      }
    }
  };

  // ============================================================================
  // 2. CAIXA DE DIÁLOGO GLOBAL (TRUE PIXEL ART)
  // - Design único e genérico para o jogo todo.
  // - No TOPO da caixa: moldura com o formato dos encaixes das 4 gemas faltantes.
  // - No LADO ESQUERDO: retrato (somente o rosto) mais detalhado em loop.
  // ============================================================================
  const DialogueBox = {
    isOpen: false,
    queue: [],
    currentIndex: 0,
    charProgress: 0,
    charsPerSec: 28,
    onComplete: null,
    // Estado global dos 4 encaixes das gemas no topo da caixa de diálogo
    sockets: {
      fairy: false,    // Gema da Fada (Caverna — formato borboleta/losango)
      forest: false,   // Esmeralda (Floresta — formato folha/oval)
      river: false,    // Turmalina Paraíba (Rio — formato gota/onda)
      caatinga: false  // Opala de Fogo (Caatinga — formato chama/sol)
    },

    open(lines, onComplete = null) {
      this.queue = Array.isArray(lines) ? lines : [lines];
      this.currentIndex = 0;
      this.charProgress = 0;
      this.isOpen = this.queue.length > 0;
      this.onComplete = onComplete;
    },

    advance() {
      if (!this.isOpen) return false;
      const cur = this.queue[this.currentIndex];
      if (!cur) return false;
      const fullLen = (cur.text || '').length;
      if (this.charProgress < fullLen) {
        this.charProgress = fullLen;
        return true;
      }
      this.currentIndex++;
      this.charProgress = 0;
      if (this.currentIndex >= this.queue.length) {
        this.isOpen = false;
        const cb = this.onComplete;
        this.onComplete = null;
        if (typeof cb === 'function') cb();
      }
      return true;
    },

    update(dt) {
      if (!this.isOpen) return;
      const cur = this.queue[this.currentIndex];
      if (!cur) return;
      const fullLen = (cur.text || '').length;
      if (this.charProgress < fullLen) {
        this.charProgress = Math.min(fullLen, this.charProgress + dt * this.charsPerSec);
      }
    },

    drawSocketCrest(ctx, cx, cy, f12) {
      // Brasão de madeira esculpida/bronze encaixado na borda superior do balão estilo Owlboy
      const cw = 92, ch = 10;
      const x0 = R(cx - cw / 2), y0 = R(cy - ch + 1);
      ctx.fillStyle = '#2c221e';
      ctx.fillRect(x0 - 1, y0 - 1, cw + 2, ch + 1);
      ctx.fillStyle = '#4a3830';
      ctx.fillRect(x0, y0, cw, ch);
      ctx.fillStyle = '#bfa36f';
      ctx.fillRect(x0 + 1, y0, cw - 2, 1);

      // 4 Encaixes das Gemas Primordiais bem espaçados e centralizados no topo:
      const s1x = R(cx - 30), s1y = y0 + 5;
      const lit1 = this.sockets.fairy;
      ctx.fillStyle = '#bfa36f';
      ctx.fillRect(s1x - 4, s1y - 3, 9, 6);
      ctx.fillStyle = lit1 ? '#68b8c4' : '#211815';
      ctx.fillRect(s1x - 3, s1y - 2, 7, 4);
      if (lit1) P1(ctx, s1x, s1y - 1, '#ffffff');

      const s2x = R(cx - 10), s2y = y0 + 5;
      const lit2 = this.sockets.forest;
      ctx.fillStyle = '#bfa36f';
      ctx.fillRect(s2x - 3, s2y - 3, 7, 6);
      ctx.fillStyle = lit2 ? '#539e43' : '#211815';
      ctx.fillRect(s2x - 2, s2y - 2, 5, 4);

      const s3x = R(cx + 10), s3y = y0 + 5;
      const lit3 = this.sockets.river;
      ctx.fillStyle = '#bfa36f';
      ctx.fillRect(s3x - 3, s3y - 3, 7, 6);
      ctx.fillStyle = lit3 ? '#4da6b8' : '#211815';
      ctx.fillRect(s3x - 2, s3y - 2, 5, 4);

      const s4x = R(cx + 30), s4y = y0 + 5;
      const lit4 = this.sockets.caatinga;
      ctx.fillStyle = '#bfa36f';
      ctx.fillRect(s4x - 3, s4y - 3, 7, 6);
      ctx.fillStyle = lit4 ? '#d96538' : '#211815';
      ctx.fillRect(s4x - 2, s4y - 2, 5, 4);

      if ((f12 & 3) === 0 && lit1) P1(ctx, s1x - 1, s1y - 1, '#ffffff');
    },

    render(ctx, t) {
      if (!this.isOpen) return;
      const cur = this.queue[this.currentIndex];
      if (!cur) return;

      const f12 = Math.floor(t * SPRITE_FPS);
      const portraitKey = cur.portrait || 'portrait_protagonist';
      // Retrato Hi-Bit em moldura losango: Protagonista à esquerda (olhando para a direita),
      // demais personagens à direita (olhando para a esquerda), sempre voltados para o texto.
      const portraitLeft = portraitKey === 'portrait_protagonist';
      const D = 46;                                   // meia-diagonal do losango (lógico)
      const pcx = portraitLeft ? 50 : 270, pcy = 134;  // centro do losango
      const bw = 236, bh = 48, by = 128;
      const bx = portraitLeft ? pcx + D - 14 : pcx - D + 14 - bw;
      const tailX = portraitLeft ? 68 : 176;

      const fullText = cur.text || '';
      const visibleCount = Math.floor(this.charProgress);
      const isTalking = visibleCount < fullText.length;

      // Balão de Diálogo em Pergaminho (#f4eedf com borda dupla #2c221e e #8c7d70)
      drawParchmentBox(ctx, bx, by, bw, bh, { tailX, tailDir: 'up' });

      // Brasão das 4 Gemas encaixado no topo (centralizado na área livre do balão)
      this.drawSocketCrest(ctx, portraitLeft ? bx + bw - 60 : bx + bw - 70, by, f12);

      // Plaqueta do nome com pontas em losango (estilo da referência)
      const speaker = cur.speaker || 'Protagonista';
      const nameW = Math.min(110, measurePixelText(speaker, 9) + 18);
      const nx = portraitLeft ? bx + 18 : bx + 12, ny = by - 13;
      this.drawNamePlate(ctx, nx, ny, nameW, speaker);

      // Texto com tipografia Owlboy (maiúsculas, minúsculas e acentos)
      const textX = portraitLeft ? bx + 16 : bx + 10;
      const textW = bw - 28;
      drawPixelText(ctx, fullText.slice(0, visibleCount), textX, by + 9, '#2c221e', null, textW, 10);

      // Setinha indicadora no canto inferior direito quando o texto terminou
      if (!isTalking) {
        const bob = (f12 & 1) ? 1 : 0;
        const ax = bx + bw - (portraitLeft ? 13 : 20), ay = by + bh - 10 + bob;
        ctx.fillStyle = '#8c2d1f';
        ctx.fillRect(ax, ay, 1, 7);
        ctx.fillRect(ax + 1, ay + 1, 1, 5);
        ctx.fillRect(ax + 2, ay + 2, 1, 3);
        ctx.fillRect(ax + 3, ay + 3, 1, 1);
      }

      // Moldura losango + retrato por cima da borda do balão
      this.drawDiamondPortrait(ctx, portraitKey, isTalking, pcx, pcy, D, t, portraitLeft);
    },

    drawNamePlate(ctx, x, y, w, name) {
      x = R(x); y = R(y);
      const h = 14, mid = y + h / 2;
      // Pontas em losango nas laterais
      for (let i = 0; i <= 7; i++) {
        const half = 7 - i;
        ctx.fillStyle = '#2c221e';
        ctx.fillRect(x - 8 + i, R(mid - half - 0.5), 1, half * 2 + 1);
        ctx.fillRect(x + w + 7 - i, R(mid - half - 0.5), 1, half * 2 + 1);
        if (i > 1 && half > 0) {
          ctx.fillStyle = '#bfa36f';
          ctx.fillRect(x - 8 + i, R(mid - half + 0.5), 1, Math.max(1, half * 2 - 1));
          ctx.fillRect(x + w + 7 - i, R(mid - half + 0.5), 1, Math.max(1, half * 2 - 1));
        }
      }
      // Corpo da plaqueta em madeira escura com filete dourado
      ctx.fillStyle = '#2c221e';
      ctx.fillRect(x - 1, y, w + 2, h);
      ctx.fillStyle = '#6e5444';
      ctx.fillRect(x, y + 1, w, h - 2);
      ctx.fillStyle = '#86685a';
      ctx.fillRect(x, y + 1, w, 2);
      ctx.fillStyle = '#4a3830';
      ctx.fillRect(x, y + h - 3, w, 2);
      ctx.fillStyle = '#d9bf86';
      ctx.fillRect(x, y + 1, w, 1);
      drawPixelTextCentered(ctx, name, x + w / 2, y + 3, '#fbf3df', '#2c221e', w - 4, 9);
    },

    drawDiamondPortrait(ctx, portraitKey, isTalking, cx, cy, D, t, faceRight) {
      const diamond = (d) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - d);
        ctx.lineTo(cx + d, cy);
        ctx.lineTo(cx, cy + d);
        ctx.lineTo(cx - d, cy);
        ctx.closePath();
      };
      // Desenha o losango em faixas de pixel inteiro (sem anti-aliasing)
      const fillDiamond = (d, col) => {
        ctx.fillStyle = col;
        for (let dy = -d; dy <= d; dy++) {
          const half = d - Math.abs(dy);
          ctx.fillRect(R(cx - half), R(cy + dy), half * 2 + 1, 1);
        }
      };
      fillDiamond(D + 2, '#2c221e');       // contorno externo
      fillDiamond(D + 1, '#d9bf86');       // filete dourado
      fillDiamond(D, '#5c4938');           // moldura de madeira
      fillDiamond(D - 2, '#2c221e');       // contorno interno
      fillDiamond(D - 3, '#3b4a3a');       // fundo do retrato (verde-musgo escuro)
      // Leve gradiente pictórico no fundo
      ctx.fillStyle = '#4a5c46';
      for (let dy = -(D - 3); dy < -(D - 3) / 3; dy++) {
        const half = (D - 3) - Math.abs(dy);
        ctx.fillRect(R(cx - half), R(cy + dy), half * 2 + 1, 1);
      }

      ctx.save();
      diamond(D - 3);
      ctx.clip();
      ActorAnimator.drawPortrait(ctx, portraitKey, isTalking, cx, cy + D - 3, t, { anchor: 'bottom', flipX: faceRight });
      ctx.restore();
    }
  };

  // ============================================================================
  // 3. SISTEMA DE TUTORIAL PAGINADO ESTILO OWLBOY (Vignette / Animated Tutorial Card)
  // ============================================================================
  const Q_TUT_ROWS = [
    '......o......',
    '.....oWo.....',
    '....oLWLo....',
    '...oLLWMLo...',
    '..oLLWLMMDo..',
    '.oLLWWLMMMDo.',
    '.oLLLWLMMMDo.',
    '.oLLLWLMMMDo.',
    '.oLLLWLMMMDo.',
    '.oLLLWLMMMDo.',
    '.oLLLLMDDDDo.',
    '..oLLLMDDDo..',
    '...oLLMDDo...',
    '....oLMDo....',
    '.....ooo.....'
  ];
  const SPR_PURE = fromMap(Q_TUT_ROWS, { o: '#294c66', W: '#ffffff', L: '#a8d8e6', M: '#6caac4', D: '#437794' });
  const SPR_SHADOW = fromMap(Q_TUT_ROWS, { o: '#1a122b', W: '#b8a6d9', L: '#5e4d82', M: '#413361', D: '#2a1f42' });
  const SPR_OPAL = fromMap(Q_TUT_ROWS, { o: '#541812', W: '#fff6cc', L: '#e68a49', M: '#c45131', D: '#8c2d1f' });
  const SPR_ROSE = fromMap(Q_TUT_ROWS, { o: '#59223b', W: '#fff2f5', L: '#e396b1', M: '#bf6588', D: '#8c3f60' });

  function drawMiniOrb(ctx, x, y, col, rim) {
    ctx.fillStyle = rim;
    ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.fillStyle = col;
    ctx.fillRect(x - 1, y - 1, 2, 2);
    P1(ctx, x - 1, y - 1, '#ffffff');
  }

  const TutorialModal = {
    isOpen: false,
    cards: [],
    currentIndex: 0,
    seenKeys: new Set(),
    onFinish: null,
    btnRect: { x: 194, y: 140, w: 78, h: 15 },

    open(cards, onFinish = null, onlyNew = false) {
      const list = (Array.isArray(cards) ? cards : [cards]).filter(c => {
        if (!onlyNew || !c.id) return true;
        if (this.seenKeys.has(c.id)) return false;
        return true;
      });
      if (!list.length) {
        if (typeof onFinish === 'function') onFinish();
        return;
      }
      this.cards = list;
      this.currentIndex = 0;
      this.isOpen = true;
      this.onFinish = onFinish;
      if (list[0].id) this.seenKeys.add(list[0].id);
      GameHUD.playSfx('tutorialOpen');
    },

    close() {
      this.isOpen = false;
      this.cards = [];
      this.currentIndex = 0;
      this.onFinish = null;
    },

    nextStep() {
      if (!this.isOpen) return false;
      this.currentIndex++;
      if (this.currentIndex < this.cards.length) {
        const cur = this.cards[this.currentIndex];
        if (cur && cur.id) this.seenKeys.add(cur.id);
        GameHUD.playSfx('tutorialAdvance');
        return true;
      }
      this.isOpen = false;
      GameHUD.playSfx('tutorialClose');
      const cb = this.onFinish;
      this.onFinish = null;
      if (typeof cb === 'function') cb();
      return true;
    },

    handleClick(lx, ly) {
      if (!this.isOpen) return false;
      const b = this.btnRect;
      if (lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h) {
        return this.nextStep();
      }
      return false;
    },

    drawVignette(ctx, type, vx, vy, vw, vh, t) {
      ctx.fillStyle = '#241d1a';
      ctx.fillRect(vx, vy, vw, vh);
      ctx.fillStyle = '#8c7d70';
      ctx.fillRect(vx, vy, vw, 1);
      ctx.fillRect(vx, vy + vh - 1, vw, 1);
      ctx.fillRect(vx, vy, 1, vh);
      ctx.fillRect(vx + vw - 1, vy, 1, vh);

      const phase = (t % 2.4) / 2.4;
      const cy = R(vy + vh / 2 + 2);

      if (type === 'drag_and_shadow') {
        const sx = vx + vw - 44;
        const px = phase < 0.65
          ? R(vx + 36 + easeInOut(phase / 0.65) * (sx - (vx + 36)))
          : sx;

        if (phase < 0.72) {
          ctx.drawImage(SPR_SHADOW, sx - 6, cy - 7);
          drawMiniOrb(ctx, sx, cy - 11, '#b8a6d9', '#1a122b');
          ctx.drawImage(SPR_PURE, px - 6, cy - 7);
          drawMiniOrb(ctx, px, cy - 11, '#a8d8e6', '#294c66');
          ctx.fillStyle = '#f2cc6b';
          ctx.fillRect(px + 3, cy + 4, 3, 3);
        } else {
          const r = R((phase - 0.72) * 45);
          drawRing(ctx, sx, cy, r, '#a8d8e6');
          drawStar(ctx, sx, cy, 4, '#ffffff', '#f2cc6b');
        }
      } else if (type === 'obstacle_decay') {
        const stage = Math.floor(phase * 3);
        const ox = R(vx + vw / 2 - 14), oy = vy + 6;
        for (let k = 0; k < 3; k++) {
          const lit = k <= stage;
          ctx.fillStyle = lit ? '#7ec456' : '#3b3332';
          ctx.fillRect(vx + 22 + k * 14, cy - 2, 8, 6);
        }
        const hBar = (3 - stage) * 8;
        ctx.fillStyle = '#524846';
        ctx.fillRect(ox + 24, oy + (24 - hBar), 16, hBar);
        if (stage > 0) drawStar(ctx, ox + 32, oy + (24 - hBar), 3, '#ffffff', '#f2cc6b');
      } else if (type === 'fire_opal') {
        const near = phase > 0.25 && phase < 0.75;
        const [jx, jy] = ActorAnimator.getCrystalTrembleOffset(t, near, ctx, vx + 96, cy);
        const ox = near ? vx + 80 : R(vx + 40 + Math.sin(phase * Math.PI) * 34);
        ctx.drawImage(SPR_PURE, vx + 94 + jx, cy - 7 + jy);
        drawMiniOrb(ctx, vx + 98 + jx, cy - 11 + jy, '#a8d8e6', '#294c66');
        if (!near) drawMiniOrb(ctx, vx + 104 + jx, cy - 10 + jy, '#a8d8e6', '#294c66');
        ctx.drawImage(SPR_OPAL, ox - jx, cy - 7 - jy);
        drawMiniOrb(ctx, ox + 6 - jx, cy - 11 - jy, '#f7c97e', '#541812');
      } else if (type === 'rose_quartz' || type === 'aura_equation') {
        const expanded = phase > 0.35 && phase < 0.75;
        const r = expanded ? 16 : 11;
        drawRing(ctx, R(vx + vw / 2), cy, r, '#cfa3c4');
        ctx.drawImage(SPR_ROSE, R(vx + vw / 2 - (expanded ? 12 : 8)), cy - 7);
        ctx.drawImage(SPR_PURE, R(vx + vw / 2 + (expanded ? 3 : 0)), cy - 7);
      }
    },

    render(ctx, t) {
      if (!this.isOpen || !this.cards.length) return;
      const card = this.cards[this.currentIndex];
      if (!card) return;

      // Véu escuro suave sobre o fundo
      ctx.fillStyle = 'rgba(10, 8, 6, 0.55)';
      ctx.fillRect(0, 20, W, H - 20);

      const cx = 32, cy = 24, cw = 256, ch = 138;
      this.btnRect = { x: cx + cw - 86, y: cy + ch - 21, w: 76, h: 15 };

      drawParchmentBox(ctx, cx, cy, cw, ch, { headerH: 16, headerBg: '#3d2b24' });

      // Cabeçalho + paginação bem enquadrados
      const stepLabel = `Página ${this.currentIndex + 1}/${this.cards.length}`;
      drawPixelText(ctx, card.title || 'Como Jogar', cx + 10, cy + 7, '#f7e2b8', '#1f1410', 168, 9);
      drawPixelText(ctx, stepLabel, cx + 10, cy + 7, '#d9c398', '#1f1410', cw - 20, 9, 'right');

      // Vinheta animada demonstrativa
      this.drawVignette(ctx, card.vignette || 'drag_and_shadow', cx + 10, cy + 23, cw - 20, 36, t);

      // Texto explicativo perfeitamente centralizado e enquadrado no pergaminho
      drawPixelText(ctx, card.body || '', cx + 12, cy + 65, '#2c221e', null, cw - 24, 10);

      // Botão para avançar/concluir no canto inferior direito do pergaminho
      const b = this.btnRect;
      const isLast = this.currentIndex >= this.cards.length - 1;
      ctx.fillStyle = '#2c221e';
      ctx.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      ctx.fillStyle = isLast ? '#3e7338' : '#633b34';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#d9a85b';
      ctx.fillRect(b.x, b.y, b.w, 1);
      ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);

      const btnText = isLast ? 'Começar!' : 'Avançar >';
      drawPixelTextCentered(ctx, btnText, b.x + b.w / 2, b.y + 4, '#ffffff', '#1f1410', b.w - 4, 9);
    }
  };

  // ============================================================================
  // 4. BARRA DE HUD SUPERIOR + PAUSE + RECOMEÇAR + MUDO + CONFIGURAÇÕES (Estilo Owlboy)
  // ============================================================================
  const RESTART_ICON_SPR = fromMap([
    '..ooGGGoo.',
    '.oGWWWWGo.',
    'oGWooooYWo',
    'oWo..oYYYo',
    'oWo...oYYo',
    'oWo......o',
    'oGWo....o.',
    '.oGWWWWGo.',
    '..ooGGGoo.',
    '..........'
  ], {
    o: '#1f1410',
    G: '#a8d8e6',
    W: '#ffffff',
    Y: '#f2cc6b'
  });

  const GameHUD = {
    paused: false,
    settingsOpen: false,
    muted: false,
    musicVol: 70,
    sfxVol: 80,
    reducedMotion: false,
    restartFlashUntil: 0,

    // Botões na barra superior (320x20):
    buttons: {
      pause:    { x: 188, y: 2, w: 20, h: 16 },
      restart:  { x: 210, y: 2, w: 64, h: 16 },
      mute:     { x: 276, y: 2, w: 20, h: 16 },
      settings: { x: 298, y: 2, w: 20, h: 16 }
    },

    // Botões do Modal de Pause (centralizados na caixa 184px)
    pauseMenuBtns: [
      { id: 'resume',   label: 'Continuar Jogo',  x: 92, y: 52,  w: 136, h: 15 },
      { id: 'restart',  label: 'Reiniciar Fase',  x: 92, y: 71,  w: 136, h: 15 },
      { id: 'mute',     label: 'Alternar Mudo',   x: 92, y: 90,  w: 136, h: 15 },
      { id: 'settings', label: 'Configurações',   x: 92, y: 109, w: 136, h: 15 },
      { id: 'map',      label: 'Voltar ao Mapa',  x: 92, y: 128, w: 136, h: 15 }
    ],

    // Botões e barras clicáveis do Modal de Configurações
    settingsBtns: {
      musMinus: { x: 136, y: 50, w: 18, h: 14 },
      musBar:   { x: 158, y: 50, w: 56, h: 14 },
      musPlus:  { x: 218, y: 50, w: 18, h: 14 },
      sfxMinus: { x: 136, y: 70, w: 18, h: 14 },
      sfxBar:   { x: 158, y: 70, w: 56, h: 14 },
      sfxPlus:  { x: 218, y: 70, w: 18, h: 14 },
      muteBtn:  { x: 136, y: 90, w: 112, h: 14 },
      motionBtn:{ x: 136, y: 110, w: 112, h: 14 },
      closeBtn: { x: 106, y: 132, w: 108, h: 15 }
    },

    onRestart: null,
    onGoMap: null,
    onMuteChange: null,

    inRect(x, y, r, padY = 0) {
      return x >= r.x && x <= r.x + r.w && y >= (r.y - padY) && y <= (r.y + r.h + padY);
    },

    syncAudio() {
      const isMuted = !!this.muted;
      const effMus = isMuted ? 0 : clamp(this.musicVol / 100, 0, 1);
      const effSfx = isMuted ? 0 : clamp(this.sfxVol / 100, 0, 1);

      try {
        if (global.CrystalAudio) {
          global.CrystalAudio.setVolume?.(effSfx);
          global.CrystalAudio.setEnabled?.(!isMuted && this.sfxVol > 0);
        }
        if (global.CrystalMusic) {
          global.CrystalMusic.setVolume?.(effMus);
          global.CrystalMusic.setEnabled?.(!isMuted && this.musicVol > 0);
        }
        if (global.CrystalShowdown) {
          global.CrystalShowdown.setVolume?.(effMus);
        }
        if (global.CrystalMenuAudio) {
          global.CrystalMenuAudio.setVolume?.(effMus);
          const tr = global.CrystalMenuAudio.track;
          if (tr) {
            tr.muted = isMuted || effMus <= 0;
            tr.volume = effMus;
          }
        }
        if (typeof document !== 'undefined') {
          document.querySelectorAll('audio, video').forEach((media) => {
            media.muted = isMuted || effMus <= 0;
            media.volume = effMus;
          });
          const musInput = document.getElementById('musicVolume');
          const musOut = document.getElementById('musicValue');
          if (musInput) musInput.value = String(isMuted ? 0 : this.musicVol);
          if (musOut) musOut.textContent = `${isMuted ? 0 : this.musicVol}%`;

          const fxInput = document.getElementById('fxVolume');
          const fxOut = document.getElementById('fxValue');
          if (fxInput) fxInput.value = String(isMuted ? 0 : this.sfxVol);
          if (fxOut) fxOut.textContent = `${isMuted ? 0 : this.sfxVol}%`;
        }
      } catch (_) {}

      if (typeof this.onMuteChange === 'function') {
        this.onMuteChange(isMuted, effMus, effSfx);
      }
    },

    playSfx(kind = 'click') {
      if (this.muted || this.sfxVol <= 0) return;
      try {
        if (global.CrystalAudio) {
          global.CrystalAudio.unlock?.();
          global.CrystalAudio.setEnabled?.(true);
          global.CrystalAudio.setVolume?.(clamp(this.sfxVol / 100, 0, 1));
          if (typeof global.CrystalAudio[kind] === 'function') {
            global.CrystalAudio[kind](2);
          }
        }
      } catch (_) {}
    },

    toggleMute() {
      this.muted = !this.muted;
      this.syncAudio();
      if (!this.muted) {
        this.playSfx('click');
      }
    },

    triggerRestart() {
      this.paused = false;
      this.settingsOpen = false;
      this.restartFlashUntil = (typeof performance !== 'undefined' ? performance.now() : 0) + 280;
      this.playSfx('click');
      if (typeof this.onRestart === 'function') {
        this.onRestart();
      }
    },

    handleClick(x, y) {
      if (this.inRect(x, y, this.buttons.pause, 2)) {
        this.settingsOpen = false;
        this.paused = !this.paused;
        this.playSfx('click');
        this.syncAudio();
        return true;
      }
      if (this.inRect(x, y, this.buttons.restart, 2)) {
        this.triggerRestart();
        return true;
      }
      if (this.inRect(x, y, this.buttons.mute, 2)) {
        this.toggleMute();
        return true;
      }
      if (this.inRect(x, y, this.buttons.settings, 2)) {
        this.settingsOpen = !this.settingsOpen;
        this.playSfx('click');
        this.syncAudio();
        return true;
      }

      if (this.settingsOpen) {
        const sb = this.settingsBtns;
        if (this.inRect(x, y, sb.musMinus)) {
          this.musicVol = Math.max(0, this.musicVol - 20);
          this.syncAudio();
          this.playSfx('click');
          return true;
        }
        if (this.inRect(x, y, sb.musPlus)) {
          this.musicVol = Math.min(100, this.musicVol + 20);
          if (this.musicVol > 0 && this.muted) this.muted = false;
          this.syncAudio();
          this.playSfx('click');
          return true;
        }
        if (this.inRect(x, y, sb.musBar)) {
          const ratio = clamp((x - sb.musBar.x) / sb.musBar.w, 0, 1);
          this.musicVol = clamp(Math.round((ratio * 100) / 20) * 20, 0, 100);
          if (this.musicVol > 0 && this.muted) this.muted = false;
          this.syncAudio();
          this.playSfx('click');
          return true;
        }
        if (this.inRect(x, y, sb.sfxMinus)) {
          this.sfxVol = Math.max(0, this.sfxVol - 20);
          this.syncAudio();
          this.playSfx('clink');
          return true;
        }
        if (this.inRect(x, y, sb.sfxPlus)) {
          this.sfxVol = Math.min(100, this.sfxVol + 20);
          if (this.sfxVol > 0 && this.muted) this.muted = false;
          this.syncAudio();
          this.playSfx('clink');
          return true;
        }
        if (this.inRect(x, y, sb.sfxBar)) {
          const ratio = clamp((x - sb.sfxBar.x) / sb.sfxBar.w, 0, 1);
          this.sfxVol = clamp(Math.round((ratio * 100) / 20) * 20, 0, 100);
          if (this.sfxVol > 0 && this.muted) this.muted = false;
          this.syncAudio();
          this.playSfx('clink');
          return true;
        }
        if (this.inRect(x, y, sb.muteBtn)) {
          this.toggleMute();
          return true;
        }
        if (this.inRect(x, y, sb.motionBtn)) {
          this.reducedMotion = !this.reducedMotion;
          if (typeof document !== 'undefined') {
            document.body.classList.toggle('reduce-motion', this.reducedMotion);
          }
          this.playSfx('click');
          return true;
        }
        if (this.inRect(x, y, sb.closeBtn)) {
          this.settingsOpen = false;
          this.playSfx('click');
          this.syncAudio();
          return true;
        }
        return true;
      }

      if (this.paused) {
        for (const b of this.pauseMenuBtns) {
          if (this.inRect(x, y, b)) {
            if (b.id === 'resume') {
              this.paused = false;
              this.playSfx('click');
              this.syncAudio();
            } else if (b.id === 'restart') {
              this.triggerRestart();
            } else if (b.id === 'mute') {
              this.toggleMute();
            } else if (b.id === 'settings') {
              this.settingsOpen = true;
              this.playSfx('click');
            } else if (b.id === 'map') {
              this.paused = false;
              this.playSfx('click');
              if (typeof this.onGoMap === 'function') this.onGoMap();
            }
            return true;
          }
        }
        return true;
      }

      return false;
    },

    drawButtonBox(ctx, r, active = false) {
      ctx.fillStyle = '#2c221e';
      ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      ctx.fillStyle = active ? '#633b34' : '#3d2b24';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = active ? '#f2cc6b' : '#9e8c7a';
      ctx.fillRect(r.x, r.y, r.w, 1);
      ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
      ctx.fillRect(r.x, r.y, 1, r.h);
      ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
    },

    drawVolumeBar(ctx, r, val, isMuted) {
      ctx.fillStyle = '#2c221e';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#8c7d70';
      ctx.fillRect(r.x, r.y, r.w, 1);
      ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
      const steps = 5;
      const activeSteps = isMuted ? 0 : Math.round((val / 100) * steps);
      for (let i = 0; i < steps; i++) {
        const bx = r.x + 3 + i * 10;
        const by = r.y + 3;
        ctx.fillStyle = i < activeSteps ? '#539e43' : '#423630';
        ctx.fillRect(bx, by, 8, r.h - 6);
        if (i < activeSteps) {
          ctx.fillStyle = '#a5e06c';
          ctx.fillRect(bx, by, 8, 2);
        }
      }
    },

    renderTopBar(ctx, levelNum, currentStep, totalSteps) {
      // Barra Superior Esculpida Estilo Owlboy (0..20)
      ctx.fillStyle = '#241c19';
      ctx.fillRect(0, 0, W, 20);
      ctx.fillStyle = '#8c7d70';
      ctx.fillRect(0, 19, W, 1);
      ctx.fillStyle = '#d9a85b';
      ctx.fillRect(0, 19, 8, 1);
      ctx.fillRect(W - 8, 19, 8, 1);

      // Título da Fase à esquerda (com acentuação e minúsculas legíveis)
      drawPixelText(ctx, `Caverna - Fase ${levelNum}`, 6, 6, '#f7e2b8', '#120d0b', 96, 9);

      // Indicador visual de Etapas no centro-esquerda
      drawPixelText(ctx, `Etapa ${currentStep}/${totalSteps}`, 94, 6, '#a8d8e6', '#120d0b', 62, 9);
      for (let s = 1; s <= totalSteps; s++) {
        const dx = 148 + (s - 1) * 10, dy = 9;
        const done = s < currentStep;
        const cur = s === currentStep;
        ctx.fillStyle = done ? '#539e43' : cur ? '#68b8c4' : '#3b3332';
        ctx.fillRect(dx - 3, dy - 3, 6, 6);
        ctx.fillStyle = done || cur ? '#ffffff' : '#8c7d70';
        ctx.fillRect(dx - 1, dy - 1, 2, 2);
      }

      // 1. Botão PAUSE (❚❚)
      const bp = this.buttons.pause;
      this.drawButtonBox(ctx, bp, this.paused);
      ctx.fillStyle = '#f4eedf';
      ctx.fillRect(bp.x + 6, bp.y + 4, 3, 8);
      ctx.fillRect(bp.x + 11, bp.y + 4, 3, 8);

      // 2. Botão REINICIAR FASE (↻ Reiniciar — representativo e perfeitamente enquadrado)
      const br = this.buttons.restart;
      const nowMs = typeof performance !== 'undefined' ? performance.now() : 0;
      const flashing = nowMs < this.restartFlashUntil;
      ctx.fillStyle = flashing ? '#3e7338' : '#2e4c59';
      ctx.fillRect(br.x, br.y, br.w, br.h);
      ctx.fillStyle = flashing ? '#f2cc6b' : '#84bdd1';
      ctx.fillRect(br.x, br.y, br.w, 1);
      ctx.fillRect(br.x, br.y + br.h - 1, br.w, 1);
      ctx.fillRect(br.x, br.y, 1, br.h);
      ctx.fillRect(br.x + br.w - 1, br.y, 1, br.h);
      ctx.drawImage(RESTART_ICON_SPR, br.x + 3, br.y + 3);
      drawPixelTextCentered(ctx, 'Reiniciar', br.x + 13 + (br.w - 14) / 2, br.y + 5, flashing ? '#f2cc6b' : '#ffffff', '#120d0b', br.w - 14, 8);

      // 3. Botão DEIXAR NO MUDO (🔊 / 🔇)
      const bm = this.buttons.mute;
      this.drawButtonBox(ctx, bm, this.muted);
      ctx.fillStyle = this.muted ? '#d96538' : '#7ec456';
      ctx.fillRect(bm.x + 4, bm.y + 6, 3, 4);
      ctx.fillRect(bm.x + 7, bm.y + 5, 2, 6);
      ctx.fillRect(bm.x + 9, bm.y + 4, 2, 8);
      if (this.muted) {
        P1(ctx, bm.x + 13, bm.y + 5, '#e65c4f');
        P1(ctx, bm.x + 14, bm.y + 6, '#e65c4f');
        P1(ctx, bm.x + 15, bm.y + 7, '#e65c4f');
        P1(ctx, bm.x + 16, bm.y + 8, '#e65c4f');
        P1(ctx, bm.x + 16, bm.y + 5, '#e65c4f');
        P1(ctx, bm.x + 15, bm.y + 6, '#e65c4f');
        P1(ctx, bm.x + 14, bm.y + 7, '#e65c4f');
        P1(ctx, bm.x + 13, bm.y + 8, '#e65c4f');
      } else {
        P1(ctx, bm.x + 13, bm.y + 6, '#a8d8e6');
        P1(ctx, bm.x + 13, bm.y + 9, '#a8d8e6');
        P1(ctx, bm.x + 15, bm.y + 5, '#ffffff');
        P1(ctx, bm.x + 15, bm.y + 10, '#ffffff');
      }

      // 4. Botão CONFIGURAÇÕES (⚙)
      const bs = this.buttons.settings;
      this.drawButtonBox(ctx, bs, this.settingsOpen);
      const gx = bs.x + 10, gy = bs.y + 8;
      ctx.fillStyle = '#f2cc6b';
      ctx.fillRect(gx - 3, gy - 3, 7, 7);
      P1(ctx, gx, gy - 4, '#ffffff');
      P1(ctx, gx, gy + 4, '#ffffff');
      P1(ctx, gx - 4, gy, '#ffffff');
      P1(ctx, gx + 4, gy, '#ffffff');
      ctx.fillStyle = '#3d2b24';
      ctx.fillRect(gx - 1, gy - 1, 3, 3);
    },

    renderModals(ctx) {
      if (!this.paused && !this.settingsOpen) return;

      ctx.fillStyle = 'rgba(10, 8, 6, 0.55)';
      ctx.fillRect(0, 20, W, H - 20);

      if (this.settingsOpen) {
        const cx = 32, cy = 26, cw = 256, ch = 132;
        drawParchmentBox(ctx, cx, cy, cw, ch, { headerH: 16, headerBg: '#3d2b24' });
        drawPixelTextCentered(ctx, 'Configurações de Som e Jogo', cx + cw / 2, cy + 7, '#f7e2b8', '#1f1410', cw - 16, 9);

        const sb = this.settingsBtns;
        drawPixelText(ctx, 'Música:', cx + 14, 54, '#2c221e', null, 80, 9);
        this.drawButtonBox(ctx, sb.musMinus, false);
        drawPixelTextCentered(ctx, '-', sb.musMinus.x + sb.musMinus.w / 2, sb.musMinus.y + 4, '#ffffff', null, 14, 9);
        this.drawVolumeBar(ctx, sb.musBar, this.musicVol, this.muted);
        this.drawButtonBox(ctx, sb.musPlus, false);
        drawPixelTextCentered(ctx, '+', sb.musPlus.x + sb.musPlus.w / 2, sb.musPlus.y + 4, '#ffffff', null, 14, 9);
        drawPixelText(ctx, `${this.muted ? 0 : this.musicVol}%`, sb.musPlus.x + 22, 54, '#633b34', null, 40, 9);

        drawPixelText(ctx, 'Efeitos:', cx + 14, 74, '#2c221e', null, 80, 9);
        this.drawButtonBox(ctx, sb.sfxMinus, false);
        drawPixelTextCentered(ctx, '-', sb.sfxMinus.x + sb.sfxMinus.w / 2, sb.sfxMinus.y + 4, '#ffffff', null, 14, 9);
        this.drawVolumeBar(ctx, sb.sfxBar, this.sfxVol, this.muted);
        this.drawButtonBox(ctx, sb.sfxPlus, false);
        drawPixelTextCentered(ctx, '+', sb.sfxPlus.x + sb.sfxPlus.w / 2, sb.sfxPlus.y + 4, '#ffffff', null, 14, 9);
        drawPixelText(ctx, `${this.muted ? 0 : this.sfxVol}%`, sb.sfxPlus.x + 22, 74, '#633b34', null, 40, 9);

        drawPixelText(ctx, 'Áudio Geral:', cx + 14, 94, '#2c221e', null, 88, 9);
        this.drawButtonBox(ctx, sb.muteBtn, this.muted);
        drawPixelTextCentered(ctx, this.muted ? 'Mudo: Ativado' : 'Som: Ativado', sb.muteBtn.x + sb.muteBtn.w / 2, sb.muteBtn.y + 4, this.muted ? '#f2cc6b' : '#a5e06c', '#1f1410', sb.muteBtn.w - 4, 9);

        drawPixelText(ctx, 'Movimento:', cx + 14, 114, '#2c221e', null, 88, 9);
        this.drawButtonBox(ctx, sb.motionBtn, this.reducedMotion);
        drawPixelTextCentered(ctx, this.reducedMotion ? 'Reduzido' : 'Normal', sb.motionBtn.x + sb.motionBtn.w / 2, sb.motionBtn.y + 4, '#f4eedf', '#1f1410', sb.motionBtn.w - 4, 9);

        this.drawButtonBox(ctx, sb.closeBtn, true);
        drawPixelTextCentered(ctx, 'Voltar ao Jogo', sb.closeBtn.x + sb.closeBtn.w / 2, sb.closeBtn.y + 4, '#ffffff', '#1f1410', sb.closeBtn.w - 4, 9);
        return;
      }

      if (this.paused) {
        const cx = 68, cy = 26, cw = 184, ch = 132;
        drawParchmentBox(ctx, cx, cy, cw, ch, { headerH: 16, headerBg: '#3d2b24' });
        drawPixelTextCentered(ctx, 'Jogo Pausado', cx + cw / 2, cy + 7, '#f7e2b8', '#1f1410', cw - 16, 9);

        for (const b of this.pauseMenuBtns) {
          this.drawButtonBox(ctx, b, b.id === 'resume');
          const label = b.id === 'mute' ? (this.muted ? 'Som: Mudo' : 'Som: Ligado') : b.label;
          drawPixelTextCentered(ctx, label, b.x + b.w / 2, b.y + 4, '#ffffff', '#1f1410', b.w - 6, 9);
        }
      }
    }
  };

  // Cards padrões de Tutorial do Jogo em Pergaminho Estilo Owlboy (com acentuação completa)
  const StandardTutorialCards = {
    FASE1_INTRO: [
      {
        id: 'tut_drag_and_shadow_once',
        title: 'Cristais e Sombras',
        vignette: 'drag_and_shadow',
        body: 'Arraste os cristais pelo campo. As bolinhas luminosas acima do cristal mostram seu valor: una cristais puros aos sombrios equivalentes para anulá-los!'
      },
      {
        id: 'tut_obstacle_decay',
        title: 'Caminho Bloqueado',
        vignette: 'obstacle_decay',
        body: 'Cada etapa concluída enfraquece a barreira de pedra do cenário até liberar a passagem!'
      }
    ],
    FASE2_OPAL: [
      {
        id: 'tut_fire_opal',
        title: 'Opala de Fogo',
        vignette: 'fire_opal',
        body: 'Ao aproximar a Opala de Fogo de um cristal, ambos tremem e subtraem 1 bolinha por vez. Afaste para parar!'
      }
    ],
    FASE3_ROSE_AND_AURA: [
      {
        id: 'tut_rose_quartz',
        title: 'Quartzo Rosa',
        vignette: 'rose_quartz',
        body: 'Soma igual ao Quartzo Branco, mas cristais de cores diferentes não podem se fundir!'
      }
    ],
    FASE3_EQUATION_AURA: [
      {
        id: 'tut_aura_equation',
        title: 'Equação Cristalina',
        vignette: 'aura_equation',
        body: 'Arraste cristais até a Equação Cristalina para adicioná-los, ou toque nela para expandir e organizar seu interior!'
      }
    ]
  };

  const TruePixelEngine = {
    W,
    H,
    SPRITE_FPS,
    SIM_HZ,
    BAYER,
    bay,
    mulberry,
    c32,
    mk,
    fromMap,
    silhouette,
    mirrorCanvas,
    P1,
    drawRing,
    drawStar,
    measurePixelText,
    drawPixelChar,
    drawPixelText,
    drawPixelTextCentered,
    drawParchmentBox,
    SpriteBank,
    ActorAnimator,
    IrisTransition,
    DialogueBox,
    TutorialModal,
    GameHUD,
    StandardTutorialCards
  };

  global.TruePixelEngine = TruePixelEngine;
})(typeof window !== 'undefined' ? window : globalThis);
