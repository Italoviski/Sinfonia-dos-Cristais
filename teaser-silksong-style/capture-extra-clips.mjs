#!/usr/bin/env node
/**
 * Captura 4 micro-clipes reais de gameplay em 1920x1080 @ 60 FPS para os Atos 2 e 3
 * do trailer estilo Silksong, usando Edge Headless CDP com imageSmoothingEnabled = false
 * e captura de SFX reais via WebAudio MediaStreamDestination.
 *
 * Salva exclusivamente em teaser-silksong-style/clips/ e previews em teaser-silksong-style/previews/.
 * Não modifica nenhum arquivo do jogo.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import http from 'node:http';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const clipsDir = join(__dirname, 'clips');
const previewsDir = join(__dirname, 'previews');
await mkdir(clipsDir, { recursive: true });
await mkdir(previewsDir, { recursive: true });

const GAME_PORT = 8197;
const UPLOAD_PORT = 8198;
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

  const audioDests = [];
  let audioCtxRef = null;
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

  const recCanvas = document.createElement('canvas');
  recCanvas.width = 1920;
  recCanvas.height = 1080;
  const recCtx = recCanvas.getContext('2d', { alpha: false });

  let recording = false;
  let rafId = 0;
  let startMs = 0;
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

  function tick() {
    if (!recording) return;
    drawGameFrame();
    rafId = requestAnimationFrame(tick);
  }

  function createAudioTrack() {
    try {
      const tracks = [];
      for (const d of audioDests) {
        const t = d.stream?.getAudioTracks?.()[0];
        if (t) tracks.push(t);
      }
      if (tracks.length > 0) return tracks[0];
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
    async start(clipBaseName) {
      chunks = [];
      startMs = performance.now();
      clipMeta = { clipBaseName };
      drawGameFrame();

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
      drawGameFrame();
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

  const debugPort = 9544 + Math.floor(Math.random() * 300);
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
      await sleep(150);
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

    async function mouseDrag(lx1, ly1, lx2, ly2, steps = 20, stepDelay = 20) {
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
      await sleep(45);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
    });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: INJECTED_RECORDER_SCRIPT });
    await send('Page.navigate', { url: BASE_URL });

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
    await sleep(350);

    // ------------------------------------------------------------------
    // CLIP 09: 09-floresta-esmeralda (Altar Esmeralda dobrando Quartzo + Rastro Verde + Anulação)
    // ------------------------------------------------------------------
    console.log('Recording 09-floresta-esmeralda...');
    await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      W.startWorldLevel('forest', 1, 6);
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.phase = 'gameplay';
      W.setupStep(2);
      window.TruePixelEngine.TutorialModal.close?.();
    })()`);
    await muteBgmKeepSfx();
    await sleep(250);
    await evalJS('window.__TeaserRecorder.start("09-floresta-esmeralda")');
    await sleep(350);

    const fWhite = await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      const p = W.pieces.find(x => x.id === 'fo1_2_q');
      const s = W.pieces.find(x => x.id === 'fo1_2_sq');
      return { px: p.x, py: p.y, ax: W.emeraldAltar.x, ay: W.emeraldAltar.y, sx: s.x, sy: s.y };
    })()`);
    await mouseDrag(fWhite.px, fWhite.py, fWhite.ax, fWhite.ay, 20, 20);
    await sleep(450);
    await evalJS('window.__TeaserRecorder.snapshot("09-esmeralda-a.png")');
    await mouseDrag(fWhite.ax, fWhite.ay, fWhite.sx, fWhite.sy, 20, 20);
    await sleep(450);

    const fRose = await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      const p = W.pieces.find(x => x.id === 'fo1_2_r');
      const s = W.pieces.find(x => x.id === 'fo1_2_sr');
      return p && s ? { px: p.x, py: p.y, ax: W.emeraldAltar.x, ay: W.emeraldAltar.y, sx: s.x, sy: s.y } : null;
    })()`);
    if (fRose) {
      await mouseDrag(fRose.px, fRose.py, fRose.ax, fRose.ay, 18, 20);
      await sleep(350);
      await mouseDrag(fRose.ax, fRose.ay, fRose.sx, fRose.sy, 18, 20);
      await sleep(500);
    }
    await evalJS('window.__TeaserRecorder.snapshot("09-esmeralda-b.png")');
    await sleep(600);
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));

    // ------------------------------------------------------------------
    // CLIP 10: 10-rio-fracoes-equacao (Plataforma Fracionária DIVIDIR! + Equação Cristalina)
    // ------------------------------------------------------------------
    console.log('Recording 10-rio-fracoes-equacao...');
    await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      W.startWorldLevel('river', 3, 13);
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.phase = 'gameplay';
      W.setupStep(1);
      window.TruePixelEngine.TutorialModal.close?.();
    })()`);
    await muteBgmKeepSfx();
    await sleep(250);
    await evalJS('window.__TeaserRecorder.start("10-rio-fracoes-equacao")');
    await sleep(400);

    const rioCoords = await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      const a3 = W.pieces.find(p => p.id === 'ri3_1_a3');
      const fp = W.fractionPlatform;
      return {
        ax: a3.x, ay: a3.y,
        fx: fp.x, fy: fp.y, fBot: fp.bottomY,
        eqX: W.pureEquation.x, eqY: W.pureEquation.y
      };
    })()`);
    await mouseDrag(rioCoords.ax, rioCoords.ay, rioCoords.fx, rioCoords.fBot, 18, 20);
    await sleep(450);
    await evalJS('window.__TeaserRecorder.snapshot("10-rio-fracao-a.png")');
    await mouseClick(rioCoords.fx, rioCoords.fy);
    await sleep(700);
    await mouseClick(rioCoords.eqX, rioCoords.eqY);
    await sleep(450);
    const resPiece = await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      const p = W.pieces.find(x => !x.shadow && !x.broken && x.type === 'aqua' && !x.inEquation);
      return p ? { px: p.x, py: p.y, eqX: W.pureEquation.x, eqY: W.pureEquation.y } : null;
    })()`);
    if (resPiece) {
      await mouseDrag(resPiece.px, resPiece.py, resPiece.eqX, resPiece.eqY, 18, 20);
      await sleep(550);
    }
    await evalJS('window.__TeaserRecorder.snapshot("10-rio-fracao-b.png")');
    await sleep(800);
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));

    // ------------------------------------------------------------------
    // CLIP 11: 11-caatinga-tesselacao (Retângulo & Losango de Tesselação + Anulação)
    // ------------------------------------------------------------------
    console.log('Recording 11-caatinga-tesselacao...');
    await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      W.startWorldLevel('caatinga', 3, 18);
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.phase = 'gameplay';
      W.setupStep(1);
      window.TruePixelEngine.TutorialModal.close?.();
    })()`);
    await muteBgmKeepSfx();
    await sleep(250);
    await evalJS('window.__TeaserRecorder.start("11-caatinga-tesselacao")');
    await sleep(300);

    const tess1 = await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      const q1 = W.pieces.find(p => p.id === 'ca3_1_sq1');
      const q2 = W.pieces.find(p => p.id === 'ca3_1_sq2');
      const sr = W.pieces.find(p => p.id === 'ca3_1_sr');
      return { x1: q1.x, y1: q1.y, x2: q2.x, y2: q2.y, sx: sr.x, sy: sr.y };
    })()`);
    await mouseDrag(tess1.x1, tess1.y1, tess1.x2, tess1.y2, 16, 18);
    await sleep(550);
    await evalJS('window.__TeaserRecorder.snapshot("11-caatinga-rect.png")');
    const rectMerged = await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      const p = W.pieces.find(x => !x.shadow && !x.broken);
      const s = W.pieces.find(x => x.shadow && !x.broken);
      return p && s ? { px: p.x, py: p.y, sx: s.x, sy: s.y } : null;
    })()`);
    if (rectMerged) {
      await mouseDrag(rectMerged.px, rectMerged.py, rectMerged.sx, rectMerged.sy, 18, 18);
      await sleep(750);
    }

    // Switch cleanly to Caatinga Level 4 Step 1 (Triangles -> Rhombus!)
    await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      W.startWorldLevel('caatinga', 4, 19);
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.phase = 'gameplay';
      W.setupStep(1);
      window.TruePixelEngine.TutorialModal.close?.();
    })()`);
    await muteBgmKeepSfx();
    await sleep(350);
    const tess2 = await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      const t1 = W.pieces.find(p => p.id === 'ca4_1_t1');
      const t2 = W.pieces.find(p => p.id === 'ca4_1_t2');
      const sr = W.pieces.find(p => p.id === 'ca4_1_sr1');
      return { x1: t1.x, y1: t1.y, x2: t2.x, y2: t2.y, sx: sr.x, sy: sr.y };
    })()`);
    await mouseDrag(tess2.x1, tess2.y1, tess2.x2, tess2.y2, 16, 18);
    await sleep(550);
    await evalJS('window.__TeaserRecorder.snapshot("11-caatinga-losango.png")');
    const rhombMerged = await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      const p = W.pieces.find(x => !x.shadow && !x.broken && x.shape === 'rhombus');
      const s = W.pieces.find(x => x.shadow && !x.broken && x.id === 'ca4_1_sr1');
      return p && s ? { px: p.x, py: p.y, sx: s.x, sy: s.y } : null;
    })()`);
    if (rhombMerged) {
      await mouseDrag(rhombMerged.px, rhombMerged.py, rhombMerged.sx, rhombMerged.sy, 18, 18);
      await sleep(750);
    }
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));

    // ------------------------------------------------------------------
    // CLIP 12: 12-caatinga-rodada6 (Desafio das Areias — embaralhamento rápido)
    // ------------------------------------------------------------------
    console.log('Recording 12-caatinga-rodada6...');
    await evalJS(`(() => {
      const W = window.TruePixelWorlds;
      W.startWorldLevel('caatinga', 5, 20);
      window.TruePixelEngine.IrisTransition.active = false;
      window.TruePixelEngine.DialogueBox.close?.();
      window.TruePixelEngine.TutorialModal.close?.();
      W.startShellGame();
      window.TruePixelEngine.TutorialModal.close?.();
      W.shellGame.calmMode = false;
      W.setupShellRound(4);
      W.phase = 'shell_game_show';
      W.phaseTime = 0.6;
    })()`);
    await muteBgmKeepSfx();
    await sleep(200);
    await evalJS('window.__TeaserRecorder.start("12-caatinga-rodada6")');
    await sleep(2200);
    await evalJS('window.__TeaserRecorder.snapshot("12-rodada-shuffle.png")');
    for (let w = 0; w < 35; w++) {
      const ph = await evalJS('window.TruePixelWorlds?.phase');
      if (ph === 'shell_game_pick') break;
      await sleep(160);
    }
    const winCupXY = await evalJS(`(() => {
      const sg = window.TruePixelWorlds?.shellGame;
      const cup = sg?.cups?.[sg.winningCup];
      return cup ? { x: cup.x, y: cup.y } : null;
    })()`);
    if (winCupXY) await mouseClick(winCupXY.x, winCupXY.y);
    await sleep(600);
    await evalJS('window.__TeaserRecorder.snapshot("12-rodada-reveal.png")');
    await sleep(600);
    results.push(await evalJS('window.__TeaserRecorder.stopAndUpload()'));

    ws.close();
  } finally {
    browserProc.kill();
    gameServer.kill();
    uploadServer.close();
    await sleep(300);
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }

  console.log('\n=== EXTRA CLIPS RECORDED (1920x1080 @ 60 FPS) ===');
  for (const r of results) {
    console.log(`- ${r.name}: ${(r.size / 1024).toFixed(1)} KB | ${r.durationMs}ms | ${r.mime}`);
  }
}

runCapture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
