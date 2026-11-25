#!/usr/bin/env node
/**
 * Captura real de gameplay em 1920x1080 @ 60 FPS para o Teaser (60s) de Sinfonia dos Cristais.
 * Usa Edge Headless via CDP + compositor True Pixel Art (imageSmoothingEnabled = false)
 * + captura dos SFX reais via WebAudio MediaStreamDestination.
 *
 * Não modifica nenhum arquivo do jogo. Salva os clipes em teaser/clips/ e previews PNG em teaser/previews/.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import http from 'node:http';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const clipsDir = join(__dirname, 'clips');
const previewsDir = join(__dirname, 'previews');
await mkdir(clipsDir, { recursive: true });
await mkdir(previewsDir, { recursive: true });

const GAME_PORT = 8191;
const UPLOAD_PORT = 8192;
const BASE_URL = `http://127.0.0.1:${GAME_PORT}/index.html`;

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

async function startLocalGameServer() {
  const child = spawn(process.execPath, [join(root, 'scripts/serve.mjs')], {
    cwd: root,
    env: { ...process.env, PORT: String(GAME_PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => rejectReady(new Error('Timeout starting game server')), 8000);
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('Crystal Math Mania')) {
        clearTimeout(timeout);
        resolveReady();
      }
    });
    child.on('exit', code => {
      clearTimeout(timeout);
      rejectReady(new Error(`Game server exited early (${code})`));
    });
  });
  return child;
}

function startUploadServer() {
  const savedFiles = new Map();
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url, `http://127.0.0.1:${UPLOAD_PORT}`);
    if (req.method === 'POST' && url.pathname === '/upload') {
      const name = (url.searchParams.get('name') || 'clip.webm').replace(/[^a-zA-Z0-9._-]/g, '_');
      const kind = url.searchParams.get('kind') || 'clip';
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      const buf = Buffer.concat(chunks);
      const outPath = join(kind === 'preview' ? previewsDir : clipsDir, name);
      await writeFile(outPath, buf);
      savedFiles.set(name, { path: outPath, size: buf.length });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, name, size: buf.length }));
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  });
  return new Promise(resolveSrv => {
    server.listen(UPLOAD_PORT, '127.0.0.1', () => resolveSrv({ server, savedFiles }));
  });
}

const INJECTED_RECORDER_SCRIPT = `
(() => {
  if (window.__TeaserRecorder) return;

  // 1. Intercept WebAudio destination connections so we capture real crystalline SFX
  const audioDests = [];
  let audioCtxRef = null;
  let mixedStream = null;
  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    try {
      if (dest && this.context && dest === this.context.destination) {
        audioCtxRef = this.context;
        if (!this.context.__teaserDest) {
          this.context.__teaserDest = this.context.createMediaStreamDestination();
          audioDests.push(this.context.__teaserDest);
        }
        try {
          origConnect.call(this, this.context.__teaserDest);
        } catch {}
      }
    } catch {}
    return origConnect.call(this, dest, ...rest);
  };

  // Preload menu & map bitmaps so canvas compositing is zero-flicker
  const mapImg = new Image();
  mapImg.src = 'assets/story/interface-extra/mapa-sem-personagem.png';

  const recCanvas = document.createElement('canvas');
  recCanvas.width = 1920;
  recCanvas.height = 1080;
  const recCtx = recCanvas.getContext('2d', { alpha: false });

  let mode = 'game'; // 'menu' | 'map' | 'game'
  let recording = false;
  let rafId = 0;
  let startMs = 0;
  let menuZoom = false;
  let mediaRecorder = null;
  let chunks = [];
  let activeMime = '';
  let clipMeta = null;

  function pickMime() {
    const candidates = [
      'video/mp4;codecs=avc1.640028,mp4a.40.2',
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    for (const m of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    }
    return '';
  }

  function drawMenuFrame(now) {
    recCtx.fillStyle = '#05030f';
    recCtx.fillRect(0, 0, 1920, 1080);

    const art = document.querySelector('#home img.menu-art');
    const particles = document.getElementById('menuParticles');
    const btns = Array.from(document.querySelectorAll('#home .menu-btn-art'));

    const elapsed = (now - startMs) / 1000;
    const z = menuZoom ? (1 + Math.min(0.055, elapsed * 0.0085)) : 1;
    const anchorX = 1920 * 0.62;
    const anchorY = 1080 * 0.50;

    recCtx.save();
    recCtx.translate(anchorX, anchorY);
    recCtx.scale(z, z);
    recCtx.translate(-anchorX, -anchorY);
    recCtx.imageSmoothingEnabled = false;

    if (art && art.complete && art.naturalWidth) {
      recCtx.drawImage(art, 0, 0, 1920, 1080);
    }
    if (particles && particles.width > 0) {
      recCtx.drawImage(particles, 0, 0, 1920, 1080);
    }
    // Composite menu buttons faithfully at their DOM positions
    const frameEl = document.getElementById('menuFilmFrame');
    const frameRect = frameEl ? frameEl.getBoundingClientRect() : { left: 0, top: 0, width: 1920, height: 1080 };
    for (const b of btns) {
      if (!b.complete || !b.naturalWidth) continue;
      const r = b.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const x = ((r.left - frameRect.left) / Math.max(1, frameRect.width)) * 1920;
      const y = ((r.top - frameRect.top) / Math.max(1, frameRect.height)) * 1080;
      const w = (r.width / Math.max(1, frameRect.width)) * 1920;
      const h = (r.height / Math.max(1, frameRect.height)) * 1080;
      recCtx.drawImage(b, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    recCtx.restore();
  }

  let fairySheetImg = null;
  let fairySheetUrl = '';
  const mapSparkles = [];

  function drawMapFrame(now) {
    recCtx.fillStyle = '#05030f';
    recCtx.fillRect(0, 0, 1920, 1080);
    recCtx.imageSmoothingEnabled = false;

    const jm = document.querySelector('.journey-map');
    const jmRect = jm ? jm.getBoundingClientRect() : { left: 0, top: 0, width: 1920, height: 1080 };
    if (mapImg.complete && mapImg.naturalWidth) {
      recCtx.drawImage(mapImg, 0, 0, 1920, 1080);
    }

    // Draw nodes matching CSS styles
    const nodes = document.querySelectorAll('.journey-node');
    for (const btn of nodes) {
      const r = btn.getBoundingClientRect();
      if (r.width <= 0) continue;
      const cx = ((r.left + r.width / 2 - jmRect.left) / Math.max(1, jmRect.width)) * 1920;
      const cy = ((r.top + r.height / 2 - jmRect.top) / Math.max(1, jmRect.height)) * 1080;
      const rad = ((r.width / 2) / Math.max(1, jmRect.width)) * 1920;
      const lvl = Number(btn.dataset.level || 0);
      const isDone = btn.classList.contains('done');
      const isCur = btn.classList.contains('current');

      recCtx.save();
      recCtx.beginPath();
      recCtx.arc(cx, cy, rad, 0, Math.PI * 2);
      recCtx.fillStyle = isDone ? '#14532d' : (lvl === 21 ? '#7c510a' : '#2e1659');
      recCtx.fill();
      recCtx.lineWidth = 3;
      recCtx.strokeStyle = isCur ? '#ffe887' : (isDone ? '#52e697' : (lvl === 21 ? '#ffd86b' : '#a87ffb'));
      recCtx.stroke();

      recCtx.fillStyle = (lvl === 5 || lvl === 10 || lvl === 15 || lvl === 20) && !isDone ? '#ffe887' : (lvl === 21 ? '#fff5a8' : '#ffffff');
      recCtx.font = 'bold ' + Math.round(rad * 0.95) + 'px Fredoka, sans-serif';
      recCtx.textAlign = 'center';
      recCtx.textBaseline = 'middle';
      let label = String(lvl);
      if (isDone) label = '✓';
      else if (lvl === 21) label = '★';
      else if ([5, 10, 15, 20].includes(lvl)) label = '♪';
      recCtx.fillText(label, cx, cy + 1);
      recCtx.restore();
    }

    // Draw Fairy travelling along the path
    const fairy = document.querySelector('.journey-fairy');
    if (fairy) {
      const bg = fairy.style.backgroundImage || '';
      const m = bg.match(/url\\("?(data:[^")]+)"?\\)/);
      if (m && m[1] !== fairySheetUrl) {
        fairySheetUrl = m[1];
        fairySheetImg = new Image();
        fairySheetImg.src = fairySheetUrl;
      }
      const fr = fairy.getBoundingClientRect();
      const fx = ((fr.left - jmRect.left) / Math.max(1, jmRect.width)) * 1920;
      const fy = ((fr.top - jmRect.top) / Math.max(1, jmRect.height)) * 1080;
      const fw = (fr.width / Math.max(1, jmRect.width)) * 1920;
      const fh = (fr.height / Math.max(1, jmRect.height)) * 1080;

      // Fairy dust trail
      if (Math.random() < 0.7) {
        mapSparkles.push({
          x: fx + fw * 0.5 + (Math.random() - 0.5) * 18,
          y: fy + fh * 0.6 + (Math.random() - 0.5) * 14,
          life: 0.75,
          col: Math.random() < 0.5 ? '#9ef0ff' : '#ffe887',
          sz: Math.random() < 0.5 ? 6 : 9
        });
      }
      for (let i = mapSparkles.length - 1; i >= 0; i--) {
        const s = mapSparkles[i];
        s.life -= 0.016;
        s.y -= 0.4;
        if (s.life <= 0) { mapSparkles.splice(i, 1); continue; }
        recCtx.fillStyle = s.col;
        recCtx.globalAlpha = Math.max(0, s.life);
        recCtx.fillRect(Math.round(s.x), Math.round(s.y), s.sz, s.sz);
      }
      recCtx.globalAlpha = 1;

      if (fairySheetImg && fairySheetImg.complete && fairySheetImg.naturalWidth) {
        const frameIdx = Math.floor(now / 140) % 4;
        const row = window.CrystalJourney?.moving ? 1 : 0;
        const cw = fairySheetImg.naturalWidth / 4;
        const ch = fairySheetImg.naturalHeight / 2;
        recCtx.imageSmoothingEnabled = false;
        recCtx.drawImage(fairySheetImg, frameIdx * cw, row * ch, cw, ch, Math.round(fx), Math.round(fy), Math.round(fw), Math.round(fh));
      }
    }
  }

  function drawGameFrame() {
    recCtx.fillStyle = '#05030f';
    recCtx.fillRect(0, 0, 1920, 1080);

    const mainCv = document.getElementById('truePixelScreen');
    if (mainCv && !mainCv.hidden && mainCv.width > 0) {
      recCtx.imageSmoothingEnabled = false;
      recCtx.drawImage(mainCv, 0, 0, 1920, 1080);
    }

    const textOv = document.getElementById('truePixelTextOverlay');
    if (textOv && !textOv.hidden && textOv.style.display !== 'none' && textOv.width > 0) {
      recCtx.imageSmoothingEnabled = true;
      recCtx.drawImage(textOv, 0, 0, 1920, 1080);
    }
  }

  function tick(now) {
    if (!recording) return;
    if (mode === 'menu') drawMenuFrame(now);
    else if (mode === 'map') drawMapFrame(now);
    else drawGameFrame();
    rafId = requestAnimationFrame(tick);
  }

  function createAudioTrack() {
    try {
      // Combine any captured AudioContext MediaStreamDestinations
      const tracks = [];
      for (const d of audioDests) {
        const t = d.stream?.getAudioTracks?.()[0];
        if (t) tracks.push(t);
      }
      if (tracks.length > 0) return tracks[0];
      // Create silent audio track if none yet so container has valid audio stream
      const ac = audioCtxRef || new (window.AudioContext || window.webkitAudioContext)();
      const dst = ac.createMediaStreamDestination();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      g.gain.value = 0.00001;
      osc.connect(g).connect(dst);
      osc.start();
      return dst.stream.getAudioTracks()[0];
    } catch {
      return null;
    }
  }

  window.__TeaserRecorder = {
    setMode(m, opts = {}) {
      mode = m;
      menuZoom = Boolean(opts.menuZoom);
    },
    async start(clipBaseName, m = 'game', opts = {}) {
      mode = m;
      menuZoom = Boolean(opts.menuZoom);
      chunks = [];
      startMs = performance.now();
      clipMeta = { clipBaseName };

      // Render one immediate frame before stream starts
      if (mode === 'menu') drawMenuFrame(startMs);
      else if (mode === 'map') drawMapFrame(startMs);
      else drawGameFrame();

      const vStream = recCanvas.captureStream(60);
      const aTrack = createAudioTrack();
      if (aTrack) vStream.addTrack(aTrack);

      activeMime = pickMime();
      const recOpts = { videoBitsPerSecond: 14_000_000 };
      if (activeMime) recOpts.mimeType = activeMime;
      mediaRecorder = new MediaRecorder(vStream, recOpts);
      mediaRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      recording = true;
      mediaRecorder.start(200);
      rafId = requestAnimationFrame(tick);
      return { mime: activeMime || 'default' };
    },
    async snapshot(previewName) {
      if (mode === 'menu') drawMenuFrame(performance.now());
      else if (mode === 'map') drawMapFrame(performance.now());
      else drawGameFrame();
      const blob = await new Promise(res => recCanvas.toBlob(res, 'image/png'));
      const resp = await fetch('http://127.0.0.1:${UPLOAD_PORT}/upload?kind=preview&name=' + encodeURIComponent(previewName), {
        method: 'POST',
        body: blob
      });
      return resp.json();
    },
    async stopAndUpload() {
      const mime = mediaRecorder?.mimeType || activeMime || 'video/webm';
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const filename = clipMeta.clipBaseName + '.' + ext;
      await new Promise((res) => {
        mediaRecorder.onstop = res;
        mediaRecorder.stop();
      });
      recording = false;
      if (rafId) cancelAnimationFrame(rafId);
      const blob = new Blob(chunks, { type: mime });
      const resp = await fetch('http://127.0.0.1:${UPLOAD_PORT}/upload?kind=clip&name=' + encodeURIComponent(filename), {
        method: 'POST',
        body: blob
      });
      const json = await resp.json();
      return { ...json, mime, durationMs: Math.round(performance.now() - startMs) };
    }
  };
})();
`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runCapture() {
  const browserPath = findBrowserExecutable();
  if (!browserPath) throw new Error('Edge/Chrome not found');

  const gameServer = await startLocalGameServer();
  const { server: uploadServer } = await startUploadServer();

  const debugPort = 9444 + Math.floor(Math.random() * 400);
  const userDataDir = join(__dirname, `.tmp-profile-${debugPort}`);
  const browserProc = spawn(
    browserPath,
    [
      '--headless=new',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=1920,1080',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  const onlyArg = process.argv.find(a => a.startsWith('--only='))?.split('=')[1] || '';
  const want = id => !onlyArg || onlyArg.split(',').includes(id);
  const results = [];

  try {
    let target = null;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        const list = await res.json();
        target = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
        if (target) break;
      } catch {}
      await new Promise(r => setTimeout(r, 150));
    }
    if (!target) throw new Error('Could not connect to Edge CDP');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });

    let msgId = 1;
    const pending = new Map();
    ws.addEventListener('message', ev => {
      const data = JSON.parse(String(ev.data));
      if (data.id && pending.has(data.id)) {
        const { resolve: r, reject: j } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) j(new Error(data.error.message));
        else r(data.result);
      }
    });

    const send = (method, params = {}) =>
      new Promise((res, rej) => {
        const id = msgId++;
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ id, method, params }));
      });

    const evalJS = async expression => {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
      }
      return res.result?.value;
    };

    async function waitIrisDone(timeoutMs = 3000) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        const active = await evalJS('Boolean(window.TruePixelEngine?.IrisTransition?.active)');
        if (!active) break;
        await sleep(60);
      }
      await sleep(120);
    }

    async function muteBgmKeepSfx() {
      await evalJS(`(() => {
        if (window.CrystalApp) window.CrystalApp.godMode = false;
        if (window.TruePixelEngine?.GameHUD) {
          window.TruePixelEngine.GameHUD.godMode = false;
          window.TruePixelEngine.GameHUD.muted = false;
          window.TruePixelEngine.GameHUD.musicVol = 0;
          window.TruePixelEngine.GameHUD.sfxVol = 100;
          window.TruePixelEngine.GameHUD.syncAudio?.();
        }
        if (window.CrystalApp?.state?.settings) {
          window.CrystalApp.state.settings.music = 0;
          window.CrystalApp.state.settings.fx = 100;
          window.CrystalApp.state.settings.assist = false;
          window.CrystalApp.state.settings.motion = false;
        }
        window.CrystalMenuAudio?.pause?.();
        window.CrystalAudio?.unlock?.();
        // Mute all HTML <audio> tracks (we cut to our clean original medley in invideo)
        for (const a of document.querySelectorAll('audio')) { a.muted = true; a.volume = 0; }
        if (window.CaveChapter1) {
          for (const k of ['musicAudio', 'regularAudio']) {
            if (window.CaveChapter1[k]) { window.CaveChapter1[k].muted = true; window.CaveChapter1[k].volume = 0; }
          }
        }
        if (window.TruePixelWorlds) {
          for (const k of ['musicAudio', 'regularAudio']) {
            if (window.TruePixelWorlds[k]) { window.TruePixelWorlds[k].muted = true; window.TruePixelWorlds[k].volume = 0; }
          }
        }
      })()`);
    }

    async function logicalToClient(lx, ly) {
      return evalJS(`(() => {
        const cv = document.getElementById('truePixelScreen');
        const r = cv.getBoundingClientRect();
        return {
          x: r.left + (${lx} + 0.5) * (r.width / 320),
          y: r.top + (${ly} + 0.5) * (r.height / 180)
        };
      })()`);
    }

    async function mouseDrag(lx1, ly1, lx2, ly2, steps = 22, stepDelay = 20) {
      const p1 = await logicalToClient(lx1, ly1);
      const p2 = await logicalToClient(lx2, ly2);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p1.x, y: p1.y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p1.x, y: p1.y, button: 'left', clickCount: 1 });
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const cx = p1.x + (p2.x - p1.x) * t;
        const cy = p1.y + (p2.y - p1.y) * t;
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, buttons: 1 });
        await sleep(stepDelay);
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p2.x, y: p2.y, button: 'left', clickCount: 1 });
    }

    async function mouseClick(lx, ly) {
      const p = await logicalToClient(lx, ly);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
      await sleep(40);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: INJECTED_RECORDER_SCRIPT });
    await send('Page.navigate', { url: BASE_URL });

    // Wait for app ready
    for (let i = 0; i < 60; i++) {
      const ok = await evalJS('Boolean(window.CrystalTestAPI && window.CrystalApp && window.TruePixelEngine)');
      if (ok) break;
      await sleep(150);
    }

    await evalJS(`(() => {
      window.CrystalTestAPI.closeDialogs();
      window.CrystalTestAPI.unlockAllLevelsForTest();
      window.CrystalFrameScale = 1;
      if (window.TruePixelEngine?.PlayerProfile) {
        window.TruePixelEngine.playerProfile = { name: 'Viajante', gender: 'male' };
      }
    })()`);
    await muteBgmKeepSfx();
    await sleep(400);

    // ------------------------------------------------------------------
    // CLIP 1: 01-menu-porta (Menu Principal vivo + zoom na Porta Ancestral)
    // ------------------------------------------------------------------
    if (want('01')) {
    console.log('Recording 01-menu-porta...');
    await evalJS('window.CrystalTestAPI.goto("home")');
    await sleep(300);
    await evalJS('window.__TeaserRecorder.start("01-menu-porta", "menu", { menuZoom: true })');
    await sleep(1800);
    await evalJS('window.__TeaserRecorder.snapshot("01-menu-a.png")');
    // Trigger gentle door glow hover
    await evalJS(`(() => {
      const btn = document.getElementById('newGameButton');
      btn?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    })()`);
    await sleep(3000);
    await evalJS('window.__TeaserRecorder.snapshot("01-menu-b.png")');
    await sleep(1600);
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));
    }

    // ------------------------------------------------------------------
    // CLIP 2: 02-mapa-jornada (Mapa Ecológico: Fada voando pelos biomas)
    // ------------------------------------------------------------------
    if (want('02')) {
    console.log('Recording 02-mapa-jornada...');
    await evalJS(`(() => {
      window.CrystalApp?.syncProgress?.([1,2,3,4,5], 1);
      window.CrystalTestAPI.goto("map");
      window.CrystalApp.godMode = true;
      if (window.TruePixelEngine?.GameHUD) window.TruePixelEngine.GameHUD.godMode = true;
      window.CrystalJourney?.render({
        current: 1,
        unlocked: 21,
        completed: [1,2,3,4,5],
        records: {},
        reduced: false,
        godMode: true,
        notify: () => {},
        start: () => {}
      });
    })()`);
    await sleep(300);
    await evalJS('window.__TeaserRecorder.start("02-mapa-jornada", "map")');
    await sleep(500);
    await evalJS('window.__TeaserRecorder.snapshot("02-map-a.png")');
    // Click Node 17 in Caatinga so fairy travels across Cave -> Forest -> River -> Caatinga!
    await evalJS('document.querySelector(\'.journey-node[data-level="17"]\')?.click()');
    await sleep(3200);
    await evalJS('window.__TeaserRecorder.snapshot("02-map-b.png")');
    await sleep(2800);
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));
    }

    // ------------------------------------------------------------------
    // CLIP 3: 03-caverna-mecanicas (Fusão, Opala, Equação + Onda Bayer 4x4)
    // ------------------------------------------------------------------
    if (want('03')) {
    console.log('Recording 03-caverna-mecanicas...');
    await evalJS(`(() => {
      window.CrystalTestAPI.startLevel(4, true);
      const C = window.CaveChapter1;
      C.phase = 'gameplay';
      C.setupLevelStep(4, 1);
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
    })()`);
    await muteBgmKeepSfx();
    await sleep(250);
    await evalJS('window.__TeaserRecorder.start("03-caverna-mecanicas", "game")');
    await sleep(450);
    // Merge qw1 (84,78) -> qw3 (120,78) => 4
    await mouseDrag(84, 78, 120, 78, 18, 22);
    await sleep(350);
    await evalJS('window.__TeaserRecorder.snapshot("03-caverna-a.png")');
    // Opal op1 (138,114) -> merged white (120,78) => 3
    await mouseDrag(138, 114, 120, 78, 18, 22);
    await sleep(350);
    // Annul white 3 -> sw3 (212,78)
    await mouseDrag(120, 78, 212, 78, 22, 20);
    await sleep(450);
    // Annul rose 3 (96,114) -> sr3 (212,114) => Bayer 4x4 Wave!
    await mouseDrag(96, 114, 212, 114, 22, 20);
    await sleep(1000);
    // Wait for step 2 (Equation) or advance into Step 2 cleanly
    await evalJS(`(() => {
      const C = window.CaveChapter1;
      if (C.currentStep < 2 || C.phase !== 'gameplay') {
        C.phase = 'gameplay';
        C.setupLevelStep(4, 2);
      }
      window.TruePixelEngine.TutorialModal.close?.();
    })()`);
    await sleep(450);
    // Drag opal (112,64) into pureEquation (112,98) or expand equation to show crystal equation lines!
    await mouseClick(112, 98);
    await sleep(450);
    await evalJS('window.__TeaserRecorder.snapshot("03-caverna-b.png")');
    // Drag opal (112,64) onto white 4 inside expanded equation
    await evalJS(`(() => {
      const C = window.CaveChapter1;
      const op = C.pieces.find(p => p.type === 'opal' && !p.shadow && !p.broken);
      const w4 = C.pieces.find(p => p.type === 'white' && !p.shadow && !p.broken);
      window.__targetPair = op && w4 ? [op.x, op.y, w4.x, w4.y] : null;
    })()`);
    const pair = await evalJS('window.__targetPair');
    if (pair) {
      await mouseDrag(pair[0], pair[1], pair[2], pair[3], 18, 20);
    }
    await sleep(1600);
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));
    }

    // ------------------------------------------------------------------
    // CLIP 4: 04-caverna-fada-ritmo (Fase 5 — Desafio Rítmico da Ordem)
    // ------------------------------------------------------------------
    if (want('04')) {
    console.log('Recording 04-caverna-fada-ritmo...');
    await evalJS(`(() => {
      window.CrystalTestAPI.startLevel(5, true);
      const C = window.CaveChapter1;
      C.startMusicalShow();
      window.TruePixelEngine.IrisTransition.active = false;
      if (C.musicAudio) { try { C.musicAudio.pause(); C.musicAudio.muted = true; C.musicAudio.volume = 0; } catch {} C.musicAudio = null; }
      C.musicalTime = 22.5;
    })()`);
    await muteBgmKeepSfx();
    await evalJS('(() => { const C = window.CaveChapter1; if (C.musicAudio) { try { C.musicAudio.pause(); } catch {} C.musicAudio = null; } C.musicalTime = 22.5; })()');
    await sleep(200);
    await evalJS('window.__TeaserRecorder.start("04-caverna-fada-ritmo", "game")');
    await sleep(1600);
    await evalJS('window.__TeaserRecorder.snapshot("04-fada-a.png")');
    await sleep(1200);
    await evalJS(`(() => {
      const C = window.CaveChapter1;
      if (C.musicAudio) { try { C.musicAudio.pause(); } catch {} C.musicAudio = null; }
      C.musicalTime = 135.6;
      C.phase = 'musical_part2_bright';
    })()`);
    for (let k = 0; k < 5; k++) {
      await sleep(550);
      await evalJS(`(() => {
        const C = window.CaveChapter1;
        window.CaveRhythmKaraoke?.onInput?.(true, false, C.musicalTime, false);
        setTimeout(() => window.CaveRhythmKaraoke?.onInput?.(false, false, C.musicalTime + 0.18, false), 180);
      })()`);
      if (k === 2) await evalJS('window.__TeaserRecorder.snapshot("04-fada-b.png")');
    }
    await sleep(800);
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));
    }

    // ------------------------------------------------------------------
    // CLIP 5: 05-floresta-corte (Esmeralda + Fase 10 Especial: Araci Corte Cristalino)
    // ------------------------------------------------------------------
    if (want('05')) {
    console.log('Recording 05-floresta-corte...');
    await evalJS(`(() => {
      window.TruePixelWorlds.startWorldLevel('forest', 1, 6);
      const W = window.TruePixelWorlds;
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.phase = 'gameplay';
      W.setupStep(1);
    })()`);
    await muteBgmKeepSfx();
    await sleep(250);
    await evalJS('window.__TeaserRecorder.start("05-floresta-corte", "game")');
    await sleep(400);
    // Drag quartz (96,96) onto Emerald Altar (156,104) to double 2->4 with green aura, then onto shadow (214,96)
    await mouseDrag(96, 96, 156, 104, 18, 22);
    await sleep(500);
    await evalJS('window.__TeaserRecorder.snapshot("05-floresta-a.png")');
    await mouseDrag(156, 104, 214, 96, 18, 20);
    await sleep(900);
    // Transition directly into active Forest Ninja gameplay (Stage 1 -> pure crystals flying)
    await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      W.startWorldLevel('forest', 5, 10);
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.startForestNinjaGame();
      W.forestNinja.calmMode = false;
      W.startForestNinjaStage(1);
      W.spawnForestNinjaWave(false);
    })()`);
    await muteBgmKeepSfx();
    await sleep(700);
    // Perform real slash gestures across airborne pure crystals for 4.5s
    for (let wave = 0; wave < 4; wave++) {
      const targets = await evalJS(`(() => {
        const fn = window.TruePixelWorlds?.forestNinja;
        if (!fn) return [];
        if (fn.flyingCrystals.length === 0) window.TruePixelWorlds.spawnForestNinjaWave(false);
        return fn.flyingCrystals.filter(c => !c.shadow && !c.sliced && c.y < 165).map(c => ({ x: c.x, y: c.y }));
      })()`);
      if (targets && targets.length > 0) {
        const t = targets[0];
        await mouseDrag(Math.max(20, t.x - 28), Math.min(165, t.y + 18), Math.min(300, t.x + 28), Math.max(26, t.y - 18), 10, 14);
      } else {
        await mouseDrag(70, 120, 250, 55, 10, 14);
      }
      if (wave === 1) await evalJS('window.__TeaserRecorder.snapshot("05-floresta-b.png")');
      await sleep(750);
    }
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));
    }

    // ------------------------------------------------------------------
    // CLIP 6: 06-rio-melodia (Frações de Água-Marinha + Fase 15 Melodia das Águas)
    // ------------------------------------------------------------------
    if (want('06')) {
    console.log('Recording 06-rio-melodia...');
    await evalJS(`(() => {
      window.TruePixelWorlds.startWorldLevel('river', 1, 11);
      const W = window.TruePixelWorlds;
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.phase = 'gameplay';
      W.setupStep(1);
    })()`);
    await muteBgmKeepSfx();
    await sleep(250);
    await evalJS('window.__TeaserRecorder.start("06-rio-melodia", "game")');
    await sleep(400);
    // Drag free aqua (74,96) to bottom slot of fractionPlatform (154, 112)
    await mouseDrag(74, 96, 154, 114, 18, 22);
    await sleep(500);
    await evalJS('window.__TeaserRecorder.snapshot("06-rio-a.png")');
    // Click fraction bar center to divide!
    await mouseClick(154, 96);
    await sleep(700);
    // Drag resulting aqua 1 to shadow (236, 96)
    await mouseDrag(154, 96, 236, 96, 18, 20);
    await sleep(800);
    // Switch to River Melody Special (Level 15) — Calm Mode OFF
    await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      W.startWorldLevel('river', 5, 15);
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.startRiverMelodyGame();
      window.TruePixelEngine.TutorialModal.close?.();
      W.phase = 'river_melody_game';
      W.riverMelody.calmMode = false;
      W.setupRiverMelodyRound(2);
    })()`);
    await muteBgmKeepSfx();
    // Wait for demo notes to chime and float (~2.8s), capture mid-melody snapshot, then click notes!
    await sleep(1600);
    await evalJS('window.__TeaserRecorder.snapshot("06-rio-b.png")');
    for (let w = 0; w < 20; w++) {
      const phase = await evalJS('window.TruePixelWorlds?.riverMelody?.phase');
      if (phase === 'player_input') break;
      await sleep(150);
    }
    for (let note = 0; note < 3; note++) {
      const xy = await evalJS(`(() => {
        const rm = window.TruePixelWorlds?.riverMelody;
        if (!rm || rm.phase !== 'player_input') return null;
        const idx = rm.masterSequence[rm.playerIndex];
        const c = rm.crystals[idx];
        return c ? { x: c.x, y: c.baseY } : null;
      })()`);
      if (xy) await mouseClick(xy.x, xy.y);
      await sleep(400);
    }
    await sleep(900);
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));
    }

    // ------------------------------------------------------------------
    // CLIP 7: 07-caatinga-areias (Topázio/Moldes + Fase 20 Baião / Desafio das Areias)
    // ------------------------------------------------------------------
    if (want('07')) {
    console.log('Recording 07-caatinga-areias...');
    await evalJS(`(() => {
      window.TruePixelWorlds.startWorldLevel('caatinga', 1, 16);
      const W = window.TruePixelWorlds;
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.phase = 'gameplay';
      W.setupStep(1);
    })()`);
    await muteBgmKeepSfx();
    await sleep(250);
    await evalJS('window.__TeaserRecorder.start("07-caatinga-areias", "game")');
    await sleep(400);
    // Drag Fire Opal (92,96) onto electric circle mold (148,96) -> transforms -> shatter shadow (214,96)
    await mouseDrag(92, 96, 148, 96, 18, 22);
    await sleep(500);
    await evalJS('window.__TeaserRecorder.snapshot("07-caatinga-a.png")');
    await mouseDrag(148, 96, 214, 96, 18, 20);
    await sleep(850);
    // Switch to Caatinga Shell Game Special (Level 20) — Calm Mode OFF, Round 4 (4 cups, fast!)
    await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      W.startWorldLevel('caatinga', 5, 20);
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.startShellGame();
      window.TruePixelEngine.TutorialModal.close?.();
      W.shellGame.calmMode = false;
      W.setupShellRound(3);
      W.phase = 'shell_game_show';
      W.phaseTime = 0;
    })()`);
    await muteBgmKeepSfx();
    await sleep(2400);
    await evalJS('window.__TeaserRecorder.snapshot("07-caatinga-b.png")');
    // Wait until cups finish shuffling and pick winning cup!
    for (let w = 0; w < 30; w++) {
      const ph = await evalJS('window.TruePixelWorlds?.phase');
      if (ph === 'shell_game_pick') break;
      await sleep(200);
    }
    const winCupXY = await evalJS(`(() => {
      const sg = window.TruePixelWorlds?.shellGame;
      const cup = sg?.cups?.[sg.winningCup];
      return cup ? { x: cup.x, y: cup.y } : null;
    })()`);
    if (winCupXY) await mouseClick(winCupXY.x, winCupXY.y);
    await sleep(1200);
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));
    }

    // ------------------------------------------------------------------
    // CLIP 8: 08-porta-final-climax (Fase 21 — Encaixe, Abertura da Porta & Last Dance)
    // ------------------------------------------------------------------
    if (want('08')) {
    console.log('Recording 08-porta-final-climax...');
    await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      W.startFinalGate();
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.finalDoorSockets = { fairy: true, emerald: true, river: true, caatinga: true };
      if (window.TruePixelEngine?.DialogueBox?.sockets) {
        window.TruePixelEngine.DialogueBox.sockets = { fairy: true, emerald: true, river: true, caatinga: true };
      }
      W.obstacleDecay = 0.75;
      W.targetObstacleDecay = 1;
      for (const g of Object.values(W.finalGuardians || {})) {
        g.visible = true;
        g.x = g.targetX;
        g.state = 'celebrate';
      }
      W.startGemDeliveryToGate(4);
    })()`);
    await muteBgmKeepSfx();
    await sleep(150);
    await evalJS('window.__TeaserRecorder.start("08-porta-final-climax", "game")');
    await sleep(2500);
    await evalJS('window.__TeaserRecorder.snapshot("08-final-a.png")');
    // Auto-advance the 2 short dialogue lines when gate opens so we enter Last Dance smoothly
    for (let t = 0; t < 30; t++) {
      const st = await evalJS('({ ph: window.TruePixelWorlds?.phase, dlg: window.TruePixelEngine?.DialogueBox?.isOpen })');
      if (st.dlg) {
        await evalJS('window.TruePixelEngine.DialogueBox.advance()');
      }
      if (st.ph === 'final_last_dance') break;
      await sleep(220);
    }
    await sleep(2600);
    await evalJS('window.__TeaserRecorder.snapshot("08-final-b.png")');
    await sleep(2000);
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));
    }

    ws.close();
  } finally {
    browserProc.kill();
    gameServer.kill();
    uploadServer.close();
    await sleep(300);
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }

  console.log('\n=== CLIPES GRAVADOS EM 1920x1080 @ 60 FPS ===');
  for (const r of results) {
    console.log(`- ${r.name}: ${(r.size / 1024).toFixed(1)} KB | ${r.durationMs}ms | ${r.mime}`);
  }
}

runCapture().catch(err => {
  console.error('Erro na captura:', err);
  process.exit(1);
});
