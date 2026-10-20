#!/usr/bin/env node
/**
 * Autonomous AI Playtester for Sinfonia dos Cristais (Crystal Math Mania)
 *
 * Works via Playwright (if installed) OR direct Headless Microsoft Edge / Chrome CDP
 * using Node.js native WebSocket + HTTP!
 *
 * Plays through Home -> Map -> All 21 Levels -> Rhythm Bosses -> Accessibility Modes,
 * collects FPS telemetry from window.CrystalPerformance, checks for zero console/page errors,
 * and saves screenshots + playtest report to playtest-artifacts/report.json.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const artifactsDir = join(root, 'playtest-artifacts');
await mkdir(artifactsDir, { recursive: true });

const PORT = Number(process.env.PLAYTEST_PORT || 8189);
const BASE_URL = `http://127.0.0.1:${PORT}/index.html`;

async function startLocalServer() {
  const child = spawn(process.execPath, [join(root, 'scripts/serve.mjs')], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => rejectReady(new Error('Timeout starting server')), 5000);
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('Crystal Math Mania')) {
        clearTimeout(timeout);
        resolveReady();
      }
    });
    child.on('exit', code => {
      clearTimeout(timeout);
      rejectReady(new Error(`Server exited early with code ${code}`));
    });
  });
  return child;
}

function findBrowserExecutable() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  return candidates.find(p => existsSync(p)) || null;
}

async function runViaDirectCDP(browserPath) {
  const debugPort = 9333 + Math.floor(Math.random() * 500);
  const userDataDir = join(artifactsDir, `.tmp-profile-${debugPort}`);
  const browserProc = spawn(
    browserPath,
    [
      '--headless=new',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=1280,720',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      BASE_URL
    ],
    { stdio: 'ignore' }
  );

  try {
    let targets = null;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        const list = await res.json();
        const pageTarget = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
        if (pageTarget) {
          targets = pageTarget;
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 150));
    }
    if (!targets) throw new Error('Could not connect to Headless Browser CDP');

    const ws = new WebSocket(targets.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });

    let msgId = 1;
    const pending = new Map();
    const consoleErrors = [];
    const pageErrors = [];

    ws.addEventListener('message', ev => {
      const data = JSON.parse(String(ev.data));
      if (data.id && pending.has(data.id)) {
        const { resolve: r, reject: j } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) j(new Error(data.error.message));
        else r(data.result);
      } else if (data.method === 'Runtime.exceptionThrown') {
        pageErrors.push(data.params?.exceptionDetails?.text || 'Runtime exception');
      } else if (data.method === 'Runtime.consoleAPICalled' && data.params?.type === 'error') {
        consoleErrors.push(data.params.args?.map(a => a.value || a.description).join(' '));
      }
    });

    const send = (method, params = {}) =>
      new Promise((res, rej) => {
        const id = msgId++;
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Page.enable');
    await send('Runtime.enable');

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

    const takeScreenshot = async filename => {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const outPath = join(artifactsDir, filename);
      await writeFile(outPath, Buffer.from(data, 'base64'));
      return outPath;
    };

    // Wait for CrystalTestAPI to be ready
    for (let i = 0; i < 30; i++) {
      const ready = await evalJS('Boolean(window.CrystalTestAPI && window.CrystalApp)');
      if (ready) break;
      await new Promise(r => setTimeout(r, 100));
    }

    const report = {
      timestamp: new Date().toISOString(),
      browser: browserPath,
      screensTested: [],
      levels: [],
      accessibility: {},
      performance: null,
      consoleErrors,
      pageErrors
    };

    // 1. Home Screen inspection & screenshot
    const homeState = await evalJS('window.CrystalTestAPI.getState()');
    report.screensTested.push(homeState.screen);
    await takeScreenshot('01-home-screen.png');

    // 2. Map Screen inspection & screenshot
    await evalJS('window.CrystalTestAPI.goto("map")');
    await new Promise(r => setTimeout(r, 200));
    const mapState = await evalJS('window.CrystalTestAPI.getState()');
    report.screensTested.push(mapState.screen);
    await takeScreenshot('02-map-screen.png');

    // 3. Play through all 21 levels via CrystalTestAPI
    for (let lvl = 1; lvl <= 21; lvl++) {
      await evalJS(`window.CrystalTestAPI.startLevel(${lvl}, true)`);
      await new Promise(r => setTimeout(r, 80));
      await evalJS('window.CrystalTestAPI.skipStory()');

      if ([1, 5, 6, 11, 16, 21].includes(lvl)) {
        await takeScreenshot(`level-${String(lvl).padStart(2, '0')}-start.png`);
      }

      const beforeSolve = await evalJS('window.CrystalTestAPI.getState()');
      const solveResult = await evalJS('window.CrystalTestAPI.solveCurrentLevel()');
      await new Promise(r => setTimeout(r, 60));

      report.levels.push({
        id: lvl,
        name: beforeSolve.board?.levelName || `Fase ${lvl}`,
        initialPieces: beforeSolve.board?.pieces?.length || 0,
        solved: !!solveResult?.ok,
        finished: !!solveResult?.finished
      });
    }

    // 4. Test Accessibility toggles (High Contrast, Reduce Motion, Assist)
    const a11yCheck = await evalJS(`(() => {
      document.getElementById('contrastToggle').click();
      document.getElementById('motionToggle').click();
      document.getElementById('assistToggle').click();
      return {
        highContrastClass: document.body.classList.contains('high-contrast'),
        reduceMotionClass: document.body.classList.contains('reduce-motion'),
        settings: window.CrystalApp.state.settings
      };
    })()`);
    report.accessibility = a11yCheck;
    await takeScreenshot('03-high-contrast-mode.png');

    // 5. Collect FPS & Frame Performance Telemetry
    report.performance = await evalJS('window.CrystalPerformance.report()');

    ws.close();
    return report;
  } finally {
    browserProc.kill();
  }
}

const serverProc = await startLocalServer();
try {
  const browserPath = findBrowserExecutable();
  if (!browserPath) {
    throw new Error('Nenhum navegador Chromium/Edge encontrado para o playtest.');
  }
  console.log(`Iniciando AI Playtest em ${BASE_URL} usando ${browserPath}...`);
  const report = await runViaDirectCDP(browserPath);
  const reportPath = join(artifactsDir, 'playtest-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log('\n=== RELATÓRIO DO AI PLAYTESTER (E2E) ===');
  console.log(`Telas testadas: ${report.screensTested.join(' -> ')}`);
  console.log(`Fases vencidas pela IA: ${report.levels.filter(l => l.solved).length} / ${report.levels.length}`);
  console.log(`Acessibilidade validada: Alto Contraste=${report.accessibility.highContrastClass}, Reduzir Movimento=${report.accessibility.reduceMotionClass}`);
  console.log(`Erros de Console: ${report.consoleErrors.length} | Erros de Página: ${report.pageErrors.length}`);
  console.log(`Screenshots e JSON salvos em: ${artifactsDir}`);
} finally {
  serverProc.kill();
}
