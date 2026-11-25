#!/usr/bin/env node
/**
 * Renders:
 *  - 7 surgical transparent RGBA kinetic overlays (L01..L07) in teaser-silksong-style/overlays/
 *  - 2 transparent RGBA biome world panels (P01..P02) using real assets/story/interface-extra/paineis-mundos.png
 *  - 1 full-screen 1920x1080 Official Credits Card (cards/card-creditos-oficiais.png)
 *    using 100% authentic game assets (menu-aprovado.png, uneb-logo.png, peterson-lobato.jpg,
 *    Fredoka-Bold.ttf, Fredoka-SemiBold.ttf) + Montserrat 900.
 *
 * ZERO AI-generated imagery. Modifies nothing outside teaser-silksong-style/.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const overlaysDir = join(__dirname, 'overlays');
const cardsDir = join(__dirname, 'cards');
await mkdir(overlaysDir, { recursive: true });
await mkdir(cardsDir, { recursive: true });

function findBrowserExecutable() {
  const candidates = [
    process.env.PLAYTEST_BROWSER,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);
  return candidates.find(p => existsSync(p)) || null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.css': 'text/css; charset=utf-8'
};

function startStaticServer(port) {
  const server = http.createServer(async (req, res) => {
    const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (reqPath === '/shell.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buildShellHTML());
      return;
    }
    const rel = normalize(reqPath).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
    const filePath = join(root, rel);
    if (!filePath.startsWith(root) || !existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    try {
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(500);
      res.end('Read error');
    }
  });
  return new Promise(res => server.listen(port, '127.0.0.1', () => res(server)));
}

const LETREIROS = [
  {
    file: 'L01-mundos.png',
    mode: 'lower',
    bottomPx: 36,
    scrimHeight: 210,
    main: '4 MUNDOS. UM SANTUÁRIO.',
    gradTop: '#ffffff',
    gradMid: '#9ef0ff',
    gradBot: '#ffd35a',
    strokeColor: '#09061c',
    glowColor: 'rgba(122, 234, 255, 0.78)',
    mainSize: 102,
    dividerColors: ['#5bf4ff', '#ffd35a']
  },
  {
    file: 'L02-visual.png',
    mode: 'lower',
    bottomPx: 28,
    scrimHeight: 195,
    main: 'MATEMÁTICA 100% VISUAL',
    gradTop: '#ffffff',
    gradMid: '#f5d0fe',
    gradBot: '#7aeaff',
    strokeColor: '#0e0621',
    glowColor: 'rgba(232, 121, 249, 0.72)',
    mainSize: 98,
    dividerColors: ['#e879f9', '#7aeaff']
  },
  {
    file: 'L03-poder.png',
    mode: 'lower',
    bottomPx: 28,
    scrimHeight: 195,
    main: 'CADA GEMA. UM NOVO PODER.',
    gradTop: '#ffffff',
    gradMid: '#bbf7d0',
    gradBot: '#34d399',
    strokeColor: '#041a10',
    glowColor: 'rgba(52, 211, 153, 0.78)',
    mainSize: 96,
    dividerColors: ['#34d399', '#ffd35a']
  },
  {
    file: 'L04-ritmo.png',
    mode: 'upper',
    topPx: 118,
    main: 'NO RITMO DA MÚSICA',
    gradTop: '#ffffff',
    gradMid: '#ddd6fe',
    gradBot: '#7aeaff',
    strokeColor: '#09061c',
    glowColor: 'rgba(139, 92, 246, 0.80)',
    mainSize: 98,
    dividerColors: ['#a78bfa', '#7aeaff']
  },
  {
    file: 'L05-fracoes.png',
    mode: 'lower',
    bottomPx: 22,
    scrimHeight: 185,
    main: 'DOMINE AS FRAÇÕES',
    gradTop: '#ffffff',
    gradMid: '#cffafe',
    gradBot: '#22d3ee',
    strokeColor: '#051926',
    glowColor: 'rgba(34, 211, 238, 0.78)',
    mainSize: 98,
    dividerColors: ['#22d3ee', '#a5f3fc']
  },
  {
    file: 'L06-sinfonia.png',
    mode: 'lower',
    bottomPx: 26,
    scrimHeight: 195,
    main: 'VELOCIDADE. LÓGICA. SINFONIA.',
    gradTop: '#ffffff',
    gradMid: '#fef08a',
    gradBot: '#f59e0b',
    strokeColor: '#230d04',
    glowColor: 'rgba(245, 158, 11, 0.80)',
    mainSize: 96,
    dividerColors: ['#f59e0b', '#fb7185']
  },
  {
    file: 'L07-reveal-monumental.png',
    mode: 'lower',
    bottomPx: 32,
    scrimHeight: 270,
    main: 'CRYSTAL MATH MANIA',
    gradTop: '#ffffff',
    gradMid: '#9ef0ff',
    gradBot: '#ffd35a',
    strokeColor: '#09061c',
    glowColor: 'rgba(122, 234, 255, 0.85)',
    mainSize: 104,
    sub: '4 BIOMAS  ◆  21 FASES  ◆  TRUE PIXEL ART  ◆  ACESSÍVEL A TODOS',
    subColor: '#ffffff',
    subSize: 36,
    subSpacing: 4,
    dividerColors: ['#5bf4ff', '#ffd35a']
  }
];

const PANELS = [
  {
    file: 'P01-painel-floresta.png',
    world: 1,
    bgPos: '100% 0%',
    title: 'Floresta Florescente',
    stars: '★ ★ ★',
    caption: 'Mundo 2 ◆ Poder da Esmeralda',
    titleTop: '14.5%',
    titleLeft: '17%',
    titleWidth: '66%',
    titleSize: 30,
    starsTop: '33%',
    captionTop: '55%',
    btnTop: '68%',
    beginBg: 'linear-gradient(180deg,#22c55e 0%,#15803d 50%,#14532d 100%)',
    beginBorder: '#86efac',
    beginShadow: '#052e16',
    backBg: 'linear-gradient(180deg,#78350f 0%,#451a03 100%)',
    backBorder: '#b45309',
    backShadow: '#1e0900',
    glow: 'rgba(74, 222, 128, 0.65)'
  },
  {
    file: 'P02-painel-caatinga.png',
    world: 3,
    bgPos: '100% 100%',
    title: 'A Caatinga',
    stars: '★ ★ ★',
    caption: 'Mundo 4 ◆ Desafio das Areias',
    titleTop: '10%',
    titleLeft: '22%',
    titleWidth: '56%',
    titleSize: 28,
    starsTop: '30%',
    captionTop: '51%',
    btnTop: '62.5%',
    beginBg: 'linear-gradient(180deg,#f59e0b 0%,#d97706 50%,#b45309 100%)',
    beginBorder: '#fde047',
    beginShadow: '#451a03',
    backBg: 'linear-gradient(180deg,#9a3412 0%,#431407 100%)',
    backBorder: '#ea580c',
    backShadow: '#270b04',
    glow: 'rgba(251, 191, 36, 0.65)'
  }
];

function buildShellHTML() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&display=swap" rel="stylesheet">
<style id="base-style">
  @font-face {
    font-family: 'GameFredoka';
    src: url('/assets/fonts/Fredoka-Bold.ttf') format('truetype');
    font-weight: 700;
  }
  @font-face {
    font-family: 'GameFredokaSemi';
    src: url('/assets/fonts/Fredoka-SemiBold.ttf') format('truetype');
    font-weight: 600;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: transparent !important;
  }
  .stage {
    position: relative;
    width: 1920px;
    height: 1080px;
    background: transparent;
  }
  .scrim-lower {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    background: linear-gradient(to top, rgba(6, 5, 20, 0.96) 0%, rgba(6, 5, 20, 0.84) 50%, rgba(6, 5, 20, 0.44) 76%, rgba(6, 5, 20, 0) 100%);
  }
  .scrim-upper {
    position: absolute;
    inset: 0;
  }
  .plate {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 60px;
    gap: 8px;
  }
  .twrap {
    position: relative;
    display: inline-block;
    line-height: 1.04;
    white-space: nowrap;
  }
  .twrap.main {
    font-family: 'Montserrat', 'GameFredoka', 'Arial Black', sans-serif;
    font-weight: 900;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .twrap.sub {
    font-family: 'GameFredoka', 'Montserrat', 'Segoe UI', sans-serif;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .twrap.sub .tstroke {
    color: #09061c;
    -webkit-text-stroke: 8px #09061c;
    text-shadow: 0 5px 14px rgba(0, 0, 0, 0.95);
  }
  .twrap.sub .tfill { position: relative; }
  .twrap .tstroke {
    position: absolute;
    left: 0; right: 0; top: 0;
    user-select: none;
    paint-order: stroke fill;
  }
  .divider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    margin-top: 6px;
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.95));
  }
  .bar-l, .bar-r { width: 240px; height: 4px; }
  .gem {
    width: 16px; height: 16px;
    transform: rotate(45deg);
    border: 2px solid #09061c;
  }
</style>
<style id="plate-style"></style>
</head>
<body>
  <div class="stage" id="app"></div>
  <div style="position:absolute;left:-9999px;font-family:'Montserrat';font-weight:900;">ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÂÃÉÊÍÓÔÕÚÇ?!.%0123456789</div>
  <div style="position:absolute;left:-9999px;font-family:'GameFredoka';font-weight:700;">ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÂÃÉÊÍÓÔÕÚÇ◆★✦❖•0123456789</div>
  <div style="position:absolute;left:-9999px;font-family:'GameFredokaSemi';font-weight:600;">ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÂÃÉÊÍÓÔÕÚÇ•0123456789</div>
</body>
</html>`;
}

function buildPlateFragment(p) {
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const [dLeft, dRight] = p.dividerColors || ['#5bf4ff', '#ffd35a'];

  const layeredText = (text, cls, sizePx, extraStyle = '') => `
    <div class="twrap ${cls}" style="font-size:${sizePx}px;${extraStyle}">
      <span class="tstroke" aria-hidden="true">${esc(text)}</span>
      <span class="tfill">${esc(text)}</span>
    </div>`;

  let scrimHtml = '';
  let containerStyle = '';
  if (p.mode === 'upper') {
    scrimHtml = `<div class="scrim-upper" style="background:radial-gradient(ellipse 68% 20% at 50% ${(p.topPx || 118) + 65}px, rgba(8, 10, 34, 0.78) 0%, rgba(8, 10, 34, 0.42) 48%, rgba(8, 10, 34, 0) 78%);"></div>`;
    containerStyle = `top:${p.topPx || 118}px;left:0;right:0;`;
  } else {
    const sh = p.scrimHeight || 200;
    scrimHtml = `<div class="scrim-lower" style="height:${sh}px;"></div>`;
    containerStyle = `bottom:${p.bottomPx ?? 28}px;left:0;right:0;`;
  }

  const css = `
    .twrap.main { filter: drop-shadow(0 0 24px ${p.glowColor}); }
    .twrap.main .tstroke {
      color: ${p.strokeColor};
      -webkit-text-stroke: 8px ${p.strokeColor};
      text-shadow:
        0 -5px 0 ${p.strokeColor}, 0 5px 0 ${p.strokeColor},
        -5px 0 0 ${p.strokeColor}, 5px 0 0 ${p.strokeColor},
        -4px -4px 0 ${p.strokeColor}, 4px -4px 0 ${p.strokeColor},
        -4px 4px 0 ${p.strokeColor}, 4px 4px 0 ${p.strokeColor},
        0 11px 24px rgba(0, 0, 0, 0.96);
    }
    .twrap.main .tfill {
      position: relative; display: inline-block;
      background: linear-gradient(180deg, ${p.gradTop} 0%, ${p.gradMid} 54%, ${p.gradBot} 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .twrap.sub .tfill { color: ${p.subColor || '#ffffff'}; text-shadow: 0 0 16px ${p.glowColor}; }
    .bar-l { background: linear-gradient(90deg, transparent 0%, ${dLeft} 100%); }
    .bar-r { background: linear-gradient(90deg, ${dRight} 0%, transparent 100%); }
    .gem { background: linear-gradient(135deg, #ffffff 0%, ${dLeft} 50%, ${dRight} 100%); box-shadow: 0 0 14px ${dLeft}; }
  `;

  const subExtra = p.subSpacing ? `letter-spacing:${p.subSpacing}px;` : '';
  const html = `
    ${scrimHtml}
    <div class="plate" style="${containerStyle}">
      ${layeredText(p.main, 'main', p.mainSize || 98)}
      <div class="divider">
        <div class="bar-l"></div>
        <div class="gem"></div>
        <div class="bar-r"></div>
      </div>
      ${p.sub ? layeredText(p.sub, 'sub', p.subSize || 36, subExtra) : ''}
    </div>
  `;
  return { css, html };
}

function buildPanelFragment(p) {
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const css = `
    .panel-halo {
      position: absolute;
      right: 36px;
      top: 50%;
      width: 840px;
      height: 600px;
      transform: translateY(-50%);
      background: radial-gradient(ellipse at center, rgba(7, 5, 22, 0.72) 0%, rgba(7, 5, 22, 0.35) 54%, rgba(7, 5, 22, 0) 76%);
      pointer-events: none;
    }
    .world-panel {
      position: absolute;
      right: 96px;
      top: 50%;
      width: 720px;
      height: 480px;
      transform: translateY(-50%);
      background: transparent url('/assets/story/interface-extra/paineis-mundos.png') ${p.bgPos}/200% 200% no-repeat;
      image-rendering: pixelated;
      filter: drop-shadow(0 0 18px ${p.glow}) drop-shadow(0 14px 32px rgba(0, 0, 0, 0.85));
      font-family: 'GameFredoka', 'Montserrat', sans-serif;
      color: #ffffff;
    }
    .wp-title {
      position: absolute;
      top: ${p.titleTop};
      left: ${p.titleLeft};
      width: ${p.titleWidth};
      text-align: center;
      font-size: ${p.titleSize}px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 0 #000;
    }
    .wp-stars {
      position: absolute;
      top: ${p.starsTop};
      left: 15%;
      width: 70%;
      height: 24%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 62px;
      color: #ffe887;
      text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 0 #000;
      letter-spacing: 8px;
    }
    .wp-caption {
      position: absolute;
      top: ${p.captionTop};
      left: 14%;
      width: 72%;
      text-align: center;
      font-family: 'GameFredokaSemi', 'Montserrat', sans-serif;
      font-size: 21px;
      color: #92e8ff;
      text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 0 #000;
    }
    .wp-btn {
      position: absolute;
      top: ${p.btnTop};
      width: 28%;
      height: 13.5%;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 0 #000;
    }
    .wp-begin {
      left: 19%;
      background: ${p.beginBg};
      border: 3px solid ${p.beginBorder};
      box-shadow: inset 0 2px 0 rgba(255,255,255,0.6), 0 4px 0 ${p.beginShadow}, 0 6px 12px rgba(0,0,0,0.6);
    }
    .wp-back {
      left: 53%;
      background: ${p.backBg};
      border: 3px solid ${p.backBorder};
      box-shadow: inset 0 2px 0 rgba(255,255,255,0.35), 0 4px 0 ${p.backShadow}, 0 6px 12px rgba(0,0,0,0.6);
    }
  `;
  const html = `
    <div class="panel-halo"></div>
    <div class="world-panel">
      <div class="wp-title">${esc(p.title)}</div>
      <div class="wp-stars">${esc(p.stars)}</div>
      <div class="wp-caption">${esc(p.caption)}</div>
      <div class="wp-btn wp-begin">Começar</div>
      <div class="wp-btn wp-back">Voltar</div>
    </div>
    <img src="/assets/story/interface-extra/paineis-mundos.png" style="position:absolute;left:-9999px;width:10px;height:10px;">
  `;
  return { css, html };
}

function buildCreditsFragment() {
  const css = `
    .credits-canvas {
      position: relative;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      background: #060412;
      font-family: 'GameFredoka', 'Montserrat', sans-serif;
      color: #f3f8ff;
    }
    .credits-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      image-rendering: pixelated;
    }
    .credits-scrim {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 25%, rgba(16, 12, 42, 0.80) 0%, rgba(6, 4, 18, 0.90) 68%, rgba(4, 2, 12, 0.95) 100%);
    }
    .credits-card {
      position: absolute;
      left: 90px;
      top: 58px;
      width: 1740px;
      height: 964px;
      border: 3px solid #68d8ff;
      border-radius: 24px;
      background: radial-gradient(circle at 50% 0%, rgba(32, 23, 66, 0.94) 0%, rgba(14, 9, 34, 0.96) 65%, rgba(8, 5, 22, 0.98) 100%);
      box-shadow:
        0 0 0 4px rgba(124, 77, 255, 0.36),
        0 24px 64px rgba(0, 0, 0, 0.92),
        inset 0 0 42px rgba(64, 196, 255, 0.22);
      padding: 34px 48px 30px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .prism-border {
      position: absolute;
      inset: 0;
      border-radius: 22px;
      pointer-events: none;
      background: linear-gradient(135deg, rgba(104, 216, 255, 0.18), transparent 32%, transparent 68%, rgba(224, 64, 251, 0.18));
    }
    .c-header {
      text-align: center;
      border-bottom: 2px solid rgba(104, 216, 255, 0.34);
      padding-bottom: 18px;
    }
    .c-gems {
      display: flex;
      justify-content: center;
      gap: 22px;
      font-size: 28px;
      margin-bottom: 6px;
    }
    .gem-cyan { color: #40c4ff; text-shadow: 0 0 14px #40c4ff; }
    .gem-emerald { color: #69f0ae; text-shadow: 0 0 14px #69f0ae; }
    .gem-paraiba { color: #18ffff; text-shadow: 0 0 14px #18ffff; }
    .gem-opal { color: #ffab40; text-shadow: 0 0 14px #ffab40; }
    .c-eyebrow {
      display: block;
      font-size: 22px;
      letter-spacing: 6px;
      color: #80d8ff;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .c-title {
      font-family: 'Montserrat', 'GameFredoka', sans-serif;
      font-weight: 900;
      font-size: 56px;
      letter-spacing: 1px;
      background: linear-gradient(90deg, #ffffff 0%, #80d8ff 36%, #ea80fc 70%, #ffd54f 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      filter: drop-shadow(0 3px 16px rgba(64, 196, 255, 0.38));
    }
    .c-subtitle {
      margin-top: 4px;
      font-size: 32px;
      color: #ffd54f;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .c-main-grid {
      display: grid;
      grid-template-columns: 0.94fr 1.16fr;
      gap: 28px;
      align-items: stretch;
    }
    .left-stack {
      display: flex;
      flex-direction: column;
      gap: 22px;
      justify-content: space-between;
    }
    .c-block {
      background: linear-gradient(180deg, rgba(35, 26, 68, 0.82), rgba(16, 11, 36, 0.92));
      border: 2px solid rgba(128, 216, 255, 0.38);
      border-radius: 18px;
      padding: 20px 26px;
      box-shadow: inset 0 0 18px rgba(104, 216, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.45);
    }
    .block-title {
      font-size: 21px;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #80d8ff;
      text-align: center;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .uneb-row {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .uneb-logo-box {
      width: 96px;
      height: 112px;
      background: #ffffff;
      border-radius: 12px;
      border: 3px solid #80d8ff;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 0 18px rgba(128, 216, 255, 0.35);
    }
    .uneb-logo-box img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .uneb-meta strong {
      display: block;
      font-size: 27px;
      line-height: 1.18;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .uneb-meta span {
      display: block;
      font-family: 'GameFredokaSemi', sans-serif;
      font-size: 20px;
      color: #ffd54f;
    }
    .advisor-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 22px;
      padding-left: 8px;
    }
    .avatar-ring {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      padding: 4px;
      background: linear-gradient(135deg, #40c4ff, #e040fb, #ffd54f);
      box-shadow: 0 0 22px rgba(64, 196, 255, 0.50);
      flex-shrink: 0;
    }
    .avatar-ring img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      display: block;
    }
    .advisor-meta strong {
      display: block;
      font-size: 32px;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .advisor-meta span {
      display: block;
      font-family: 'GameFredokaSemi', sans-serif;
      font-size: 22px;
      color: #ffd54f;
    }
    .team-block {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .team-grid {
      list-style: none;
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .team-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 20px;
      border-radius: 13px;
      background: rgba(11, 8, 25, 0.78);
      border: 1.5px solid rgba(128, 216, 255, 0.30);
    }
    .team-item .star {
      font-size: 26px;
      flex-shrink: 0;
    }
    .team-item strong {
      display: block;
      font-size: 25px;
      color: #f5f9ff;
      line-height: 1.15;
    }
    .team-item small {
      display: block;
      font-family: 'GameFredokaSemi', sans-serif;
      font-size: 19px;
      color: #ffd54f;
      margin-top: 2px;
    }
    .tools-block {
      padding: 16px 26px 18px;
    }
    .tools-badges {
      display: flex;
      flex-wrap: nowrap;
      justify-content: center;
      gap: 14px;
    }
    .tool-badge {
      padding: 9px 22px;
      border-radius: 999px;
      font-size: 21px;
      font-weight: 700;
      color: #e0f7fa;
      background: linear-gradient(135deg, rgba(0, 176, 255, 0.28), rgba(124, 77, 255, 0.38));
      border: 2px solid rgba(128, 216, 255, 0.56);
      box-shadow: 0 0 12px rgba(64, 196, 255, 0.25);
      white-space: nowrap;
    }
  `;

  const html = `
    <div class="credits-canvas">
      <img class="credits-bg" src="/assets/story/interface/menu-aprovado.png" alt="">
      <div class="credits-scrim"></div>
      <div class="credits-card">
        <div class="prism-border"></div>
        <header class="c-header">
          <div class="c-gems">
            <span class="gem-cyan">❖</span>
            <span class="gem-emerald">❖</span>
            <span class="gem-paraiba">❖</span>
            <span class="gem-opal">❖</span>
          </div>
          <span class="c-eyebrow">✦ CRÉDITOS OFICIAIS DO JOGO ✦</span>
          <h1 class="c-title">Crystal Math Mania — Sinfonia dos Cristais</h1>
        </header>

        <div class="c-main-grid">
          <div class="left-stack">
            <section class="c-block">
              <h2 class="block-title"><span>◆</span> Instituição <span>◆</span></h2>
              <div class="uneb-row">
                <div class="uneb-logo-box">
                  <img src="/assets/credits/uneb-logo.png" alt="Brasão UNEB">
                </div>
                <div class="uneb-meta">
                  <strong>Universidade do Estado da Bahia (UNEB)</strong>
                  <span>Curso de Graduação em Engenharia de Software</span>
                </div>
              </div>
            </section>

            <section class="c-block">
              <h2 class="block-title"><span>◆</span> Orientador e Professor <span>◆</span></h2>
              <div class="advisor-row">
                <div class="avatar-ring">
                  <img src="/assets/credits/peterson-lobato.jpg" alt="Peterson Lobato">
                </div>
                <div class="advisor-meta">
                  <strong>Peterson Lobato</strong>
                  <span>Orientador e Professor</span>
                </div>
              </div>
            </section>
          </div>

          <section class="c-block team-block">
            <h2 class="block-title"><span>◆</span> Integrantes da Equipe <span>◆</span></h2>
            <ul class="team-grid">
              <li class="team-item">
                <span class="star gem-cyan">✦</span>
                <div><strong>Heitor Givercy Nascimento Macedo</strong><small>Gestor</small></div>
              </li>
              <li class="team-item">
                <span class="star gem-emerald">✦</span>
                <div><strong>Eyder Sanshes Brandão</strong><small>Programador</small></div>
              </li>
              <li class="team-item">
                <span class="star gem-paraiba">✦</span>
                <div><strong>Ítalo José Bomfim da Rocha</strong><small>Programador</small></div>
              </li>
              <li class="team-item">
                <span class="star gem-opal">✦</span>
                <div><strong>Italo Marcus de Sant'Ana Freitas</strong><small>Designer</small></div>
              </li>
            </ul>
          </section>
        </div>

        <section class="c-block tools-block">
          <h2 class="block-title" style="margin-bottom:12px;"><span>◆</span> Ferramentas Usadas <span>◆</span></h2>
          <div class="tools-badges">
            <span class="tool-badge">VS Code</span>
            <span class="tool-badge">Antigravity IDE</span>
            <span class="tool-badge">Codex IDE</span>
            <span class="tool-badge">PixelLabAi</span>
            <span class="tool-badge">Google Sala de Aula</span>
            <span class="tool-badge">Trello</span>
            <span class="tool-badge">Figma</span>
          </div>
        </section>
      </div>
    </div>
  `;
  return { css, html };
}

async function main() {
  const browserPath = findBrowserExecutable();
  if (!browserPath) throw new Error('Edge/Chrome not found');

  const port = 8199;
  const server = await startStaticServer(port);
  const userDataDir = join(__dirname, `.tmp-overlays-${process.pid}`);
  await mkdir(userDataDir, { recursive: true });
  const cdpPort = 9261;

  const browserProc = spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1920,1080',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  try {
    let wsUrl = null;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
        const pages = await res.json();
        const pg = pages.find(p => p.type === 'page');
        if (pg?.webSocketDebuggerUrl) { wsUrl = pg.webSocketDebuggerUrl; break; }
      } catch {}
      await new Promise(r => setTimeout(r, 150));
    }
    if (!wsUrl) throw new Error('CDP endpoint unavailable');

    ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let msgId = 1;
    const pending = new Map();
    let onLoadResolve = null;
    ws.onmessage = evt => {
      const data = JSON.parse(String(evt.data));
      if (data.method === 'Page.loadEventFired' && onLoadResolve) {
        const r = onLoadResolve;
        onLoadResolve = null;
        r();
      }
      if (data.id && pending.has(data.id)) {
        const { resolve: ok, reject: err } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) err(new Error(JSON.stringify(data.error)));
        else ok(data.result);
      }
    };
    const send = (method, params = {}) => new Promise((res, rej) => {
      const id = msgId++;
      pending.set(id, { resolve: res, reject: rej });
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
    });
    await send('Emulation.setDefaultBackgroundColorOverride', {
      color: { r: 0, g: 0, b: 0, a: 0 }
    });

    const loadDone = new Promise(r => { onLoadResolve = r; });
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/shell.html` });
    await Promise.race([loadDone, new Promise(r => setTimeout(r, 5000))]);

    await send('Runtime.evaluate', {
      expression: `(async () => {
        for (let i = 0; i < 35; i++) {
          await document.fonts.ready;
          const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);
          if (loaded.some(f => f.includes('GameFredoka')) && (loaded.some(f => f.includes('Montserrat')) || i > 20)) {
            return [...new Set(loaded)];
          }
          await new Promise(r => setTimeout(r, 200));
        }
        return [...document.fonts].map(f => f.family + ':' + f.status);
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    async function renderTarget(outFile, css, html, omitBg) {
      const status = await send('Runtime.evaluate', {
        expression: `(async () => {
          document.getElementById('plate-style').textContent = ${JSON.stringify(css)};
          document.getElementById('app').innerHTML = ${JSON.stringify(html)};
          for (let i = 0; i < 40; i++) {
            const imgs = [...document.querySelectorAll('img')];
            if (imgs.every(im => im.complete && im.naturalWidth > 0)) break;
            await new Promise(r => setTimeout(r, 100));
          }
          await document.fonts.ready;
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          return {
            fonts: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ':' + f.weight))],
            imgs: [...document.querySelectorAll('img')].map(im => ({ src: im.getAttribute('src'), w: im.naturalWidth, h: im.naturalHeight }))
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });
      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        omitBackground: omitBg,
        fromSurface: true
      });
      await writeFile(outFile, Buffer.from(shot.data, 'base64'));
      console.log(`Rendered ${outFile} -> ${JSON.stringify(status.result?.value)}`);
    }

    for (const p of LETREIROS) {
      const { css, html } = buildPlateFragment(p);
      await renderTarget(join(overlaysDir, p.file), css, html, true);
    }

    for (const p of PANELS) {
      const { css, html } = buildPanelFragment(p);
      await renderTarget(join(overlaysDir, p.file), css, html, true);
    }

    const credits = buildCreditsFragment();
    await renderTarget(join(cardsDir, 'card-creditos-oficiais.png'), credits.css, credits.html, false);
  } finally {
    try { ws?.close(); } catch {}
    browserProc.kill();
    server.close();
    await new Promise(r => setTimeout(r, 250));
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
