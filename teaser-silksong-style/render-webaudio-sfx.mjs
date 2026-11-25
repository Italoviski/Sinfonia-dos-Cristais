#!/usr/bin/env node
/**
 * Renders a sample-accurate 90.000s stereo 48kHz WAV stem of authentic
 * gameplay WebAudio SFX (loaded directly from /js/audio.js into an OfflineAudioContext)
 * locked to every edit cut and beat transient across Acts 1-4.
 *
 * Output: teaser-silksong-style/audio/webaudio-sfx-90s.wav
 * Modifies nothing outside teaser-silksong-style/.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const audioDir = join(__dirname, 'audio');
await mkdir(audioDir, { recursive: true });

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
  '.js': 'application/javascript; charset=utf-8'
};

// Exact cut/transient cue schedule across 0.000s..90.000s
const SFX_CUES = [
  // Act 1 (0:00 - 0:15)
  { t: 0.25, fn: 'hover', args: [] },
  { t: 1.85, fn: 'click', args: [] },
  { t: 4.22, fn: 'tutorialOpen', args: [] },
  { t: 8.52, fn: 'quartzGrab', args: [] },
  { t: 9.22, fn: 'equationExpand', args: [] },
  { t: 12.22, fn: 'quartzMerge', args: [] },
  { t: 13.25, fn: 'shatter', args: [] },

  // Act 2 (0:15 - 0:36)
  { t: 15.02, fn: 'opalSubtract', args: [] },
  { t: 16.95, fn: 'shatter', args: [] },
  { t: 18.02, fn: 'click', args: [] },
  { t: 18.55, fn: 'starChime', args: [2] },
  { t: 21.52, fn: 'quartzGrab', args: [] },
  { t: 22.15, fn: 'quartzMerge', args: [] },
  { t: 23.40, fn: 'shatter', args: [] },
  { t: 24.80, fn: 'crystalSlice', args: [] },
  { t: 25.55, fn: 'comboChime', args: [2] },
  { t: 26.40, fn: 'crystalSlice', args: [] },
  { t: 27.10, fn: 'comboChime', args: [3] },
  { t: 27.95, fn: 'crystalSlice', args: [] },
  { t: 28.65, fn: 'comboChime', args: [4] },
  { t: 29.52, fn: 'fractionPinkGlow', args: [] },
  { t: 30.80, fn: 'fractionDivide', args: [] },
  { t: 31.85, fn: 'shatter', args: [] },
  { t: 32.57, fn: 'playRiverNote', args: [0] },
  { t: 33.65, fn: 'playRiverNote', args: [2] },
  { t: 34.75, fn: 'playRiverNote', args: [4] },

  // Act 3A (0:36 - 0:52)
  { t: 36.02, fn: 'playRiverNote', args: [0] },
  { t: 37.10, fn: 'playRiverNote', args: [2] },
  { t: 38.22, fn: 'fractionDivide', args: [] },
  { t: 40.22, fn: 'playRiverNote', args: [1] },
  { t: 40.95, fn: 'playRiverNote', args: [3] },
  { t: 41.70, fn: 'playRiverNote', args: [4] },
  { t: 42.52, fn: 'shapeMaterialize', args: [] },
  { t: 43.05, fn: 'shapeBanner', args: [] },
  { t: 44.02, fn: 'shapeSnap', args: [] },
  { t: 44.55, fn: 'shapeBanner', args: [] },
  { t: 45.52, fn: 'shapeSnap', args: [] },
  { t: 46.20, fn: 'shatter', args: [] },
  { t: 47.02, fn: 'equationShatter', args: [] },
  { t: 48.52, fn: 'click', args: [] },
  { t: 49.05, fn: 'starChime', args: [3] },

  // Act 3B + Climax Barrage (0:52 - 1:12)
  { t: 52.02, fn: 'opalGrab', args: [] },
  { t: 53.42, fn: 'sandSlide', args: [] },
  { t: 54.72, fn: 'sandSlide', args: [] },
  { t: 55.92, fn: 'sandSlide', args: [] },
  { t: 57.07, fn: 'sandSlide', args: [] },
  { t: 58.07, fn: 'cupStop', args: [] },
  { t: 59.02, fn: 'shellHit', args: [] },
  { t: 60.02, fn: 'starChime', args: [3] },
  { t: 61.00, fn: 'starChime', args: [1] },
  { t: 61.85, fn: 'crystalSlice', args: [] },
  { t: 62.70, fn: 'playRiverNote', args: [3] },
  { t: 63.55, fn: 'sandSlide', args: [] },
  { t: 64.40, fn: 'shatter', args: [] },
  { t: 65.15, fn: 'comboChime', args: [4] },
  { t: 65.90, fn: 'fractionDivide', args: [] },
  { t: 66.65, fn: 'shapeMaterialize', args: [] },
  { t: 67.40, fn: 'reward', args: [4] },
  { t: 68.50, fn: 'ceilingShatter', args: [] },
  { t: 69.60, fn: 'victoryFanfare', args: [] },
  { t: 70.80, fn: 'worldFinaleFanfare', args: [] },

  // Act 4 (1:12 - 1:30)
  { t: 72.02, fn: 'starChime', args: [2] },
  { t: 72.60, fn: 'equationMagnetic', args: [] },
  { t: 73.10, fn: 'worldFinaleFanfare', args: [] },
  { t: 77.05, fn: 'tutorialOpen', args: [] },
  { t: 83.55, fn: 'starChime', args: [3] }
];

function startServer(port, uploadDoneResolve) {
  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
  window.__schedTime = 0;
  const RealOffline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oac = new RealOffline(2, 48000 * 90, 48000);
  window.__oac = oac;
  const proxyCtx = new Proxy(oac, {
    get(target, prop) {
      if (prop === 'currentTime') return window.__schedTime;
      if (prop === 'state') return 'running';
      if (prop === 'resume') return () => Promise.resolve();
      const val = Reflect.get(target, prop, target);
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });
  window.AudioContext = function() { return proxyCtx; };
  window.webkitAudioContext = window.AudioContext;
</script>
<script src="/js/audio.js"></script>
</body>
</html>`;

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (reqPath === '/sfx-render.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    if (req.method === 'POST' && reqPath === '/upload-wav') {
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      const buf = Buffer.concat(chunks);
      const outPath = join(audioDir, 'webaudio-sfx-90s.wav');
      await writeFile(outPath, buf);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, size: buf.length, outPath }));
      uploadDoneResolve({ size: buf.length, outPath });
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
  if (!browserPath) throw new Error('Edge/Chrome not found');

  let resolveUpload;
  const uploadPromise = new Promise(r => { resolveUpload = r; });
  const port = 8200;
  const server = await startServer(port, resolveUpload);
  const userDataDir = join(__dirname, `.tmp-sfx-${process.pid}`);
  await mkdir(userDataDir, { recursive: true });
  const cdpPort = 9264;

  const browserProc = spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--autoplay-policy=no-user-gesture-required',
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
    const loadDone = new Promise(r => { onLoadResolve = r; });
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/sfx-render.html` });
    await Promise.race([loadDone, new Promise(r => setTimeout(r, 5000))]);

    const cuesJson = JSON.stringify(SFX_CUES);
    const renderInfo = await send('Runtime.evaluate', {
      expression: `(async () => {
        window.__schedTime = 0;
        window.CrystalAudio.unlock();
        window.CrystalAudio.setEnabled(true);
        window.CrystalAudio.setVolume(0.92);

        const cues = ${cuesJson};
        let fired = 0;
        for (const c of cues) {
          window.__schedTime = c.t;
          if (typeof window.CrystalAudio[c.fn] === 'function') {
            window.CrystalAudio[c.fn](...(c.args || []));
            fired++;
          } else {
            throw new Error('Missing SFX method: ' + c.fn);
          }
        }

        const buf = await window.__oac.startRendering();
        const numCh = buf.numberOfChannels;
        const sr = buf.sampleRate;
        const len = buf.length;
        const ch0 = buf.getChannelData(0);
        const ch1 = numCh > 1 ? buf.getChannelData(1) : ch0;

        let peak = 0;
        const dataBytes = len * 2 * 2;
        const ab = new ArrayBuffer(44 + dataBytes);
        const dv = new DataView(ab);
        const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
        writeStr(0, 'RIFF');
        dv.setUint32(4, 36 + dataBytes, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        dv.setUint32(16, 16, true);
        dv.setUint16(20, 1, true);
        dv.setUint16(22, 2, true);
        dv.setUint32(24, sr, true);
        dv.setUint32(28, sr * 4, true);
        dv.setUint16(32, 4, true);
        dv.setUint16(34, 16, true);
        writeStr(36, 'data');
        dv.setUint32(40, dataBytes, true);

        let offset = 44;
        for (let i = 0; i < len; i++) {
          const l = Math.max(-1, Math.min(1, ch0[i]));
          const r = Math.max(-1, Math.min(1, ch1[i]));
          const ap = Math.max(Math.abs(l), Math.abs(r));
          if (ap > peak) peak = ap;
          dv.setInt16(offset, Math.round(l * 32767), true);
          dv.setInt16(offset + 2, Math.round(r * 32767), true);
          offset += 4;
        }

        const resp = await fetch('/upload-wav', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: ab
        });
        const up = await resp.json();
        return { fired, length: len, sr, peak: Number(peak.toFixed(4)), uploaded: up };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    if (renderInfo.exceptionDetails) {
      throw new Error(renderInfo.exceptionDetails.exception?.description || renderInfo.exceptionDetails.text);
    }
    await uploadPromise;
    console.log('WebAudio SFX 90s WAV rendered:', JSON.stringify(renderInfo.result?.value));
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
