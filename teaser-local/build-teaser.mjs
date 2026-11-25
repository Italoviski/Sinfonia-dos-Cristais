#!/usr/bin/env node
/**
 * Builds the 60s 1920x1080 @ 60 FPS hybrid teaser for Sinfonia dos Cristais
 * inside teaser-local/ using local FFmpeg, bespoke pixel art, 8 real 60 FPS
 * gameplay clips, 12 high-impact kinetic title plates, and original audio.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const segDir = join(__dirname, 'segments');
const outMp4 = join(__dirname, 'Sinfonia-dos-Cristais-Teaser-60s-1080p60.mp4');

function findBinary(name) {
  const pkgRoot = join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  if (existsSync(pkgRoot)) {
    const dirs = readdirSync(pkgRoot).filter(d => d.startsWith('Gyan.FFmpeg'));
    for (const d of dirs) {
      const candidate = findRecursive(join(pkgRoot, d), name);
      if (candidate) return candidate;
    }
  }
  const winApps = join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', name);
  if (existsSync(winApps)) return winApps;
  return name;
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

const FFMPEG = findBinary('ffmpeg.exe');
const FFPROBE = findBinary('ffprobe.exe');

function runFfmpeg(args, label) {
  console.log(`\n>>> [FFmpeg] ${label}`);
  const res = spawnSync(FFMPEG, ['-hide_banner', '-y', ...args], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    throw new Error(`FFmpeg failed on: ${label} (exit ${res.status})`);
  }
}

function probeDuration(filePath) {
  const out = execFileSync(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    filePath
  ], { cwd: root, encoding: 'utf8' });
  return parseFloat(out.trim());
}

/**
 * Helper to build filter_complex for one or two timed RGBA title plates
 * with smooth cubic ease-out slide-up and alpha fade in/out.
 */
function buildTitleOverlayChain(baseLabel, titleSpecs, inputStartIdx, segDur) {
  if (!titleSpecs || titleSpecs.length === 0) return { filters: [], finalLabel: baseLabel };
  const filters = [];
  let cur = baseLabel;
  titleSpecs.forEach((t, idx) => {
    const inIdx = inputStartIdx + idx;
    const tLabel = `tit${idx}`;
    const outLabel = `ov${idx}`;
    const fadeOutStart = Math.max(t.in + 0.3, t.out - 0.25);
    const slideY = t.slideY ?? 28;
    const slideDur = 0.28;
    filters.push(
      `[${inIdx}:v]format=rgba,fade=t=in:st=${t.in}:d=0.25:alpha=1,fade=t=out:st=${fadeOutStart.toFixed(3)}:d=0.25:alpha=1[${tLabel}]`
    );
    const yExpr = slideY === 0
      ? '0'
      : `'if(lt(t,${(t.in + slideDur).toFixed(3)}),round(${slideY}*pow(1-min(1,max(0,(t-${t.in})/${slideDur})),3)),0)'`;
    filters.push(
      `[${cur}][${tLabel}]overlay=x=0:y=${yExpr}:eof_action=pass:shortest=1[${outLabel}]`
    );
    cur = outLabel;
  });
  return { filters, finalLabel: cur };
}

function renderArtSegment(cfg) {
  const frames = Math.round(cfg.dur * 60);
  const denom = Math.max(1, frames - 1);
  let zExpr, xExpr, yExpr;
  if (cfg.motion === 'zoom_out') {
    zExpr = `1.10-0.10*(on/${denom})`;
    xExpr = `iw/2-(iw/zoom/2)`;
    yExpr = `ih/2-(ih/zoom/2)`;
  } else if (cfg.motion === 'pan_zoom') {
    zExpr = `1.0+0.10*(on/${denom})`;
    xExpr = `clip(iw/2-(iw/zoom/2)+34*((on/${denom})-0.5),0,iw-iw/zoom)`;
    yExpr = `ih/2-(ih/zoom/2)`;
  } else {
    const depth = cfg.zoomDepth ?? 0.11;
    zExpr = `1.0+${depth}*(on/${denom})`;
    xExpr = `iw/2-(iw/zoom/2)`;
    yExpr = `ih/2-(ih/zoom/2)`;
  }

  const args = ['-i', cfg.artPath];
  const titles = cfg.titles || [];
  for (const t of titles) {
    args.push('-framerate', '60', '-loop', '1', '-t', String(cfg.dur), '-i', join(__dirname, 'titles', t.file));
  }

  const vig = cfg.noVignette ? '' : ',vignette=PI/5';
  const fadeIn = cfg.fadeInFromBlack ? `,fade=t=in:st=0:d=${cfg.fadeInFromBlack}` : '';
  const fadeOut = cfg.fadeOutToBlack ? `,fade=t=out:st=${(cfg.dur - cfg.fadeOutToBlack).toFixed(3)}:d=${cfg.fadeOutToBlack}` : '';

  const filters = [
    `[0:v]scale=3840:2160:force_original_aspect_ratio=increase:flags=lanczos,crop=3840:2160,setsar=1,` +
    `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:fps=60:s=1920x1080` +
    `${vig}${fadeIn}${fadeOut},settb=1/60,setpts=PTS-STARTPTS[base]`
  ];

  const ov = buildTitleOverlayChain('base', titles, 1, cfg.dur);
  filters.push(...ov.filters);
  filters.push(`[${ov.finalLabel}]format=yuv420p,setsar=1[vout]`);

  const outFile = join(segDir, `${cfg.id}.mp4`);
  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '[vout]',
    '-t', String(cfg.dur),
    '-r', '60', '-fps_mode', 'cfr',
    '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', '-an',
    outFile
  );
  runFfmpeg(args, `${cfg.id} (${cfg.dur}s Art 2.5D)`);
}

function renderGameplaySegment(cfg) {
  const args = [];
  if (cfg.cuts) {
    for (const c of cfg.cuts) {
      args.push('-ss', String(c.ss), '-t', String(c.t), '-i', c.clipPath);
    }
  } else {
    args.push('-ss', String(cfg.ss), '-t', String(cfg.dur), '-i', cfg.clipPath);
  }

  const titleStartIdx = cfg.cuts ? cfg.cuts.length : 1;
  const titles = cfg.titles || [];
  for (const t of titles) {
    args.push('-framerate', '60', '-loop', '1', '-t', String(cfg.dur), '-i', join(__dirname, 'titles', t.file));
  }

  const filters = [];
  if (cfg.cuts) {
    const catLabels = [];
    cfg.cuts.forEach((c, idx) => {
      filters.push(
        `[${idx}:v:0]fps=60,scale=1920:1080:flags=neighbor,setsar=1,settb=1/60,setpts=PTS-STARTPTS[c${idx}]`
      );
      catLabels.push(`[c${idx}]`);
    });
    filters.push(`${catLabels.join('')}concat=n=${cfg.cuts.length}:v=1:a=0,settb=1/60,setpts=PTS-STARTPTS[base]`);
  } else {
    filters.push(
      `[0:v:0]fps=60,scale=1920:1080:flags=neighbor,setsar=1,settb=1/60,setpts=PTS-STARTPTS[base]`
    );
  }

  const ov = buildTitleOverlayChain('base', titles, titleStartIdx, cfg.dur);
  filters.push(...ov.filters);
  filters.push(`[${ov.finalLabel}]format=yuv420p,setsar=1[vout]`);

  const outFile = join(segDir, `${cfg.id}.mp4`);
  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '[vout]',
    '-t', String(cfg.dur),
    '-r', '60', '-fps_mode', 'cfr',
    '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', '-an',
    outFile
  );
  runFfmpeg(args, `${cfg.id} (${cfg.dur}s Gameplay)`);
}

// =========================================================================
// Stage 4A: 13 Exact Segments (Total raw = 63.40s; 12 xfades = 3.40s => 60.00s)
// =========================================================================
const SEGMENTS = [
  {
    id: 'S01', type: 'art', dur: 4.50,
    artPath: 'teaser-local/ai-art/01-hook-porta.png',
    motion: 'zoom_in', zoomDepth: 0.11, fadeInFromBlack: 0.35,
    titles: [{ file: 'T01-hook.png', in: 0.35, out: 4.15, slideY: 20 }]
  },
  {
    id: 'S02', type: 'game', dur: 3.10,
    clipPath: 'teaser/clips/01-menu-porta.mp4', ss: 0.00,
    titles: [{ file: 'T02-sem-contas.png', in: 0.25, out: 2.90 }]
  },
  {
    id: 'S03', type: 'game', dur: 1.80,
    clipPath: 'teaser/clips/02-mapa-jornada.mp4', ss: 0.20,
    titles: []
  },
  {
    id: 'S04', type: 'game', dur: 4.70,
    clipPath: 'teaser/clips/03-caverna-mecanicas.mp4', ss: 0.20,
    titles: [{ file: 'T03-funda.png', in: 0.35, out: 4.35 }]
  },
  {
    id: 'S05', type: 'game', dur: 2.90,
    clipPath: 'teaser/clips/04-caverna-fada-ritmo.mp4', ss: 3.30,
    titles: [{ file: 'T04-caverna.png', in: 0.25, out: 2.65 }]
  },
  {
    id: 'S06', type: 'art', dur: 2.65,
    artPath: 'teaser-local/ai-art/02-bioma-floresta-rio.png',
    motion: 'pan_zoom',
    titles: [{ file: 'T05-floresta-card.png', in: 0.15, out: 2.40, slideY: 16 }]
  },
  {
    id: 'S07', type: 'game', dur: 7.60,
    clipPath: 'teaser/clips/05-floresta-corte.mp4', ss: 0.30,
    titles: [{ file: 'T06-corte.png', in: 2.80, out: 7.20 }]
  },
  {
    id: 'S08', type: 'game', dur: 8.90,
    clipPath: 'teaser/clips/06-rio-melodia.mp4', ss: 0.10,
    titles: [
      { file: 'T07A-fracoes.png', in: 0.40, out: 4.00 },
      { file: 'T07B-rio.png', in: 4.50, out: 8.50 }
    ]
  },
  {
    id: 'S09', type: 'art', dur: 2.70,
    artPath: 'teaser-local/ai-art/03-bioma-caatinga.png',
    motion: 'zoom_in', zoomDepth: 0.10,
    titles: [{ file: 'T08-caatinga-card.png', in: 0.15, out: 2.45, slideY: 16 }]
  },
  {
    id: 'S10', type: 'game', dur: 9.40,
    cuts: [
      { clipPath: 'teaser/clips/07-caatinga-areias.mp4', ss: 0.30, t: 3.30 },
      { clipPath: 'teaser/clips/07-caatinga-areias.mp4', ss: 5.20, t: 6.10 }
    ],
    titles: [{ file: 'T09-acelere.png', in: 4.00, out: 8.95 }]
  },
  {
    id: 'S11', type: 'art', dur: 2.80,
    artPath: 'teaser-local/ai-art/04-climax-sinfonia.png',
    motion: 'zoom_out',
    titles: [{ file: 'T10-gemas-card.png', in: 0.15, out: 2.55, slideY: 16 }]
  },
  {
    id: 'S12', type: 'game', dur: 7.35,
    clipPath: 'teaser/clips/08-porta-final-climax.mp4', ss: 1.40,
    titles: [{ file: 'T11-assinatura.png', in: 2.70, out: 7.05, slideY: -22 }]
  },
  {
    id: 'S13', type: 'art', dur: 5.00,
    artPath: 'teaser/cards/encerramento-uneb.png',
    motion: 'zoom_in', zoomDepth: 0.03, noVignette: true, fadeOutToBlack: 0.50,
    titles: []
  }
];

const segFilterArg = process.argv.find(a => a.startsWith('--segments='));
const onlySegs = segFilterArg ? new Set(segFilterArg.slice('--segments='.length).split(',').map(s => s.trim())) : null;

console.log('=== STAGE 4A: Rendering CFR 60 FPS segments ===');
for (const seg of SEGMENTS) {
  const segPath = join(segDir, `${seg.id}.mp4`);
  if (onlySegs && !onlySegs.has(seg.id) && existsSync(segPath)) {
    console.log(`    reusing ${seg.id}.mp4`);
    continue;
  }
  if (seg.type === 'art') renderArtSegment(seg);
  else renderGameplaySegment(seg);
  const actual = probeDuration(segPath);
  console.log(`    verified ${seg.id}.mp4 duration = ${actual.toFixed(3)}s (target ${seg.dur.toFixed(2)}s)`);
}

// =========================================================================
// Stage 4B: Assemble Master Video xfade Chain + 4-Biome Audio Medley + SFX
// =========================================================================
console.log('\n=== STAGE 4B: Master xfade assembly + 4-biome audio mix ===');

const XFADES = [
  { transition: 'dissolve',   duration: 0.30, offset: 4.20 },
  { transition: 'fade',       duration: 0.25, offset: 7.05 },
  { transition: 'fade',       duration: 0.20, offset: 8.65 },
  { transition: 'fade',       duration: 0.20, offset: 13.15 },
  { transition: 'fadewhite',  duration: 0.35, offset: 15.70 },
  { transition: 'smoothleft', duration: 0.25, offset: 18.10 },
  { transition: 'fadewhite',  duration: 0.30, offset: 25.40 },
  { transition: 'fadewhite',  duration: 0.30, offset: 34.00 },
  { transition: 'smoothleft', duration: 0.25, offset: 36.45 },
  { transition: 'fadewhite',  duration: 0.35, offset: 45.50 },
  { transition: 'fadewhite',  duration: 0.30, offset: 48.00 },
  { transition: 'fadeblack',  duration: 0.35, offset: 55.00 }
];

const masterArgs = [];
// Inputs 0..12: video segments S01..S13
for (const seg of SEGMENTS) {
  masterArgs.push('-i', join(segDir, `${seg.id}.mp4`));
}

// Inputs 13..16: 4 original biome music tracks
const MUSIC_INPUTS = [
  'assets/audio/era-uma-vez-ato1-amatore.mp3',   // idx 13
  'assets/audio/musica-floresta-especial.mp3',   // idx 14
  'assets/audio/musica-rio-especial.mp3',        // idx 15
  'assets/audio/musica-caatinga-especial.mp3'    // idx 16
];
for (const m of MUSIC_INPUTS) masterArgs.push('-i', m);

// Inputs 17..23: real gameplay clips for aligned WebAudio SFX
const SFX_SPECS = [
  { clip: 'teaser/clips/03-caverna-mecanicas.mp4', ss: 0.20, t: 4.70, delayMs: 8650 },   // idx 17 -> S04
  { clip: 'teaser/clips/04-caverna-fada-ritmo.mp4', ss: 3.30, t: 2.90, delayMs: 13150 }, // idx 18 -> S05
  { clip: 'teaser/clips/05-floresta-corte.mp4', ss: 0.30, t: 7.60, delayMs: 18100 },     // idx 19 -> S07
  { clip: 'teaser/clips/06-rio-melodia.mp4', ss: 0.10, t: 8.90, delayMs: 25400 },        // idx 20 -> S08
  { clip: 'teaser/clips/07-caatinga-areias.mp4', ss: 0.30, t: 3.30, delayMs: 36450 },    // idx 21 -> S10a
  { clip: 'teaser/clips/07-caatinga-areias.mp4', ss: 5.20, t: 6.10, delayMs: 39750 },    // idx 22 -> S10b
  { clip: 'teaser/clips/08-porta-final-climax.mp4', ss: 1.40, t: 7.35, delayMs: 48000 }  // idx 23 -> S12
];
for (const s of SFX_SPECS) {
  masterArgs.push('-ss', String(s.ss), '-t', String(s.t), '-i', s.clip);
}

const masterFilter = [];

// 1. Chain 13 video streams via xfade
let vCur = '0:v';
XFADES.forEach((xf, i) => {
  const nextIn = `${i + 1}:v`;
  const outLbl = i === XFADES.length - 1 ? 'vfinal_raw' : `vx${i}`;
  masterFilter.push(
    `[${vCur}][${nextIn}]xfade=transition=${xf.transition}:duration=${xf.duration}:offset=${xf.offset}[${outLbl}]`
  );
  vCur = outLbl;
});
masterFilter.push(`[${vCur}]format=yuv420p[vfinal]`);

// 2. Music medley with smooth equal-power crossfades & pre-climax breath
masterFilter.push(
  `[13:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=start=8.86:duration=16.00,asetpts=PTS-STARTPTS,volume=-4.0dB,afade=t=in:st=0:d=0.30:curve=exp[m1]`,
  `[14:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=start=8.14:duration=10.30,asetpts=PTS-STARTPTS,volume=+3.0dB[m2]`,
  `[15:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=start=18.42:duration=9.20,asetpts=PTS-STARTPTS,volume=+1.5dB[m3]`,
  `[16:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=start=10.34:duration=26.60,asetpts=PTS-STARTPTS,volume=+3.5dB,` +
  `volume='if(between(t,11.15,11.30),1-0.68*(t-11.15)/0.15,if(between(t,11.30,11.65),0.32,if(between(t,11.65,11.80),0.32+0.68*(t-11.65)/0.15,1.0)))':eval=frame[m4]`,
  `[m1][m2]acrossfade=d=0.60:c1=tri:c2=tri[m12]`,
  `[m12][m3]acrossfade=d=0.60:c1=tri:c2=tri[m123]`,
  `[m123][m4]acrossfade=d=0.60:c1=tri:c2=tri,atrim=0:60.00,afade=t=out:st=58.00:d=2.00:curve=exp[music]`
);

// 3. Aligned real gameplay SFX stems
const sfxLabels = [];
SFX_SPECS.forEach((s, idx) => {
  const inIdx = 17 + idx;
  const lbl = `sfx${idx}`;
  const fadeOutSt = Math.max(0.1, s.t - 0.08).toFixed(3);
  masterFilter.push(
    `[${inIdx}:a:0]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,` +
    `highpass=f=100,volume=-1.5dB,afade=t=in:st=0:d=0.06,afade=t=out:st=${fadeOutSt}:d=0.08,` +
    `adelay=${s.delayMs}|${s.delayMs}[${lbl}]`
  );
  sfxLabels.push(`[${lbl}]`);
});
masterFilter.push(
  `${sfxLabels.join('')}amix=inputs=${SFX_SPECS.length}:duration=longest:dropout_transition=0:normalize=0,atrim=0:60.00[sfx]`,
  `[music][sfx]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=7[afinal]`
);

masterArgs.push(
  '-filter_complex', masterFilter.join(';'),
  '-map', '[vfinal]',
  '-map', '[afinal]',
  '-t', '60.00',
  '-r', '60', '-fps_mode', 'cfr',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2', '-crf', '16', '-preset', 'medium',
  '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
  '-movflags', '+faststart',
  outMp4
);

runFfmpeg(masterArgs, 'Final 60s Master Render -> Sinfonia-dos-Cristais-Teaser-60s-1080p60.mp4');
console.log(`\nDONE! Master exported to: ${outMp4}`);
