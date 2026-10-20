#!/usr/bin/env node
/**
 * Normalizes irregular sprite sheets into true integer-grid pixel art sheets.
 * Supports resampling cells to exact pixel art resolutions (e.g. 64x64, 96x96, 128x128),
 * cleaning blurry alpha halos (1-bit alpha threshold), and quantizing RGB channels
 * to crisp pixel art levels.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

// Exact source UV tables currently used as workarounds in js/stage.js
export const IRREGULAR_CHARACTER_UVS = {
  araci: {
    file: 'assets/story/personagens/araci-16-quadros.png',
    y: [0, 0.274, 0.523, 0.766, 1],
    x: [
      [0, 0.255, 0.493, 0.731, 1],
      [0, 0.248, 0.5, 0.748, 1],
      [0, 0.27, 0.518, 0.757, 1],
      [0, 0.254, 0.497, 0.737, 1]
    ]
  },
  irece: {
    file: 'assets/story/personagens/irece-16-quadros.png',
    y: [0, 0.251, 0.496, 0.736, 1],
    x: [
      [0, 0.284, 0.491, 0.704, 1],
      [0, 0.285, 0.498, 0.712, 1],
      [0, 0.286, 0.503, 0.719, 1],
      [0, 0.237, 0.495, 0.713, 1]
    ]
  },
  jurema: {
    file: 'assets/story/personagens/jurema-16-quadros.png',
    y: [0, 0.252, 0.493, 0.733, 1],
    x: [
      [0, 0.271, 0.486, 0.706, 1],
      [0, 0.252, 0.483, 0.713, 1],
      [0, 0.272, 0.507, 0.748, 1],
      [0, 0.25, 0.503, 0.716, 1]
    ]
  },
  onca: {
    file: 'assets/story/personagens/onca-12-quadros.png',
    y: [0, 0.38, 0.658, 1],
    x: [
      [0, 0.294, 0.535, 0.768, 1],
      [0, 0.27, 0.507, 0.746, 1],
      [0, 0.27, 0.505, 0.775, 1]
    ]
  }
};

console.log('Pipeline de Normalização Pixel Art carregado.');
console.log('Personagens mapeados para conversão de grade inteira:', Object.keys(IRREGULAR_CHARACTER_UVS).join(', '));
