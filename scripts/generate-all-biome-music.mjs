#!/usr/bin/env node
/**
 * Pipeline de Produção Musical Instrumental por IA (ACE-Step)
 * Sinfonia dos Cristais — Trilha Sonora Completa dos Mundos 2, 3 e 4
 *
 * 1. Floresta (Mundo 2):
 *    - Fases Normais (6 a 9): Floresta Mística, Flauta de Madeira, Harpa de Esmeralda, Violão Dedilhado (~90 BPM).
 *    - Fase Especial (Fase 10 - Desafio de Araci): Clímax Épico da Mata, Tambores, Flautas em Contraponto, Sinos de Esmeralda (~126 BPM).
 *
 * 2. Rio das Águas Claras (Mundo 3):
 *    - Fases Normais (11 a 14): Correnteza Serena, Celesta d'Água, Harpa Aquática, Flauta Doce, Piano Cristalino (~88 BPM).
 *    - Fase Especial (Fase 15 - Desafio de Irecê): Dança Caudalosa, Cristais Sonoros, Percussão de Água, Flauta Rápida (~124 BPM).
 *
 * 3. Caatinga (Mundo 4):
 *    - Fases Normais (16 a 19): Sertão Solar Contemplativo, Rabeca Suave, Viola Caipira, Litofone de Arenito (~94 BPM).
 *    - Fase Especial (Fase 20 - Desafio de Jurema): Baião Cristalino Eletrizante, Rabeca Virtuosa, Triângulo, Zabumba, Sanfona (~134 BPM).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ACESTEP_BASE = 'https://ace-step-ace-step.hf.space';

export const TRACK_CONFIGS = [
  {
    id: 'forest_regular',
    fileName: 'musica-floresta-fases.mp3',
    title: 'Sussurros da Mata Ancestral (Floresta - Fases Normais)',
    biome: 'forest',
    kind: 'regular',
    durationSec: 52,
    bpm: 90,
    key: 'E minor',
    seed: 450123,
    prompt:
      'instrumental, no vocals, serene fantasy RPG forest exploration, peaceful native wooden flute melody, celtic emerald harp arpeggios, fingerstyle nylon acoustic guitar, soft chamber strings legato, subtle organic seed shaker, gentle wood claves percussion, crystal clear sound mix, ambient woodland resonance, 90 BPM, E minor',
    lyrics: '[instrumental]\n[wooden flute melody]\n[harp arpeggios]\n[ambient strings]\n[peaceful outro]'
  },
  {
    id: 'forest_special',
    fileName: 'musica-floresta-especial.mp3',
    title: 'O Despertar da Esmeralda (Floresta - Fase 10 Especial / Araci)',
    biome: 'forest',
    kind: 'special',
    durationSec: 58,
    bpm: 126,
    key: 'E major',
    seed: 450456,
    prompt:
      'instrumental, no vocals, epic joyful nature awakening, vibrant dual pan flutes, energetic tribal crystal maracas, driving acoustic rhythm guitar, orchestral brass stabs, soaring strings spiccato, emerald bell chimes, triumphant climax, fantasy RPG boss victory rhythm, 126 BPM, E major',
    lyrics: '[instrumental]\n[tribal percussion intro]\n[vibrant pan flute hook]\n[strings crescendo]\n[brass climax]\n[triumphant finish]'
  },
  {
    id: 'river_regular',
    fileName: 'musica-rio-fases.mp3',
    title: 'Correnteza Turquesa (Rio - Fases Normais)',
    biome: 'river',
    kind: 'regular',
    durationSec: 52,
    bpm: 88,
    key: 'C major / F Lydian',
    seed: 780123,
    prompt:
      'instrumental, no vocals, gentle flowing crystal stream, cascading aquatic harp arpeggios, shimmering water celesta, sweet silver transverse flute, warm acoustic piano chords, tranquil chamber cello, soothing water droplet percussion, peaceful ambient reverb, 88 BPM, C major',
    lyrics: '[instrumental]\n[harp cascade intro]\n[silver flute theme]\n[water celesta sparkle]\n[gentle piano chords]\n[flowing outro]'
  },
  {
    id: 'river_special',
    fileName: 'musica-rio-especial.mp3',
    title: 'A Dança das Cascatas (Rio - Fase 15 Especial / Irecê)',
    biome: 'river',
    kind: 'special',
    durationSec: 58,
    bpm: 124,
    key: 'D major',
    seed: 780789,
    prompt:
      'instrumental, no vocals, lively waterfall river dance, melodic crystalline glockenspiel bells, rhythmic aquatic log drum percussion, virtuosic flute runs, energetic acoustic guitar strums, soaring dynamic orchestral strings, sparkling paraiba tourmaline chimes, uplifting crescendo, 124 BPM, D major',
    lyrics: '[instrumental]\n[crystal bells intro]\n[fast flute theme]\n[water percussion groove]\n[strings building up]\n[sparkling waterfall climax]'
  },
  {
    id: 'caatinga_regular',
    fileName: 'musica-caatinga-fases.mp3',
    title: 'Sol Sobre o Arenito (Caatinga - Fases Normais)',
    biome: 'caatinga',
    kind: 'regular',
    durationSec: 52,
    bpm: 94,
    key: 'D Mixolydian',
    seed: 920123,
    prompt:
      'instrumental, no vocals, contemplative sunny Brazilian sertao landscape, soulful rustic rabeca fiddle melody, 12-string acoustic viola caipira picking, warm sandstone marimba, dry seed shaker percussion, warm gentle breeze ambience, earthy modal folk harmony, crystal clear mix, 94 BPM, D Mixolydian',
    lyrics: '[instrumental]\n[viola caipira intro]\n[soulful rabeca theme]\n[sandstone marimba]\n[dry shaker cadence]\n[warm sunset outro]'
  },
  {
    id: 'caatinga_special',
    fileName: 'musica-caatinga-especial.mp3',
    title: 'O Baião da Opala de Fogo (Caatinga - Fase 20 Especial / Jurema)',
    biome: 'caatinga',
    kind: 'special',
    durationSec: 60,
    bpm: 134,
    key: 'A major / E Mixolydian',
    seed: 920999,
    prompt:
      'instrumental, no vocals, fast energetic Brazilian baiao celebration, virtuosic joyful rabeca fiddle solo, syncopated zabumba bass drum, crisp crystal triangle, bright festive accordion sanfona, upbeat 7-string acoustic guitar groove, triumphant solar fire opal celebration, 134 BPM, A major',
    lyrics: '[instrumental]\n[triangle and zabumba baiao groove]\n[joyful fast rabeca theme]\n[bright accordion fills]\n[dancing rhythm section]\n[explosive festive climax]'
  }
];

async function callGradioEndpoint(endpoint, dataArray, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const callRes = await fetch(`${ACESTEP_BASE}/gradio_api/call/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataArray })
      });
      if (!callRes.ok) {
        throw new Error(`Falha ao iniciar ${endpoint}: HTTP ${callRes.status}`);
      }
      const { event_id } = await callRes.json();
      if (!event_id) throw new Error(`Sem event_id retornado de ${endpoint}`);

      const sseRes = await fetch(`${ACESTEP_BASE}/gradio_api/call/${endpoint}/${event_id}`);
      if (!sseRes.ok) {
        throw new Error(`Falha no stream SSE de ${endpoint}: HTTP ${sseRes.status}`);
      }
      const sseText = await sseRes.text();
      const lines = sseText.split('\n');
      let lastEvent = '';
      let lastData = null;
      for (const line of lines) {
        if (line.startsWith('event:')) {
          lastEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const raw = line.slice(5).trim();
          if (lastEvent === 'complete') {
            lastData = JSON.parse(raw);
          } else if (lastEvent === 'error') {
            throw new Error(`Erro Gradio em ${endpoint}: ${raw}`);
          }
        }
      }
      if (!lastData) {
        throw new Error(`Nenhum evento complete recebido de ${endpoint}`);
      }
      return lastData;
    } catch (err) {
      console.warn(`    ⚠️ Tentativa ${attempt}/${retries} falhou (${err.message}). Aguardando 5s para retentativa...`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

async function downloadGradioAudio(fileObj, destPath) {
  const url =
    fileObj?.url ||
    (fileObj?.path ? `${ACESTEP_BASE}/gradio_api/file=${fileObj.path}` : null);
  if (!url) throw new Error('Objeto de áudio sem URL/path válido: ' + JSON.stringify(fileObj));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar áudio (${url}): HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  fs.writeFileSync(destPath, buf);
  return buf;
}

async function generateTrack(track) {
  const payload = [
    track.durationSec,    // audio_duration
    track.prompt,         // prompt
    track.lyrics,         // lyrics
    50,                   // infer_step (50 steps for fast, high quality synthesis)
    15,                   // guidance_scale
    'euler',              // scheduler_type
    'apg',                // cfg_type
    10,                   // omega_scale
    String(track.seed),   // manual_seeds
    0.5,                  // guidance_interval
    0,                    // guidance_interval_decay
    3,                    // min_guidance_scale
    true,                 // use_erg_tag
    false,                // use_erg_lyric (false for pure instrumental)
    true,                 // use_erg_diffusion
    null,                 // oss_steps
    0,                    // guidance_scale_text
    0,                    // guidance_scale_lyric
    false,                // audio2audio_enable
    0.5,                  // ref_audio_strength
    null,                 // ref_audio_input
    'none'                // lora_name_or_path
  ];
  return callGradioEndpoint('__call__', payload);
}

export async function runPipeline(options = {}) {
  const force = options.force || process.argv.includes('--force');
  const targetId = options.targetId || process.argv.find(a => a.startsWith('--id='))?.split('=')[1];

  const audioDir = path.join(ROOT, 'assets', 'audio');
  const distAudioDir = path.join(ROOT, 'dist', 'assets', 'audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
  if (fs.existsSync(path.join(ROOT, 'dist')) && !fs.existsSync(distAudioDir)) {
    fs.mkdirSync(distAudioDir, { recursive: true });
  }

  const results = [];
  const tracksToRun = targetId
    ? TRACK_CONFIGS.filter(t => t.id === targetId)
    : TRACK_CONFIGS;

  if (tracksToRun.length === 0) {
    console.error(`Nenhuma faixa encontrada para o id: ${targetId}`);
    return;
  }

  console.log(`=== Produção Musical Instrumental — Sinfonia dos Cristais ===`);
  console.log(`Total de faixas a processar: ${tracksToRun.length}`);

  for (let i = 0; i < tracksToRun.length; i++) {
    const track = tracksToRun[i];
    const outPath = path.join(audioDir, track.fileName);
    const distPath = path.join(distAudioDir, track.fileName);

    console.log(`\n[${i + 1}/${tracksToRun.length}] ${track.title}`);
    console.log(`  Arquivo: ${track.fileName} | Bioma: ${track.biome} | Tipo: ${track.kind} | ${track.bpm} BPM`);

    let buf;
    let meta = null;

    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100000 && !force) {
      buf = fs.readFileSync(outPath);
      console.log(`  ✔ Faixa já existente preservada (${(buf.length / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`  ⚙ Gerando via ACE-Step (${track.durationSec}s, seed ${track.seed})...`);
      const startTime = Date.now();
      const [audioObj, genMeta] = await generateTrack(track);
      meta = genMeta;
      buf = await downloadGradioAudio(audioObj, outPath);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ✔ Concluído em ${elapsed}s! Salvo em ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
      await new Promise(r => setTimeout(r, 2000));
    }

    if (fs.existsSync(path.join(ROOT, 'dist'))) {
      fs.writeFileSync(distPath, buf);
    }

    results.push({
      id: track.id,
      title: track.title,
      fileName: track.fileName,
      biome: track.biome,
      kind: track.kind,
      durationSec: track.durationSec,
      bpm: track.bpm,
      key: track.key,
      sizeBytes: buf.length,
      metadata: meta
    });
  }

  const dataDir = path.join(ROOT, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'biome-music-production.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        engine: 'ACE-Step Instrumental Diffusion (50 Infer Steps)',
        tracks: results
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`\n🎉 Todas as ${results.length} faixas instrumentais foram concluídas com sucesso!`);
  console.log(`Metadados de produção gravados em data/biome-music-production.json`);
}

if (process.argv[1] && process.argv[1].endsWith('generate-all-biome-music.mjs')) {
  runPipeline().catch(err => {
    console.error('Erro na geração musical:', err);
    process.exitCode = 1;
  });
}
