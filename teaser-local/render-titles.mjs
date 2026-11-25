#!/usr/bin/env node
/**
 * Renders 12 high-impact 1920x1080 transparent RGBA PNG title overlays
 * into teaser-local/titles/ using headless Edge via CDP.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const titlesDir = join(__dirname, 'titles');
await mkdir(titlesDir, { recursive: true });

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

const PLATES = [
  {
    file: 'T01-hook.png',
    mode: 'center',
    kicker: 'E SE A MATEMÁTICA',
    kickerColor: '#d9fbff',
    kickerSize: 62,
    main: 'FOSSE UMA SINFONIA?',
    gradTop: '#ffffff',
    gradMid: '#9ef0ff',
    gradBot: '#ffd35a',
    strokeColor: '#09061c',
    glowColor: 'rgba(91, 244, 255, 0.72)',
    mainSize: 124,
    dividerColors: ['#5bf4ff', '#f472ff']
  },
  {
    file: 'T02-sem-contas.png',
    mode: 'lower',
    bottomPx: 44,
    main: 'SEM CONTAS. SEM PROVAS.',
    gradTop: '#ffffff',
    gradMid: '#e8fbff',
    gradBot: '#7aeaff',
    strokeColor: '#09061c',
    glowColor: 'rgba(122, 234, 255, 0.65)',
    mainSize: 98,
    sub: 'SÓ TOQUE, LUZ E RITMO',
    subColor: '#ffd35a',
    subSize: 42,
    dividerColors: ['#7aeaff', '#ffd35a']
  },
  {
    file: 'T03-funda.png',
    mode: 'lower',
    bottomPx: 32,
    main: 'FUNDA. EQUILIBRE. ANULE.',
    gradTop: '#ffffff',
    gradMid: '#fce7ff',
    gradBot: '#e879f9',
    strokeColor: '#0e0621',
    glowColor: 'rgba(232, 121, 249, 0.65)',
    mainSize: 96,
    sub: 'MATEMÁTICA 100% VISUAL',
    subColor: '#8ef5ff',
    subSize: 42,
    dividerColors: ['#e879f9', '#8ef5ff']
  },
  {
    file: 'T04-caverna.png',
    mode: 'lower',
    bottomPx: 20,
    scrimHeight: 220,
    kicker: 'MUNDO 1  ◆  DESAFIO MUSICAL',
    kickerColor: '#ffd35a',
    kickerSize: 34,
    main: 'CAVERNA CRISTALINA',
    gradTop: '#ffffff',
    gradMid: '#c4b5fd',
    gradBot: '#7aeaff',
    strokeColor: '#09061c',
    glowColor: 'rgba(139, 92, 246, 0.72)',
    mainSize: 94,
    dividerColors: ['#a78bfa', '#7aeaff']
  },
  {
    file: 'T05-floresta-card.png',
    mode: 'center',
    kicker: 'MUNDO 2',
    kickerColor: '#ffd35a',
    kickerSize: 46,
    main: 'FLORESTA',
    gradTop: '#ffffff',
    gradMid: '#bbf7d0',
    gradBot: '#22c55e',
    strokeColor: '#041b10',
    glowColor: 'rgba(74, 222, 128, 0.78)',
    mainSize: 150,
    sub: 'DESPERTE O PODER DA ESMERALDA',
    subColor: '#f0fdf4',
    subSize: 46,
    dividerColors: ['#4ade80', '#ffd35a']
  },
  {
    file: 'T06-corte.png',
    mode: 'lower',
    bottomPx: 32,
    main: 'CORTE NO RITMO!',
    gradTop: '#ffffff',
    gradMid: '#d1fae5',
    gradBot: '#34d399',
    strokeColor: '#041a10',
    glowColor: 'rgba(52, 211, 153, 0.72)',
    mainSize: 112,
    sub: 'COMBOS CRISTALINOS EM 60 FPS',
    subColor: '#ffd35a',
    subSize: 42,
    dividerColors: ['#34d399', '#ffd35a']
  },
  {
    file: 'T07A-fracoes.png',
    mode: 'lower',
    bottomPx: 32,
    main: 'FRAÇÕES QUE GANHAM VIDA',
    gradTop: '#ffffff',
    gradMid: '#cffafe',
    gradBot: '#22d3ee',
    strokeColor: '#051926',
    glowColor: 'rgba(34, 211, 238, 0.72)',
    mainSize: 94,
    sub: 'DIVIDA, CONECTE E HARMONIZE',
    subColor: '#fde68a',
    subSize: 40,
    dividerColors: ['#22d3ee', '#a5f3fc']
  },
  {
    file: 'T07B-rio.png',
    mode: 'lower',
    bottomPx: 20,
    scrimHeight: 210,
    kicker: 'MUNDO 3  ◆  MELODIA DAS ÁGUAS',
    kickerColor: '#ffd35a',
    kickerSize: 34,
    main: 'RIO ENCANTADO',
    gradTop: '#ffffff',
    gradMid: '#a5f3fc',
    gradBot: '#06b6d4',
    strokeColor: '#051926',
    glowColor: 'rgba(56, 189, 248, 0.75)',
    mainSize: 100,
    dividerColors: ['#38bdf8', '#ffd35a']
  },
  {
    file: 'T08-caatinga-card.png',
    mode: 'center',
    kicker: 'MUNDO 4',
    kickerColor: '#ffe066',
    kickerSize: 46,
    main: 'CAATINGA',
    gradTop: '#ffffff',
    gradMid: '#fde047',
    gradBot: '#f97316',
    strokeColor: '#230b04',
    glowColor: 'rgba(251, 146, 60, 0.80)',
    mainSize: 150,
    sub: 'O BAIÃO DA OPALA DE FOGO',
    subColor: '#fff3c4',
    subSize: 46,
    dividerColors: ['#fb923c', '#ffd35a']
  },
  {
    file: 'T09-acelere.png',
    mode: 'lower',
    bottomPx: 32,
    main: 'ACELERE O DESAFIO!',
    gradTop: '#ffffff',
    gradMid: '#fef08a',
    gradBot: '#f59e0b',
    strokeColor: '#230d04',
    glowColor: 'rgba(245, 158, 11, 0.75)',
    mainSize: 108,
    sub: 'CIRCUITOS ELÉTRICOS E RITMO NORDESTINO',
    subColor: '#ffedd5',
    subSize: 39,
    dividerColors: ['#f59e0b', '#fb7185']
  },
  {
    file: 'T10-gemas-card.png',
    mode: 'center',
    softScrim: true,
    main: '4 GEMAS PRIMORDIAIS',
    gradTop: '#ffffff',
    gradMid: '#a5f3fc',
    gradBot: '#ffd35a',
    strokeColor: '#08051a',
    glowColor: 'rgba(139, 92, 246, 0.84)',
    mainSize: 110,
    sub: '4 BIOMAS BRASILEIROS  ◆  21 FASES',
    subColor: '#9ef0ff',
    subSize: 45,
    dividerColors: ['#5bf4ff', '#ffd35a']
  },
  {
    file: 'T11-assinatura.png',
    mode: 'upper',
    topPx: 185,
    main: 'SINFONIA DOS CRISTAIS',
    gradTop: '#ffffff',
    gradMid: '#9ef0ff',
    gradBot: '#ffd35a',
    strokeColor: '#09061c',
    glowColor: 'rgba(122, 234, 255, 0.80)',
    mainSize: 114,
    sub: 'TRUE PIXEL ART  ◆  ACESSÍVEL A TODOS',
    subColor: '#ffffff',
    subSize: 42,
    dividerColors: ['#5bf4ff', '#f472ff']
  }
];

function buildShellHTML() {
  const fontStack = `'Montserrat', 'Arial Black', 'Impact', sans-serif`;
  const subFont = `'Fredoka', 'Montserrat', 'Segoe UI', sans-serif`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Montserrat:wght@800;900&display=swap" rel="stylesheet">
<style id="base-style">
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
  .scrim-center {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 68% 34% at 50% 50%, rgba(7, 5, 22, 0.74) 0%, rgba(7, 5, 22, 0.42) 44%, rgba(7, 5, 22, 0) 76%);
  }
  .scrim-center.soft {
    background: radial-gradient(ellipse 64% 28% at 50% 50%, rgba(7, 5, 22, 0.56) 0%, rgba(7, 5, 22, 0.28) 44%, rgba(7, 5, 22, 0) 74%);
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
    padding: 0 72px;
    gap: 8px;
  }
  .twrap {
    position: relative;
    display: inline-block;
    line-height: 1.04;
    white-space: nowrap;
  }
  .twrap.kicker {
    font-family: ${subFont};
    font-weight: 700;
    letter-spacing: 8px;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .twrap.kicker .tstroke {
    color: #09061c;
    -webkit-text-stroke: 8px #09061c;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.95);
  }
  .twrap.kicker .tfill {
    position: relative;
    text-shadow: 0 0 18px rgba(0, 0, 0, 0.75);
  }
  .twrap.main {
    font-family: ${fontStack};
    font-weight: 900;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .twrap.sub {
    font-family: ${subFont};
    font-weight: 700;
    letter-spacing: 6px;
    text-transform: uppercase;
    margin-top: 2px;
  }
  .twrap.sub .tstroke {
    color: #09061c;
    -webkit-text-stroke: 9px #09061c;
    text-shadow: 0 5px 14px rgba(0, 0, 0, 0.95);
  }
  .twrap.sub .tfill {
    position: relative;
  }
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
  <!-- Pre-trigger Latin glyph download for all needed font weights -->
  <div style="position:absolute;left:-9999px;font-family:'Montserrat';font-weight:900;">ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÂÃÉÊÍÓÔÕÚÇ?!.0123456789</div>
  <div style="position:absolute;left:-9999px;font-family:'Montserrat';font-weight:800;">ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÂÃÉÊÍÓÔÕÚÇ?!.0123456789</div>
  <div style="position:absolute;left:-9999px;font-family:'Fredoka';font-weight:700;">ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÂÃÉÊÍÓÔÕÚÇ◆•0123456789</div>
</body>
</html>`;
}

function buildPlateFragment(p) {
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const [dLeft, dRight] = p.dividerColors || ['#5bf4ff', '#ffd35a'];

  const layeredText = (text, cls, sizePx) => `
    <div class="twrap ${cls}" style="font-size:${sizePx}px;">
      <span class="tstroke" aria-hidden="true">${esc(text)}</span>
      <span class="tfill">${esc(text)}</span>
    </div>`;

  let scrimHtml = '';
  let containerStyle = '';
  if (p.mode === 'center') {
    scrimHtml = `<div class="scrim-center${p.softScrim ? ' soft' : ''}"></div>`;
    containerStyle = `top:50%;left:0;right:0;transform:translateY(-50%);`;
  } else if (p.mode === 'upper') {
    scrimHtml = `<div class="scrim-upper" style="background:radial-gradient(ellipse 62% 24% at 50% ${(p.topPx || 185) + 95}px, rgba(8, 10, 34, 0.76) 0%, rgba(8, 10, 34, 0.42) 46%, rgba(8, 10, 34, 0) 78%);"></div>`;
    containerStyle = `top:${p.topPx || 185}px;left:0;right:0;`;
  } else {
    const sh = p.scrimHeight || 255;
    scrimHtml = `<div class="scrim-lower" style="height:${sh}px;"></div>`;
    containerStyle = `bottom:${p.bottomPx ?? 32}px;left:0;right:0;`;
  }

  const css = `
    .twrap.kicker .tfill { color: ${p.kickerColor || '#ffd35a'}; }
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

  const html = `
    ${scrimHtml}
    <div class="plate" style="${containerStyle}">
      ${p.kicker ? layeredText(p.kicker, 'kicker', p.kickerSize || 42) : ''}
      ${layeredText(p.main, 'main', p.mainSize || 110)}
      <div class="divider">
        <div class="bar-l"></div>
        <div class="gem"></div>
        <div class="bar-r"></div>
      </div>
      ${p.sub ? layeredText(p.sub, 'sub', p.subSize || 42) : ''}
    </div>
  `;
  return { css, html };
}

async function main() {
  const browserPath = findBrowserExecutable();
  if (!browserPath) throw new Error('Edge/Chrome not found');

  const userDataDir = join(__dirname, `.tmp-titles-${process.pid}`);
  await mkdir(userDataDir, { recursive: true });
  const cdpPort = 9255;

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
        if (pg?.webSocketDebuggerUrl) {
          wsUrl = pg.webSocketDebuggerUrl;
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 150));
    }
    if (!wsUrl) throw new Error('CDP endpoint unavailable');

    ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    let msgId = 1;
    const pending = new Map();
    ws.onmessage = evt => {
      const data = JSON.parse(String(evt.data));
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
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false
    });
    // Transparent page background!
    await send('Emulation.setDefaultBackgroundColorOverride', {
      color: { r: 0, g: 0, b: 0, a: 0 }
    });

    const { frameTree } = await send('Page.getFrameTree');
    const frameId = frameTree.frame.id;

    // Load shell once and warm up Google Fonts in memory for all 12 plates
    await send('Page.setDocumentContent', { frameId, html: buildShellHTML() });
    await send('Runtime.evaluate', {
      expression: `(async () => {
        for (let i = 0; i < 40; i++) {
          await document.fonts.ready;
          const loaded = [...document.fonts].filter(f => f.status === 'loaded');
          if (loaded.some(f => f.family.includes('Montserrat')) && loaded.some(f => f.family.includes('Fredoka'))) {
            return loaded.map(f => f.family + ':' + f.weight);
          }
          await new Promise(r => setTimeout(r, 200));
        }
        return [...document.fonts].map(f => f.family + ':' + f.weight + '(' + f.status + ')');
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    for (const plate of PLATES) {
      const { css, html } = buildPlateFragment(plate);
      const fontStatus = await send('Runtime.evaluate', {
        expression: `(async () => {
          document.getElementById('plate-style').textContent = ${JSON.stringify(css)};
          document.getElementById('app').innerHTML = ${JSON.stringify(html)};
          await document.fonts.ready;
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const loaded = [];
          for (const f of document.fonts) {
            if (f.status === 'loaded') loaded.push(f.family + ':' + f.weight);
          }
          const el = document.querySelector('.plate');
          const r = el ? el.getBoundingClientRect() : null;
          return {
            loaded: [...new Set(loaded)],
            rect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });
      const val = fontStatus.result?.value || {};
      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        omitBackground: true,
        fromSurface: true
      });
      const outPath = join(titlesDir, plate.file);
      await writeFile(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`${plate.file}: fonts=[${(val.loaded || []).join(', ')}] rect=${JSON.stringify(val.rect)}`);
    }
  } finally {
    try { ws?.close(); } catch {}
    browserProc.kill();
    await new Promise(r => setTimeout(r, 300));
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
