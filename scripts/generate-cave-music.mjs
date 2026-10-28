#!/usr/bin/env node
/**
 * Script de Passo a Passo Automatizado — Geração de Música por IA Vocal (ACE-Step 2 Atos)
 * Fase 5 (Mundo 1: Caverna — "O Sussurro da Fada")
 * Obra: "Era Uma Vez (Da Ordem ao Renascer)"
 *
 * Parte 1 (Ato I): Inspirada no áudio 2 (Amatore / Salvatore Violin Instrumental) — 84 BPM, F#m,
 *   Violino Solo Melancólico, Harpa de Vidro (Quartzo), Celesta, Cordas de Câmara e Voz Feminina Melancólica em Português.
 * Parte 2 (Ato II): Inspirada no áudio 1 (De Nada! - Moana) — 128 BPM, F# Maior / Ré Maior,
 *   Showtune de Broadway, Marimba de Cristal, Violão Percussivo, Contrabaixo Pizzicato, Violino Alegre, Metais e Voz Teatral.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ACESTEP_BASE = 'https://ace-step-ace-step.hf.space';

// ============================================================================
// PASSO 1: Prompts e Letras Otimizadas dos 2 Atos (Caverna — Fase 5)
// ============================================================================
const ACT1_PROMPT =
  'cinematic baroque pop, italian film score vibe, weeping solo violin melody, glass harp arpeggios, celesta chimes, lush dark chamber strings, cello, subterranean cave reverb, slow waltz, 84 BPM, F# minor, breathless melancholic female vocal, dramatic storytelling, portuguese';

const ACT1_LYRICS = `[intro]
[solo violin]

[verse]
Era uma vez...
Um reino envolto em pura alegria,
Guiado por quatro gemas em harmonia.
Cada cristal tinha a sua rainha,
E entre elas, a Ordem era minha.

[verse]
Mas com o tempo, a fumaça e a ambição
Vieram manchar o ar e envenenar o chão.
Mesmo com o grito de alerta iminente,
Chamaram de farsa o perigo presente.
Na sombra gerada por mãos tão cruéis,
Viramos cristais voláteis, sem paz nos quartéis,
Intensificando o caos e a desordem,
E assim... chegamos ao fim.

[instrumental]
[violin solo]

[bridge]
Mas era uma vez...
Uma criança inocente,
Vagando cá e acolá, tão de repente.
Em uma aventura, na escuridão da caverna,
Topou com a verdade mais dura e eterna:
O chão se abriu... e no calabouço ela caiu!`;

const ACT2_PROMPT =
  'upbeat broadway musical showtune, vaudeville swing, 128 BPM, crystal marimba, glockenspiel, percussive acoustic guitar, pizzicato upright bass, playful violin riffs, big brass section, handclaps, sassy charismatic female vocal, joyful theatrical belting, portuguese';

const ACT2_LYRICS = `[intro]
Contudo... respira fundo! Isso não foi o fim.
Você quebrou o meu cristal e deu a deixa perfeita pra mim!
Um, dois, três e...

[verse]
Olha só que novidade!
Arrasta o Quartzo, faz a luz somar,
Tudo isso bem facinho! (Bem facinho!)
Vem com a Opala pro excesso tirar,
E a linha roxa abre o caminho! (Vai no sapatinho!)

[chorus]
E quebra, e quebra as amarras!
Fazendo a caverna inteira resplandecer!
Eu sou a Ordem, a Ordem está aqui! (Pode aplaudir!)
Siga as minhas regras que tudo vai fluir!
Chegamos, chegamos ao topo de novo,
O reino inteiro vai...
Renascer!

[bridge]
Soma o Quartzo, reduz na Opala,
Conecta a equação que a caverna se embala!
Na ordem certinha do espelho do chão,
A sombra se quebra em constelação!
Olha a Porta Ancestral acendendo o brasão!

[chorus]
Move pra cá! (Move pra lá!)
Viu como a Ordem faz tudo brilhar?
Sem bagunça, sem fumaça, pode agradecer:
De nada! Tudo aqui vai renascer!

[outro]
Vai renascer!
(Bem facinho!)
A Ordem voltou!`;

// ============================================================================
// PASSO 2: Cliente Gradio SSE para ACE-Step (/__call__)
// ============================================================================
async function callGradioEndpoint(endpoint, dataArray) {
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

// Remove cabeçalho ID3v2 inicial de um segundo segmento MP3 para concatenação limpa de frames
function stripId3v2(buf) {
  if (buf.length >= 10 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const size =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f);
    return buf.subarray(10 + size);
  }
  return buf;
}

async function generateAct(durationSec, prompt, lyrics, seed) {
  const payload = [
    durationSec,     // audio_duration
    prompt,          // prompt
    lyrics,          // lyrics
    55,              // infer_step
    15,              // guidance_scale
    'euler',         // scheduler_type
    'apg',           // cfg_type
    10,              // omega_scale
    String(seed),    // manual_seeds
    0.5,             // guidance_interval
    0,               // guidance_interval_decay
    3,               // min_guidance_scale
    true,            // use_erg_tag
    true,            // use_erg_lyric
    true,            // use_erg_diffusion
    null,            // oss_steps
    0,               // guidance_scale_text
    0,               // guidance_scale_lyric
    false,           // audio2audio_enable
    0.5,             // ref_audio_strength
    null,            // ref_audio_input
    'none'           // lora_name_or_path
  ];
  return callGradioEndpoint('__call__', payload);
}

async function main() {
  const audioDir = path.join(ROOT, 'assets', 'audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  const act1Path = path.join(audioDir, 'era-uma-vez-ato1-amatore.mp3');
  let act1Buf;
  let act1Meta = null;

  if (fs.existsSync(act1Path) && fs.statSync(act1Path).size > 500000 && !process.argv.includes('--force-act1')) {
    act1Buf = fs.readFileSync(act1Path);
    console.log(`✔ Ato I já existente carregado de ${act1Path} (${act1Buf.length} bytes)`);
  } else {
    console.log('1/2 Gerando Ato I (Ref: Amatore / Salvatore Violin — 84 BPM, F#m) via ACE-Step...');
    const [act1AudioObj, meta1] = await generateAct(52, ACT1_PROMPT, ACT1_LYRICS, 777123);
    act1Meta = meta1;
    act1Buf = await downloadGradioAudio(act1AudioObj, act1Path);
    console.log(`✔ Ato I salvo em ${act1Path} (${act1Buf.length} bytes)`);
  }

  const act2Path = path.join(audioDir, 'era-uma-vez-ato2-de-nada.mp3');
  console.log('2/2 Gerando Ato II (Ref: De Nada! - Moana — 128 BPM Broadway Showtune) via ACE-Step...');
  const [act2AudioObj, act2Meta] = await generateAct(62, ACT2_PROMPT, ACT2_LYRICS, 888456);
  const act2Buf = await downloadGradioAudio(act2AudioObj, act2Path);
  console.log(`✔ Ato II salvo em ${act2Path} (${act2Buf.length} bytes)`);

  // Une Ato I (52s) + Ato II (62s) na faixa contínua de 114s da Fase 5 da Caverna
  const finalMp3Path = path.join(audioDir, 'era-uma-vez-caverna.mp3');
  const combinedBuf = Buffer.concat([act1Buf, stripId3v2(act2Buf)]);
  fs.writeFileSync(finalMp3Path, combinedBuf);
  console.log(`✔ Música completa unificada (Ato I + Ato II) salva em ${finalMp3Path} (${combinedBuf.length} bytes)`);

  const distAudioDir = path.join(ROOT, 'dist', 'assets', 'audio');
  if (fs.existsSync(path.join(ROOT, 'dist'))) {
    if (!fs.existsSync(distAudioDir)) fs.mkdirSync(distAudioDir, { recursive: true });
    fs.writeFileSync(path.join(distAudioDir, 'era-uma-vez-ato1-amatore.mp3'), act1Buf);
    fs.writeFileSync(path.join(distAudioDir, 'era-uma-vez-ato2-de-nada.mp3'), act2Buf);
    fs.writeFileSync(path.join(distAudioDir, 'era-uma-vez-caverna.mp3'), combinedBuf);
  }

  const outDir = path.join(ROOT, 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'cave-music-production.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        engine: 'ACE-Step (Two-Act AI Vocal + Instrumental Generation)',
        act1File: 'assets/audio/era-uma-vez-ato1-amatore.mp3',
        act1Bytes: act1Buf.length,
        act2File: 'assets/audio/era-uma-vez-ato2-de-nada.mp3',
        act2Bytes: act2Buf.length,
        fullSongFile: 'assets/audio/era-uma-vez-caverna.mp3',
        fullSongBytes: combinedBuf.length,
        act1Metadata: act1Meta,
        act2Metadata: act2Meta
      },
      null,
      2
    ),
    'utf8'
  );
}

main().catch(err => {
  console.error('Erro na geração:', err);
  process.exitCode = 1;
});
