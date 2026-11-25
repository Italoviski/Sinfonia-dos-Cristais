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

function editChange(token, ops, dryRun = false) {
  const tmpFile = dryRun ? 'teaser/ops-dry.json' : 'teaser/ops-apply.json';
  fs.writeFileSync(tmpFile, JSON.stringify(ops, null, 2));
  const flag = dryRun ? '--dry-run ' : '';
  return run(`invideo edit change "${EDIT_URL}" --timeline T1 --token "${token}" --as ${AS} ${flag}--operations @${tmpFile} --json`);
}

// 1. Read fresh token
let state = showEdit();
let token = state.state_token;
console.log('Initial token:', token, 'revision:', state.revision);

// 2. Build Pass 1: Video clips (V1 + linked SFX on A3), Ending Card (V1), Music Medley (A2), Audio Buses
const videoCuts = [
  // [asset, start_s, dur_s, src_start_s, name]
  ['m7',  0.00, 6.00, 0.00, '01_Menu_Porta'],
  ['m9',  6.00, 2.00, 0.20, '02_Mapa_Caverna'],
  ['m11', 8.00, 2.60, 0.20, '03_Caverna_Fusao_Opala'],
  ['m11', 10.60, 2.60, 5.20, '04_Caverna_Equacao'],
  ['m12', 13.20, 2.60, 3.50, '05_Caverna_Fase5_Fada'],
  ['m9',  15.80, 2.00, 2.80, '06_Mapa_Floresta'],
  ['m8',  17.80, 3.20, 0.20, '07_Floresta_Esmeralda'],
  ['m8',  21.00, 4.40, 3.70, '08_Floresta_Corte_Ninja'],
  ['m9',  25.40, 1.40, 4.80, '09_Mapa_Rio'],
  ['m10', 26.80, 4.00, 0.20, '10_Rio_Fracoes'],
  ['m10', 30.80, 4.60, 4.40, '11_Rio_Melodia'],
  ['m13', 35.40, 3.80, 0.20, '12_Caatinga_Molde'],
  ['m13', 39.20, 7.00, 5.00, '13_Caatinga_Desafio_Areias'],
  ['m14', 46.20, 8.80, 0.40, '14_Porta_Final_Climax']
];

const ops1 = [
  { op: 'set_name', target: 'V1', name: 'Gameplay' },
  { op: 'set_name', target: 'V2', name: 'Overlays' },
  { op: 'set_name', target: 'V3', name: 'Titles' },
  { op: 'set_name', target: 'A1', name: 'Voiceover' },
  { op: 'set_name', target: 'A2', name: 'Music_Medley' },
  { op: 'set_name', target: 'A3', name: 'SFX_Gameplay' },
  { op: 'create_audio_bus', timeline: 'T1', name: 'Dialogue_Bus' },
  { op: 'create_audio_bus', timeline: 'T1', name: 'Music_Bus' },
  { op: 'create_audio_bus', timeline: 'T1', name: 'SFX_Bus' }
];

for (const [asset, startS, durS, srcStart, _label] of videoCuts) {
  ops1.push({
    op: 'place_media',
    asset,
    track: 'V1',
    at_f: F(startS),
    source_start_seconds: srcStart,
    source_end_seconds: Number((srcStart + durS).toFixed(3)),
    mode: 'overwrite',
    linked_audio: true,
    audio_track: 'A3'
  });
}

// Ending Card UNEB (55.00 -> 60.00s = 5.00s)
ops1.push({
  op: 'place_media',
  asset: 'm1',
  track: 'V1',
  at_f: F(55.00),
  source_start_seconds: 0,
  source_end_seconds: 5.0,
  mode: 'overwrite',
  linked_audio: false
});

// Music Medley on A2 (contiguous, then crossfades)
const musicCuts = [
  ['m3', 0.00, 15.80, 8.86],
  ['m4', 15.80, 9.60, 8.14],
  ['m5', 25.40, 10.00, 18.42],
  ['m6', 35.40, 24.60, 10.34]
];

for (const [asset, startS, durS, srcStart] of musicCuts) {
  ops1.push({
    op: 'place_media',
    asset,
    track: 'A2',
    at_f: F(startS),
    source_start_seconds: srcStart,
    source_end_seconds: Number((srcStart + durS).toFixed(3)),
    mode: 'overwrite',
    linked_audio: false
  });
}

console.log('Dry-run Pass 1...');
const dry1 = editChange(token, ops1, true);
console.log('Dry-run Pass 1 status:', dry1.status);

console.log('Applying Pass 1...');
const res1 = editChange(token, ops1, false);
token = res1.state_token;
console.log('Applied Pass 1! Created:', res1.created?.length, 'objects. New token:', token);
fs.writeFileSync('teaser/pass1-result.json', JSON.stringify(res1, null, 2));

// Read back full timeline to inspect exact clip & bus IDs
state = showEdit();
token = state.state_token;
fs.writeFileSync('teaser/edit-after-pass1.json', JSON.stringify(state, null, 2));
console.log('Total objects in T1:', state.total_objects, 'Objects returned:', state.objects.length);
