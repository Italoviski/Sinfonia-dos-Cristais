import { execSync } from 'node:child_process';
import fs from 'node:fs';

const EDIT_URL = 'https://invideo.io/@givercys-workspace/sinfonia-dos-cristais-teaser-universitario-60s/tree/main/seq-1.1';
const AS = 'editor-sinfonia';
const FPS = 60;
const F = sec => Math.round(sec * FPS);

function run(cmd) {
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out);
}
function showEdit() {
  return run(`invideo edit show "${EDIT_URL}" --as ${AS} --json`);
}
function editChange(token, ops, nameTag, dryRun = false) {
  const tmpFile = `teaser/ops-${nameTag}${dryRun ? '-dry' : ''}.json`;
  fs.writeFileSync(tmpFile, JSON.stringify(ops, null, 2));
  const flag = dryRun ? '--dry-run ' : '';
  return run(`invideo edit change "${EDIT_URL}" --timeline T1 --token "${token}" --as ${AS} ${flag}--operations @${tmpFile} --json`);
}

let state = showEdit();
let token = state.state_token;

// Pass 2A: Audio routing, gain leveling, crossfades, fades, video transitions, and titles
const ops2 = [
  // Bus routing
  { op: 'set_audio_routing', target: 'A1', bus: 'B1' },
  { op: 'set_audio_routing', target: 'A2', bus: 'B2' },
  { op: 'set_audio_routing', target: 'A3', bus: 'B3' },

  // Loudness matching across the 4 original biome tracks + SFX track
  { op: 'set_audio_gain', target: 'a15', gain_db: -4.0 },
  { op: 'set_audio_gain', target: 'a16', gain_db: 4.0 },
  { op: 'set_audio_gain', target: 'a17', gain_db: 2.0 },
  { op: 'set_audio_gain', target: 'a18', gain_db: 4.0 },
  { op: 'set_audio_gain', target: 'A3', gain_db: -4.5 },

  // Musical crossfades on A2
  { op: 'apply_audio_crossfade', outgoing: 'a15', incoming: 'a16', curve: 'equal_power', duration_seconds: 0.6, alignment: 'center', trim_to_fit: true },
  { op: 'apply_audio_crossfade', outgoing: 'a16', incoming: 'a17', curve: 'equal_power', duration_seconds: 0.6, alignment: 'center', trim_to_fit: true },
  { op: 'apply_audio_crossfade', outgoing: 'a17', incoming: 'a18', curve: 'equal_power', duration_seconds: 0.6, alignment: 'center', trim_to_fit: true },

  // Intro/outro fades on music
  { op: 'set_audio_fade', clip: 'a15', direction: 'in', duration_seconds: 0.25, curve: 'equal_power' },
  { op: 'set_audio_fade', clip: 'a18', direction: 'out', duration_seconds: 1.8, curve: 'equal_power' },

  // Subtle biome transitions on V1
  { op: 'add_transition', left_clip: 'c5', right_clip: 'c6', type: 'fade', in_f: 8, out_f: 8 },
  { op: 'add_transition', left_clip: 'c8', right_clip: 'c9', type: 'fade', in_f: 8, out_f: 8 },
  { op: 'add_transition', left_clip: 'c11', right_clip: 'c12', type: 'fade', in_f: 8, out_f: 8 },
  { op: 'add_transition', left_clip: 'c13', right_clip: 'c14', type: 'flash', in_f: 6, out_f: 8 },
  { op: 'add_transition', left_clip: 'c14', right_clip: 'c15', type: 'fade', in_f: 12, out_f: 12 }
];

const titleSpecs = [
  { start: 2.5,  end: 5.5,  text: '4 BIOMAS  •  21 FASES', x: 0, y: 415, color: '#9ef0ff', size: 46 },
  { start: 8.5,  end: 13.0, text: 'MATEMÁTICA 100% VISUAL', x: 0, y: -335, color: '#ffffff', size: 46 },
  { start: 18.2, end: 23.8, text: 'FLORESTA  •  CORTE CRISTALINO', x: 0, y: 420, color: '#86efac', size: 44 },
  { start: 28.5, end: 34.0, text: 'RIO ENCANTADO  •  FRAÇÕES E MELODIA', x: 0, y: 420, color: '#7aeaff', size: 44 },
  { start: 38.5, end: 44.0, text: 'CAATINGA  •  BAIÃO DA OPALA DE FOGO', x: 0, y: 420, color: '#ffd35a', size: 44 },
  { start: 50.8, end: 54.8, text: 'SINFONIA DOS CRISTAIS\nTRUE PIXEL ART  •  ACESSÍVEL A TODOS', x: 0, y: -285, color: '#ffffff', size: 48 }
];

for (const t of titleSpecs) {
  ops2.push({
    op: 'add_text',
    track: 'V3',
    start_f: F(t.start),
    end_f: F(t.end),
    text: t.text,
    style: {
      align: 'center',
      color: t.color,
      background_color: '#0b0722d8',
      font_size: t.size,
      font_weight: 700,
      shadow: true,
      shadow_blur: 8,
      shadow_color: '#000000dd',
      stroke: true,
      stroke_color: '#160d3d',
      stroke_width: 3
    }
  });
}

console.log('Dry-run Pass 2...');
editChange(token, ops2, 'pass2', true);
console.log('Applying Pass 2...');
const res2 = editChange(token, ops2, 'pass2', false);
token = res2.state_token;
console.log('Applied Pass 2! Created:', res2.created);
fs.writeFileSync('teaser/pass2-result.json', JSON.stringify(res2, null, 2));

// Identify created text clip IDs in order
const textClipIds = (res2.created || []).filter(x => x.kind === 'text_clip' || x.kind === 'clip').map(x => x.id);
console.log('Created text clips:', textClipIds);

// Pass 3: Position titles, animate opacity fade-in/out (0.2s = 12f), and add brief pre-climax dip on a18
const ops3 = [];
textClipIds.forEach((cid, i) => {
  const spec = titleSpecs[i];
  if (!spec) return;
  ops3.push({ op: 'set_position', clip: cid, x: spec.x, y: spec.y });
  ops3.push({ op: 'add_keyframe_lane', parent: cid, parent_kind: 'video_clip', property: 'opacity', default_value: 1 });
});

// Also create volume lane on a18 for the 0:45.6..0:46.2 dramatic valley (in a18 local time: 10.2s..10.8s)
ops3.push({ op: 'add_keyframe_lane', parent: 'a18', parent_kind: 'audio_clip', property: 'volume', default_value: 1 });

console.log('Dry-run Pass 3A...');
editChange(token, ops3, 'pass3a', true);
console.log('Applying Pass 3A...');
const res3a = editChange(token, ops3, 'pass3a', false);
token = res3a.state_token;
fs.writeFileSync('teaser/pass3a-result.json', JSON.stringify(res3a, null, 2));

// Read created lane IDs and add keyframe points
const createdLanes = (res3a.created || []).map(x => x.id);
console.log('Created lanes:', createdLanes);

const ops3b = [];
textClipIds.forEach((cid, i) => {
  const laneId = createdLanes[i];
  const spec = titleSpecs[i];
  if (!laneId || !spec) return;
  const dur = Number((spec.end - spec.start).toFixed(3));
  ops3b.push({
    op: 'add_keyframes',
    lane: laneId,
    points: [
      { time_seconds: 0.0, value: 0.0 },
      { time_seconds: 0.2, value: 1.0 },
      { time_seconds: Math.max(0.25, Number((dur - 0.2).toFixed(3))), value: 1.0 },
      { time_seconds: dur, value: 0.0 }
    ]
  });
});

const volLaneId = createdLanes[textClipIds.length];
if (volLaneId) {
  ops3b.push({
    op: 'add_keyframes',
    lane: volLaneId,
    points: [
      { time_seconds: 10.0, value: 1.0 },
      { time_seconds: 10.35, value: 0.35 },
      { time_seconds: 10.65, value: 0.35 },
      { time_seconds: 10.85, value: 1.0 }
    ]
  });
}

if (ops3b.length > 0) {
  console.log('Dry-run Pass 3B...');
  editChange(token, ops3b, 'pass3b', true);
  console.log('Applying Pass 3B...');
  const res3b = editChange(token, ops3b, 'pass3b', false);
  token = res3b.state_token;
  console.log('Applied Pass 3B! Final token:', token);
}
