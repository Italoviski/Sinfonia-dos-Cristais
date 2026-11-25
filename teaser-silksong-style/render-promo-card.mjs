#!/usr/bin/env node
/**
 * Renders teaser-silksong-style/card-publicidade-sinfonia-qr.png (1920x1080)
 * using 100% real game assets (ZERO AI images) + verified QR code PNG.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outPath = join(__dirname, 'card-publicidade-sinfonia-qr.png');

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
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&display=swap" rel="stylesheet">
<style>
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
    background: #070518;
    font-family: 'GameFredoka', 'Montserrat', 'Arial Black', sans-serif;
  }
  .canvas {
    position: relative;
    width: 1920px;
    height: 1080px;
    overflow: hidden;
  }
  .bg-art {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated;
  }
  /* Preserve top-left game logo bright; darken lower-left & right for maximum contrast */
  .bg-scrim {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(8, 5, 26, 0.25) 0%, rgba(8, 5, 26, 0.56) 52%, rgba(7, 5, 22, 0.88) 72%, rgba(7, 5, 22, 0.94) 100%),
      linear-gradient(180deg, rgba(7, 5, 22, 0.05) 0%, rgba(7, 5, 22, 0.12) 34%, rgba(7, 5, 22, 0.82) 52%, rgba(7, 5, 22, 0.94) 100%);
  }
  .outer-frame {
    position: absolute;
    inset: 18px;
    border: 2px solid rgba(122, 234, 255, 0.42);
    box-shadow: inset 0 0 0 1px rgba(255, 211, 90, 0.24), 0 0 28px rgba(0, 0, 0, 0.6);
    pointer-events: none;
  }
  .corner-gem {
    position: absolute;
    width: 18px;
    height: 18px;
    transform: rotate(45deg);
    background: linear-gradient(135deg, #ffffff 0%, #7aeaff 45%, #ffd35a 100%);
    border: 2px solid #09061c;
    box-shadow: 0 0 14px rgba(122, 234, 255, 0.85);
    z-index: 20;
  }
  .cg-tl { top: 9px; left: 9px; }
  .cg-tr { top: 9px; right: 9px; }
  .cg-bl { bottom: 9px; left: 9px; }
  .cg-br { bottom: 9px; right: 9px; }

  /* Left Column below the top-left game logo (logo ends ~y=385) */
  .left-col {
    position: absolute;
    left: 68px;
    top: 416px;
    width: 1090px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    z-index: 10;
  }
  .eyebrow {
    align-self: flex-start;
    padding: 8px 20px;
    background: rgba(19, 13, 52, 0.9);
    border: 2px solid #7aeaff;
    border-radius: 6px;
    color: #ffd35a;
    font-size: 20px;
    letter-spacing: 4px;
    text-transform: uppercase;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.65);
  }
  .hero-title {
    position: relative;
    font-family: 'Montserrat', 'GameFredoka', 'Arial Black', sans-serif;
    font-weight: 900;
    font-size: 58px;
    line-height: 1.07;
    letter-spacing: 1px;
    text-transform: uppercase;
    filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.95));
  }
  .hero-title .stroke {
    position: absolute;
    inset: 0;
    color: #09061c;
    -webkit-text-stroke: 7px #09061c;
    text-shadow: 0 4px 0 #09061c, 0 -4px 0 #09061c, -4px 0 0 #09061c, 4px 0 0 #09061c;
  }
  .hero-title .fill {
    position: relative;
    background: linear-gradient(180deg, #ffffff 0%, #c6f8ff 56%, #ffd35a 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .pillars {
    display: flex;
    gap: 14px;
    flex-wrap: nowrap;
  }
  .pillar {
    padding: 9px 18px;
    background: rgba(24, 15, 62, 0.88);
    border: 2px solid rgba(196, 181, 253, 0.55);
    border-radius: 8px;
    color: #f8fafc;
    font-size: 20px;
    letter-spacing: 1px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }
  .pillar span { color: #7aeaff; margin-right: 6px; }

  .biomes-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-top: 4px;
  }
  .biome-card {
    background: rgba(10, 7, 30, 0.92);
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid var(--accent);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7), 0 0 16px var(--glow);
  }
  .biome-card img {
    width: 100%;
    height: 146px;
    object-fit: cover;
    display: block;
    image-rendering: pixelated;
  }
  .biome-label {
    padding: 8px 10px;
    text-align: center;
    font-size: 18px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--accent);
    background: rgba(8, 5, 24, 0.96);
    border-top: 2px solid rgba(255, 255, 255, 0.08);
  }

  .uneb-bar {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-top: 6px;
    padding: 12px 20px;
    background: rgba(11, 8, 34, 0.88);
    border: 1.5px solid rgba(255, 211, 90, 0.42);
    border-radius: 12px;
  }
  .uneb-bar img {
    height: 78px;
    width: auto;
    display: block;
    filter: drop-shadow(0 0 10px rgba(158, 240, 255, 0.45)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.8));
  }
  .uneb-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .uneb-text strong {
    font-size: 23px;
    color: #ffffff;
    letter-spacing: 0.4px;
  }
  .uneb-text span {
    font-family: 'GameFredokaSemi', 'Montserrat', sans-serif;
    font-size: 18px;
    color: #ffd35a;
  }

  /* Right Column: Exclusive QR Panel */
  .qr-panel {
    position: absolute;
    right: 68px;
    top: 64px;
    bottom: 64px;
    width: 636px;
    padding: 36px 38px;
    background: linear-gradient(165deg, rgba(16, 11, 48, 0.94) 0%, rgba(8, 6, 28, 0.96) 100%);
    border: 3px solid #7aeaff;
    border-radius: 22px;
    box-shadow:
      0 0 42px rgba(122, 234, 255, 0.28),
      0 20px 54px rgba(0, 0, 0, 0.85),
      inset 0 0 0 2px rgba(255, 211, 90, 0.35);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: center;
    z-index: 10;
  }
  .cta-pill {
    padding: 10px 28px;
    background: linear-gradient(90deg, #ffd35a 0%, #ffe999 50%, #ffd35a 100%);
    color: #0b071e;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 3px;
    text-transform: uppercase;
    border-radius: 999px;
    box-shadow: 0 0 22px rgba(255, 211, 90, 0.6);
  }
  .qr-cta {
    font-family: 'Montserrat', 'GameFredoka', sans-serif;
    font-weight: 900;
    font-size: 38px;
    line-height: 1.12;
    text-transform: uppercase;
    color: #ffffff;
    text-shadow: 0 4px 16px rgba(0, 0, 0, 0.9), 0 0 18px rgba(122, 234, 255, 0.4);
  }
  .qr-frame {
    padding: 18px;
    background: #ffffff;
    border-radius: 18px;
    border: 4px solid #ffd35a;
    box-shadow: 0 0 36px rgba(122, 234, 255, 0.45), 0 14px 32px rgba(0, 0, 0, 0.75);
  }
  .qr-frame img {
    width: 396px;
    height: 396px;
    display: block;
    image-rendering: pixelated;
  }
  .url-badge {
    width: 100%;
    padding: 14px 16px;
    background: rgba(5, 16, 36, 0.95);
    border: 2px solid #7aeaff;
    border-radius: 12px;
    color: #9ef0ff;
    font-size: 20px;
    letter-spacing: 0.4px;
    white-space: nowrap;
    box-shadow: inset 0 0 16px rgba(122, 234, 255, 0.14);
  }
  .platform-row {
    font-family: 'GameFredokaSemi', 'Montserrat', sans-serif;
    font-size: 16.5px;
    letter-spacing: 0.9px;
    color: #e2e8f0;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .platform-row span { color: #ffd35a; margin: 0 7px; }
</style>
</head>
<body>
  <div class="canvas">
    <img class="bg-art" src="/assets/story/interface/menu-aprovado.png" alt="">
    <div class="bg-scrim"></div>
    <div class="outer-frame"></div>
    <div class="corner-gem cg-tl"></div>
    <div class="corner-gem cg-tr"></div>
    <div class="corner-gem cg-bl"></div>
    <div class="corner-gem cg-br"></div>

    <section class="left-col">
      <div class="eyebrow">CRYSTAL MATH MANIA  ◆  TRUE PIXEL ART</div>
      <h1 class="hero-title">
        <span class="stroke" aria-hidden="true">MATEMÁTICA VISUAL<br>QUE VIRA MÚSICA</span>
        <span class="fill">MATEMÁTICA VISUAL<br>QUE VIRA MÚSICA</span>
      </h1>
      <div class="pillars">
        <div class="pillar"><span>◆</span>4 Biomas Brasileiros</div>
        <div class="pillar"><span>◆</span>21 Fases Únicas</div>
        <div class="pillar"><span>◆</span>100% Acessível</div>
      </div>

      <div class="biomes-strip">
        <div class="biome-card" style="--accent:#c084fc;--glow:rgba(192,132,252,0.35);">
          <img src="/teaser/previews/03-caverna-a.png" alt="Caverna">
          <div class="biome-label">Caverna</div>
        </div>
        <div class="biome-card" style="--accent:#4ade80;--glow:rgba(74,222,128,0.35);">
          <img src="/teaser/previews/05-floresta-b.png" alt="Floresta">
          <div class="biome-label">Floresta</div>
        </div>
        <div class="biome-card" style="--accent:#22d3ee;--glow:rgba(34,211,238,0.35);">
          <img src="/teaser/previews/06-rio-b.png" alt="Rio Encantado">
          <div class="biome-label">Rio Encantado</div>
        </div>
        <div class="biome-card" style="--accent:#fbbf24;--glow:rgba(251,191,36,0.35);">
          <img src="/teaser/previews/07-caatinga-b.png" alt="Caatinga">
          <div class="biome-label">Caatinga</div>
        </div>
      </div>

      <div class="uneb-bar">
        <img src="/assets/credits/uneb-logo.png" alt="Brasão UNEB">
        <div class="uneb-text">
          <strong>Universidade do Estado da Bahia (UNEB)</strong>
          <span>Engenharia de Software  •  Orientador: Peterson Lobato</span>
        </div>
      </div>
    </section>

    <aside class="qr-panel">
      <div class="cta-pill">✦ JOGUE AGORA GRÁTIS ✦</div>
      <div class="qr-cta">APONTE A CÂMERA<br>DO CELULAR</div>
      <div class="qr-frame">
        <img src="/teaser-silksong-style/qr-sinfonia.png" alt="QR Code para brinqueaprenda.com.br/jogo/sinfonia-dos-cristais">
      </div>
      <div class="url-badge">brinqueaprenda.com.br/jogo/sinfonia-dos-cristais</div>
      <div class="platform-row">PC &amp; Celular<span>◆</span>No Navegador<span>◆</span>Sem Instalação</div>
    </aside>
  </div>
</body>
</html>`;

  const server = http.createServer(async (req, res) => {
    const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (reqPath === '/' || reqPath === '/card.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
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

async function main() {
  const browserPath = findBrowserExecutable();
  if (!browserPath) throw new Error('Edge/Chrome executable not found');

  const port = 8196;
  const server = await startStaticServer(port);
  const userDataDir = join(__dirname, `.tmp-card-${process.pid}`);
  await mkdir(userDataDir, { recursive: true });
  const cdpPort = 9258;

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
    const loadDone = new Promise(r => { onLoadResolve = r; });
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/card.html` });
    await Promise.race([loadDone, new Promise(r => setTimeout(r, 6000))]);

    const ready = await send('Runtime.evaluate', {
      expression: `(async () => {
        for (let i = 0; i < 40; i++) {
          const imgs = [...document.querySelectorAll('img')];
          if (imgs.length > 0 && imgs.every(im => im.complete && im.naturalWidth > 0)) break;
          await new Promise(r => setTimeout(r, 150));
        }
        await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3500))]);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const imgs = [...document.querySelectorAll('img')].map(im => ({ src: im.src, w: im.naturalWidth, h: im.naturalHeight }));
        const fonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ':' + f.weight);
        return { imgs, fonts };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Loaded card assets:', JSON.stringify(ready.result?.value, null, 2));

    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    await writeFile(outPath, Buffer.from(shot.data, 'base64'));
    console.log('Saved promotional card:', outPath);
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
