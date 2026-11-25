#!/usr/bin/env node
/**
 * Builds the official 90.000s (5400 frames @ 60/1 CFR, 1920x1080, H.264/AAC)
 * Hollow Knight: Silksong-style trailer for:
 *   Crystal Math Mania — Sinfonia dos Cristais
 *
 * Strictly obeys:
 *  - ZERO AI-generated imagery or synthetic video
 *  - ONLY verified real gameplay music tracks (EXCLUDING final phase / external refs)
 *  - True Pixel Art nearest-neighbor scaling (flags=neighbor)
 *  - Two-pass EBU R128 loudness normalization (-14.0 LUFS, TP <= -1.2 dBTP)
 *  - All outputs written exclusively inside teaser-silksong-style/
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const segDir = join(__dirname, 'segments');
const audioDir = join(__dirname, 'audio');
mkdirSync(segDir, { recursive: true });
mkdirSync(audioDir, { recursive: true });

const OUT_MP4 = join(__dirname, 'Sinfonia-dos-Cristais-Trailer-Silksong-90s-1080p60.mp4');

// Guardrail: Forbidden audio tracks & forbidden AI-art paths
const FORBIDDEN_PATTERNS = [
  /o-que-um-cristal-pode-fazer/i,
  /era-uma-vez-ato1-amatore/i,
  /era-uma-vez-ato2-de-nada/i,
  /ai-art/i
];

function assertAllowedPath(p) {
  const s = String(p).replace(/\\/g, '/');
  for (const rx of FORBIDDEN_PATTERNS) {
    if (rx.test(s)) {
      throw new Error(`POLICY VIOLATION: Forbidden asset referenced -> ${s}`);
    }
  }
  const full = resolve(root, p);
  if (!existsSync(full)) {
    throw new Error(`Missing required asset: ${full}`);
  }
  return p;
}

function findRecursive(dir, target) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        const hit = findRecursive(full, target);
        if (hit) return hit;
      } else if (entry.toLowerCase() === target.toLowerCase()) {
        return full;
      }
    } catch {}
  }
  return null;
}

function findBinary(name) {
  const pkgRoot = join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  if (existsSync(pkgRoot)) {
    const dirs = readdirSync(pkgRoot).filter(d => d.startsWith('Gyan.FFmpeg'));
    for (const d of dirs) {
      const hit = findRecursive(join(pkgRoot, d), name);
      if (hit) return hit;
    }
  }
  return name;
}

const FFMPEG = findBinary('ffmpeg.exe');
const FFPROBE = findBinary('ffprobe.exe');

function runFfmpeg(args, label, captureStderr = false) {
  console.log(`\n>>> [FFmpeg] ${label}`);
  const res = spawnSync(FFMPEG, ['-hide_banner', '-y', ...args], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    throw new Error(`FFmpeg failed on: ${label} (exit ${res.status})`);
  }
  return captureStderr ? (res.stderr || '') : '';
}

function probeVideoMeta(filePath) {
  const out = execFileSync(FFPROBE, [
    '-v', 'error',
    '-count_frames',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=nb_read_frames,r_frame_rate,avg_frame_rate,width,height,pix_fmt',
    '-show_entries', 'format=duration',
    '-of', 'json',
    filePath
  ], { cwd: root, encoding: 'utf8' });
  const parsed = JSON.parse(out);
  const st = parsed.streams?.[0] || {};
  return {
    frames: Number(st.nb_read_frames || 0),
    rFrameRate: st.r_frame_rate,
    avgFrameRate: st.avg_frame_rate,
    width: st.width,
    height: st.height,
    pixFmt: st.pix_fmt,
    duration: parseFloat(parsed.format?.duration || '0')
  };
}

/**
 * Helper to apply timed RGBA PNG overlay with cubic ease-out vertical slide & alpha fades.
 */
function buildOverlayFilters(baseLabel, overlays, startInputIdx) {
  if (!overlays || overlays.length === 0) return { filters: [], finalLabel: baseLabel };
  const filters = [];
  let cur = baseLabel;
  overlays.forEach((ov, idx) => {
    const inIdx = startInputIdx + idx;
    const tLbl = `ovt${idx}`;
    const outLbl = `ov${idx}`;
    const fadeOutSt = Math.max(ov.in + 0.25, ov.out - 0.22).toFixed(3);
    const slideY = ov.slideY ?? 18;
    const slideDur = 0.26;
    filters.push(
      `[${inIdx}:v]format=rgba,fade=t=in:st=${ov.in}:d=0.22:alpha=1,fade=t=out:st=${fadeOutSt}:d=0.22:alpha=1[${tLbl}]`
    );
    const yExpr = slideY === 0
      ? '0'
      : `'if(lt(t,${(ov.in + slideDur).toFixed(3)}),round(${slideY}*pow(1-min(1,max(0,(t-${ov.in})/${slideDur})),3)),0)'`;
    filters.push(
      `[${cur}][${tLbl}]overlay=x=0:y=${yExpr}:eof_action=pass:shortest=1[${outLbl}]`
    );
    cur = outLbl;
  });
  return { filters, finalLabel: cur };
}

/**
 * Renders one segment (either single clip, concatenated micro-clips, solid color, or static card/menu zoom)
 * with exact integer frame count @ 60/1 CFR and nearest-neighbor pixel art scaling.
 */
function renderSegment(seg) {
  const outPath = join(segDir, `${seg.id}.mp4`);
  const args = [];
  const filters = [];
  const totalFrames = seg.frames;
  const durSec = (totalFrames / 60).toFixed(4);
  let nextInputIdx = 0;

  if (seg.kind === 'solid') {
    filters.push(
      `color=c=${seg.color}:s=1920x1080:r=60:d=${durSec},trim=end_frame=${totalFrames},settb=1/60,setpts=PTS-STARTPTS[base]`
    );
  } else if (seg.kind === 'menu_zoom') {
    assertAllowedPath(seg.imagePath);
    args.push('-i', seg.imagePath);
    nextInputIdx = 1;
    const denom = Math.max(1, totalFrames - 1);
    const zExpr = `1.0+0.045*(on/${denom})`;
    const xExpr = `iw/2-(iw/zoom/2)`;
    const yExpr = `ih/2-(ih/zoom/2)`;
    filters.push(
      `[0:v]scale=3840:2160:flags=neighbor,setsar=1,` +
      `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:fps=60:s=1920x1080,` +
      `fade=t=in:st=0:d=${seg.fadeIn || 0.14},fade=t=out:st=${((totalFrames / 60) - (seg.fadeOut || 0.22)).toFixed(3)}:d=${seg.fadeOut || 0.22},` +
      `trim=end_frame=${totalFrames},settb=1/60,setpts=PTS-STARTPTS[base]`
    );
  } else if (seg.kind === 'static_card') {
    assertAllowedPath(seg.imagePath);
    args.push('-framerate', '60', '-loop', '1', '-t', durSec, '-i', seg.imagePath);
    nextInputIdx = 1;
    const fIn = seg.fadeIn ? `,fade=t=in:st=0:d=${seg.fadeIn}` : '';
    const fOut = seg.fadeOut ? `,fade=t=out:st=${((totalFrames / 60) - seg.fadeOut).toFixed(3)}:d=${seg.fadeOut}` : '';
    filters.push(
      `[0:v]scale=1920:1080:flags=neighbor,setsar=1${fIn}${fOut},trim=end_frame=${totalFrames},settb=1/60,setpts=PTS-STARTPTS[base]`
    );
  } else if (seg.cuts) {
    const catLabels = [];
    seg.cuts.forEach((c, i) => {
      assertAllowedPath(c.clipPath);
      const cutDur = ((c.frames + 6) / 60).toFixed(3); // slight pad before exact trim=end_frame
      args.push('-ss', String(c.ss), '-t', cutDur, '-i', c.clipPath);
      filters.push(
        `[${i}:v:0]fps=60,scale=1920:1080:flags=neighbor,setsar=1,trim=end_frame=${c.frames},settb=1/60,setpts=PTS-STARTPTS[c${i}]`
      );
      catLabels.push(`[c${i}]`);
    });
    nextInputIdx = seg.cuts.length;
    filters.push(`${catLabels.join('')}concat=n=${seg.cuts.length}:v=1:a=0,trim=end_frame=${totalFrames},settb=1/60,setpts=PTS-STARTPTS[base]`);
  } else {
    assertAllowedPath(seg.clipPath);
    const padDur = ((totalFrames + 6) / 60).toFixed(3);
    args.push('-ss', String(seg.ss), '-t', padDur, '-i', seg.clipPath);
    nextInputIdx = 1;
    const fIn = seg.fadeIn ? `,fade=t=in:st=0:d=${seg.fadeIn}` : '';
    const fOut = seg.fadeOut ? `,fade=t=out:st=${((totalFrames / 60) - seg.fadeOut).toFixed(3)}:d=${seg.fadeOut}` : '';
    filters.push(
      `[0:v:0]fps=60,scale=1920:1080:flags=neighbor,setsar=1${fIn}${fOut},trim=end_frame=${totalFrames},settb=1/60,setpts=PTS-STARTPTS[base]`
    );
  }

  const overlays = seg.overlays || [];
  overlays.forEach(ov => {
    const ovPath = join('teaser-silksong-style/overlays', ov.file);
    assertAllowedPath(ovPath);
    args.push('-framerate', '60', '-loop', '1', '-t', durSec, '-i', ovPath);
  });

  const ovRes = buildOverlayFilters('base', overlays, nextInputIdx);
  filters.push(...ovRes.filters);
  filters.push(`[${ovRes.finalLabel}]format=yuv420p,setsar=1[vout]`);

  args.push(
    '-sws_flags', 'neighbor',
    '-filter_complex', filters.join(';'),
    '-map', '[vout]',
    '-frames:v', String(totalFrames),
    '-r', '60', '-fps_mode', 'cfr',
    '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:v', 'libx264', '-crf', '13', '-preset', 'fast', '-an',
    outPath
  );

  runFfmpeg(args, `${seg.id} (${totalFrames}f = ${(totalFrames / 60).toFixed(2)}s)`);
  const meta = probeVideoMeta(outPath);
  if (meta.frames !== totalFrames) {
    throw new Error(`Frame mismatch in ${seg.id}: got ${meta.frames}, expected ${totalFrames}`);
  }
  return outPath;
}

// =============================================================================
// 1. DEFINE ALL 19 SEGMENTS ACROSS 5 BLOCKS (TOTAL = 5400 FRAMES = 90.000s)
// =============================================================================
const BLOCKS = [
  {
    id: 'B01_act1',
    expectedFrames: 900,
    segments: [
      {
        id: 'S01', frames: 252, // 4.20s (0:00.00 - 0:04.20)
        clipPath: 'teaser/clips/01-menu-porta.mp4', ss: 0.00, fadeIn: 0.40
      },
      {
        id: 'S02', frames: 258, // 4.30s (0:04.20 - 0:08.50)
        clipPath: 'teaser/clips/02-mapa-jornada.mp4', ss: 0.00,
        overlays: [{ file: 'L01-mundos.png', in: 0.80, out: 3.80, slideY: 18 }]
      },
      {
        id: 'S03', frames: 222, // 3.70s (0:08.50 - 0:12.20)
        clipPath: 'teaser/clips/03-caverna-mecanicas.mp4', ss: 4.75
      },
      {
        id: 'S04', frames: 168, // 2.80s (0:12.20 - 0:15.00)
        cuts: [
          { clipPath: 'teaser/clips/03-caverna-mecanicas.mp4', ss: 0.35, frames: 60 },
          { clipPath: 'teaser/clips/03-caverna-mecanicas.mp4', ss: 2.95, frames: 108 }
        ],
        overlays: [{ file: 'L02-visual.png', in: 0.30, out: 2.60, slideY: 18 }]
      }
    ]
  },
  {
    id: 'B02_act2',
    expectedFrames: 1260,
    segments: [
      {
        id: 'S05', frames: 180, // 3.00s (0:15.00 - 0:18.00)
        clipPath: 'teaser/clips/03-caverna-mecanicas.mp4', ss: 1.55
      },
      {
        id: 'S06', frames: 210, // 3.50s (0:18.00 - 0:21.50)
        clipPath: 'teaser/clips/02-mapa-jornada.mp4', ss: 1.10,
        overlays: [{ file: 'P01-painel-floresta.png', in: 0.50, out: 3.30, slideY: 18 }]
      },
      {
        id: 'S07', frames: 198, // 3.30s (0:21.50 - 0:24.80)
        clipPath: 'teaser-silksong-style/clips/09-floresta-esmeralda.mp4', ss: 0.35,
        overlays: [{ file: 'L03-poder.png', in: 0.25, out: 3.05, slideY: 18 }]
      },
      {
        id: 'S08', frames: 282, // 4.70s (0:24.80 - 0:29.50)
        cuts: [
          { clipPath: 'teaser/clips/05-floresta-corte.mp4', ss: 3.35, frames: 96 },
          { clipPath: 'teaser/clips/05-floresta-corte.mp4', ss: 4.95, frames: 93 },
          { clipPath: 'teaser/clips/05-floresta-corte.mp4', ss: 6.55, frames: 93 }
        ]
      },
      {
        id: 'S09', frames: 183, // 3.05s (0:29.50 - 0:32.55)
        clipPath: 'teaser/clips/06-rio-melodia.mp4', ss: 0.10
      },
      {
        id: 'S10', frames: 207, // 3.45s (0:32.55 - 0:36.00)
        clipPath: 'teaser/clips/04-caverna-fada-ritmo.mp4', ss: 3.00,
        overlays: [{ file: 'L04-ritmo.png', in: 0.25, out: 3.05, slideY: -18 }]
      }
    ]
  },
  {
    id: 'B03_act3a',
    expectedFrames: 960,
    segments: [
      {
        id: 'S11', frames: 390, // 6.50s (0:36.00 - 0:42.50)
        cuts: [
          { clipPath: 'teaser/clips/06-rio-melodia.mp4', ss: 3.40, frames: 132 },
          { clipPath: 'teaser-silksong-style/clips/10-rio-fracoes-equacao.mp4', ss: 0.45, frames: 120 },
          { clipPath: 'teaser/clips/06-rio-melodia.mp4', ss: 6.65, frames: 138 }
        ],
        overlays: [{ file: 'L05-fracoes.png', in: 1.00, out: 4.20, slideY: 18 }]
      },
      {
        id: 'S12', frames: 360, // 6.00s (0:42.50 - 0:48.50)
        cuts: [
          { clipPath: 'teaser/clips/07-caatinga-areias.mp4', ss: 0.35, frames: 90 },
          { clipPath: 'teaser-silksong-style/clips/11-caatinga-tesselacao.mp4', ss: 0.80, frames: 90 },
          { clipPath: 'teaser-silksong-style/clips/11-caatinga-tesselacao.mp4', ss: 3.60, frames: 90 },
          { clipPath: 'teaser/clips/03-caverna-mecanicas.mp4', ss: 6.80, frames: 90 }
        ]
      },
      {
        id: 'S13', frames: 210, // 3.50s (0:48.50 - 0:52.00)
        clipPath: 'teaser/clips/02-mapa-jornada.mp4', ss: 3.05,
        overlays: [{ file: 'P02-painel-caatinga.png', in: 0.50, out: 3.30, slideY: 18 }]
      }
    ]
  },
  {
    id: 'B04_act3b_climax',
    expectedFrames: 1200,
    segments: [
      {
        id: 'S14', frames: 540, // 9.00s (0:52.00 - 1:01.00)
        cuts: [
          { clipPath: 'teaser/clips/07-caatinga-areias.mp4', ss: 3.15, frames: 84 },
          { clipPath: 'teaser/clips/07-caatinga-areias.mp4', ss: 4.60, frames: 78 },
          { clipPath: 'teaser/clips/07-caatinga-areias.mp4', ss: 5.95, frames: 72 },
          { clipPath: 'teaser/clips/07-caatinga-areias.mp4', ss: 7.20, frames: 69 },
          { clipPath: 'teaser-silksong-style/clips/12-caatinga-rodada6.mp4', ss: 2.50, frames: 60 },
          { clipPath: 'teaser/clips/07-caatinga-areias.mp4', ss: 8.90, frames: 57 },
          { clipPath: 'teaser/clips/07-caatinga-areias.mp4', ss: 10.10, frames: 60 },
          { clipPath: 'teaser-silksong-style/clips/12-caatinga-rodada6.mp4', ss: 7.80, frames: 60 }
        ],
        overlays: [{ file: 'L06-sinfonia.png', in: 1.00, out: 4.80, slideY: 18 }]
      },
      {
        id: 'S15', frames: 660, // 11.00s (1:01.00 - 1:12.00)
        cuts: [
          { clipPath: 'teaser/clips/04-caverna-fada-ritmo.mp4', ss: 0.70, frames: 51 },
          { clipPath: 'teaser/clips/05-floresta-corte.mp4', ss: 5.05, frames: 51 },
          { clipPath: 'teaser/clips/06-rio-melodia.mp4', ss: 4.60, frames: 51 },
          { clipPath: 'teaser-silksong-style/clips/12-caatinga-rodada6.mp4', ss: 5.00, frames: 51 },
          { clipPath: 'teaser/clips/03-caverna-mecanicas.mp4', ss: 3.55, frames: 45 },
          { clipPath: 'teaser-silksong-style/clips/09-floresta-esmeralda.mp4', ss: 4.15, frames: 45 },
          { clipPath: 'teaser/clips/06-rio-melodia.mp4', ss: 1.25, frames: 45 },
          { clipPath: 'teaser-silksong-style/clips/11-caatinga-tesselacao.mp4', ss: 4.75, frames: 45 },
          { clipPath: 'teaser/clips/08-porta-final-climax.mp4', ss: 0.35, frames: 66 },
          { clipPath: 'teaser/clips/08-porta-final-climax.mp4', ss: 2.10, frames: 66 },
          { clipPath: 'teaser/clips/08-porta-final-climax.mp4', ss: 5.20, frames: 72 },
          { clipPath: 'teaser/clips/08-porta-final-climax.mp4', ss: 7.90, frames: 72 }
        ]
      }
    ]
  },
  {
    id: 'B05_act4_finale',
    expectedFrames: 1080,
    segments: [
      {
        id: 'S16', frames: 36, // 0.60s (1:12.00 - 1:12.60 Silksong Breath)
        kind: 'solid', color: '#04020e'
      },
      {
        id: 'S17', frames: 264, // 4.40s (1:12.60 - 1:17.00 Monumental Reveal)
        kind: 'menu_zoom',
        imagePath: 'assets/story/interface/menu-aprovado.png',
        fadeIn: 0.14, fadeOut: 0.22,
        overlays: [{ file: 'L07-reveal-monumental.png', in: 0.15, out: 4.15, slideY: 16 }]
      },
      {
        id: 'S18', frames: 390, // 6.50s (1:17.00 - 1:23.50 Official Credits)
        kind: 'static_card',
        imagePath: 'teaser-silksong-style/cards/card-creditos-oficiais.png',
        fadeIn: 0.25, fadeOut: 0.25
      },
      {
        id: 'S19', frames: 390, // 6.50s (1:23.50 - 1:30.00 Exclusive QR Promo Card - NO ZOOM)
        kind: 'static_card',
        imagePath: 'teaser-silksong-style/card-publicidade-sinfonia-qr.png',
        fadeIn: 0.25, fadeOut: 0.40
      }
    ]
  }
];

console.log('=== STAGE 1: Render 19 segments & assemble 5 frame-exact CFR 60fps blocks ===');
const blockFiles = [];
let grandTotalFrames = 0;

for (const block of BLOCKS) {
  const segPaths = [];
  let sumFrames = 0;
  for (const seg of block.segments) {
    sumFrames += seg.frames;
    segPaths.push(renderSegment(seg));
  }
  if (sumFrames !== block.expectedFrames) {
    throw new Error(`Block ${block.id} sum=${sumFrames} != expected ${block.expectedFrames}`);
  }
  grandTotalFrames += sumFrames;

  const blockPath = join(segDir, `${block.id}.mp4`);
  const args = [];
  const catIn = [];
  segPaths.forEach((p, idx) => {
    args.push('-i', p);
    catIn.push(`[${idx}:v]settb=1/60,setpts=PTS-STARTPTS[b${idx}]`);
  });
  const catLabels = segPaths.map((_, idx) => `[b${idx}]`).join('');
  args.push(
    '-filter_complex', `${catIn.join(';')};${catLabels}concat=n=${segPaths.length}:v=1:a=0,format=yuv420p[vout]`,
    '-map', '[vout]',
    '-frames:v', String(block.expectedFrames),
    '-r', '60', '-fps_mode', 'cfr',
    '-c:v', 'libx264', '-crf', '13', '-preset', 'fast', '-an',
    blockPath
  );
  runFfmpeg(args, `Block ${block.id} (${block.expectedFrames}f = ${(block.expectedFrames / 60).toFixed(2)}s)`);
  const meta = probeVideoMeta(blockPath);
  if (meta.frames !== block.expectedFrames) {
    throw new Error(`Block ${block.id} frame check failed: got ${meta.frames}, expected ${block.expectedFrames}`);
  }
  console.log(`    Verified ${block.id}.mp4: ${meta.frames} frames (${meta.duration.toFixed(3)}s) @ ${meta.rFrameRate}`);
  blockFiles.push(blockPath);
}

if (grandTotalFrames !== 5400) {
  throw new Error(`Total frame count ${grandTotalFrames} != 5400`);
}

// =============================================================================
// 2. AUDIO MIX: 5 ALLOWED GAMEPLAY TRACKS + SAMPLE-ACCURATE WEBAUDIO SFX STEM
// =============================================================================
console.log('\n=== STAGE 2: Mix 5 allowed gameplay tracks + WebAudio SFX stem ===');

const MUSIC_INPUTS = [
  'assets/audio/musica-menu.mp3',              // 0: Act 1 (0:00 - 0:15)
  'assets/audio/musica-floresta-fases.mp3',    // 1: Act 2A (0:15 - 0:24.8)
  'assets/audio/musica-floresta-especial.mp3', // 2: Act 2B (0:24.8 - 0:36)
  'assets/audio/musica-rio-especial.mp3',      // 3: Act 3A (0:36 - 0:52)
  'assets/audio/musica-caatinga-especial.mp3'  // 4: Act 3B + Climax + Act 4 (0:52 - 1:30)
];
const SFX_WAV = 'teaser-silksong-style/audio/webaudio-sfx-90s.wav';

MUSIC_INPUTS.forEach(assertAllowedPath);
assertAllowedPath(SFX_WAV);

const rawMixWav = join(audioDir, 'master-raw-90s.wav');
const normMixWav = join(audioDir, 'master-norm-90s.wav');

// Crossfade timing check:
// m1: 15.25s -> xfade 0.50s => 14.75s..15.25s; total m12 = 15.25 + 10.30 - 0.50 = 25.05s
// m3: 11.65s -> xfade 0.45s => 24.60s..25.05s; total m123 = 25.05 + 11.65 - 0.45 = 36.25s
// m4: 16.50s -> xfade 0.50s => 35.75s..36.25s; total m1234 = 36.25 + 16.50 - 0.50 = 52.25s
// m5: 38.25s -> xfade 0.50s => 51.75s..52.25s; total = 52.25 + 38.25 - 0.50 = 90.00s!
// Inside m5, local time t corresponds to global trailer time (t + 51.75).
// Therefore Silksong Abrupt Breath [72.00s .. 72.60s] is local m5 t = [20.25s .. 20.85s].
const audioFilter = [
  `[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=start=3.20:duration=15.25,asetpts=PTS-STARTPTS,volume=+3.5dB,afade=t=in:st=0:d=0.40:curve=exp[m1]`,
  `[1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=start=0.50:duration=10.30,asetpts=PTS-STARTPTS,volume=-2.5dB[m2]`,
  `[2:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=start=7.55:duration=11.65,asetpts=PTS-STARTPTS,volume=+2.5dB[m3]`,
  `[3:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=start=7.60:duration=16.50,asetpts=PTS-STARTPTS,volume=+1.0dB[m4]`,
  `[4:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=start=14.55:duration=38.25,asetpts=PTS-STARTPTS,volume=+3.5dB,` +
  `volume='if(between(t,20.20,20.26),1-0.90*(t-20.20)/0.06,if(between(t,20.26,20.82),0.10,if(between(t,20.82,20.90),0.10+0.90*(t-20.82)/0.08,1.0)))':eval=frame[m5]`,
  `[m1][m2]acrossfade=d=0.50:c1=tri:c2=tri[m12]`,
  `[m12][m3]acrossfade=d=0.45:c1=tri:c2=tri[m123]`,
  `[m123][m4]acrossfade=d=0.50:c1=tri:c2=tri[m1234]`,
  `[m1234][m5]acrossfade=d=0.50:c1=tri:c2=tri,atrim=0:90.00,afade=t=out:st=88.20:d=1.80:curve=exp[music]`,
  `[5:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=0:90.00,volume=-1.0dB[sfx]`,
  `[music][sfx]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,atrim=0:90.00,afade=t=out:st=89.60:d=0.40[rawmix]`
].join(';');

runFfmpeg([
  ...MUSIC_INPUTS.flatMap(m => ['-i', m]),
  '-i', SFX_WAV,
  '-filter_complex', audioFilter,
  '-map', '[rawmix]',
  '-t', '90.000',
  '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le',
  rawMixWav
], 'Build 90s raw music + WebAudio SFX mix');

// Two-Pass Loudnorm (Target I = -14.0 LUFS, TP = -1.2 dBTP, LRA = 11 LU)
const pass1Log = runFfmpeg([
  '-i', rawMixWav,
  '-af', 'loudnorm=I=-14.0:TP=-1.2:LRA=11:print_format=json',
  '-f', 'null', 'NUL'
], 'Audio Loudnorm Pass 1 Analysis', true);

const jsonMatch = pass1Log.match(/\{[\s\S]*"input_i"[\s\S]*?\}/);
if (!jsonMatch) {
  throw new Error(`Could not parse loudnorm pass 1 JSON from FFmpeg stderr:\n${pass1Log}`);
}
const ln = JSON.parse(jsonMatch[0]);
console.log('    Pass 1 measured:', JSON.stringify(ln));

const pass2Filter = [
  `loudnorm=I=-14.0:TP=-1.2:LRA=11:linear=true:` +
  `measured_I=${ln.input_i}:measured_TP=${ln.input_tp}:measured_LRA=${ln.input_lra}:measured_thresh=${ln.input_thresh}:offset=${ln.target_offset}`,
  `alimiter=limit=-1.2dB:level=false:attack=3:release=50`,
  `atrim=0:90.000`
].join(',');

runFfmpeg([
  '-i', rawMixWav,
  '-af', pass2Filter,
  '-t', '90.000',
  '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le',
  normMixWav
], 'Audio Loudnorm Pass 2 Linear + Safety Limiter');

// =============================================================================
// 3. FINAL MASTER MUX (5400 FRAMES CFR + 48kHz AAC)
// =============================================================================
console.log('\n=== STAGE 3: Final Master Mux (1920x1080 @ 60fps H.264 + AAC) ===');

const muxArgs = [];
const vInLabels = [];
blockFiles.forEach((bf, i) => {
  muxArgs.push('-i', bf);
  vInLabels.push(`[${i}:v]`);
});
muxArgs.push('-i', normMixWav);

muxArgs.push(
  '-filter_complex', `${vInLabels.join('')}concat=n=${blockFiles.length}:v=1:a=0,format=yuv420p[vfinal]`,
  '-map', '[vfinal]',
  '-map', `${blockFiles.length}:a`,
  '-frames:v', '5400',
  '-t', '90.000',
  '-r', '60', '-fps_mode', 'cfr',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2', '-crf', '15', '-preset', 'medium',
  '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
  '-movflags', '+faststart',
  OUT_MP4
);

runFfmpeg(muxArgs, `Export Master -> ${OUT_MP4}`);
console.log(`\nSUCCESS! Exported official 90s trailer: ${OUT_MP4}`);
