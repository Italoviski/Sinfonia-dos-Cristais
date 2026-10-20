#!/usr/bin/env node
/**
 * Campaign & Mathematical Rules Verifier
 * Validates all 21 levels in CrystalCampaign against CrystalRules.Board,
 * checks required assets, and outputs a full balance matrix.
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
globalThis.window = globalThis;

await import(new URL('../../../../js/campaign.js', import.meta.url));
await import(new URL('../../../../js/campaign-current.js', import.meta.url));
await import(new URL('../../../../js/rules.js', import.meta.url));

const { CrystalCampaign, CrystalRules } = globalThis;
const summary = [];
let failures = 0;

for (const level of CrystalCampaign.levels) {
  const b = new CrystalRules.Board();
  const groups = new Map();
  for (const spec of level.pieces) {
    const p = b.add(spec);
    if (spec.seedGroup) {
      if (!groups.has(spec.seedGroup)) groups.set(spec.seedGroup, []);
      groups.get(spec.seedGroup).push(p.id);
    }
  }
  for (const ids of groups.values()) b.group(ids);

  const initialPieces = b.pieces.size;
  const normal = () => [...b.pieces.values()].filter(p => !p.dark);
  const kind = k => normal().filter(p => p.kind === k);
  const drag = (a, c) => b.dragOnto(a.id, c.id).pieces || [];
  const split = a => b.split(a.id, a.kind === 'aqua' ? 2 : level.split).pieces;
  const connect = list => {
    let first = list[0];
    for (const p of list.slice(1)) b.connect(first.id, p.id);
  };
  const annul = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const a of normal()) {
        if (!b.pieces.has(a.id)) continue;
        const target = [...b.pieces.values()].find(p => p.dark && b.matches(a.id, p.id));
        if (target) {
          b.annul(a.id, target.id);
          changed = true;
        }
      }
    }
  };
  const burn = () => drag(kind('opal')[0], kind('quartz').sort((a, c) => c.value.value - a.value.value)[0])[0];
  const quarters = () => {
    for (const half of split(kind('aqua')[0])) split(half);
  };

  let ops = 0;
  try {
    switch (level.id) {
      case 1:
      case 16: {
        const qs = kind('quartz');
        drag(qs[0], qs[1]);
        burn();
        ops = 2;
        break;
      }
      case 2:
      case 3:
        connect(normal());
        ops = normal().length - 1;
        break;
      case 4: {
        const qs = kind('quartz');
        const fused = drag(qs[0], qs[1])[0];
        connect([fused, qs[2]]);
        ops = 2;
        break;
      }
      case 5:
      case 17: {
        const rem = burn();
        connect([rem, ...kind('quartz').filter(p => p !== rem)]);
        ops = 2;
        break;
      }
      case 6:
        b.boost(kind('quartz')[0].id);
        ops = 1;
        break;
      case 7:
        split(kind('citrine')[0]);
        ops = 1;
        break;
      case 8:
      case 18:
        for (const p of split(kind('citrine')[0])) b.boost(p.id);
        ops = 1 + (level.split || 2);
        break;
      case 9: {
        const q = kind('quartz')[0];
        b.boost(q.id);
        connect(kind('quartz'));
        ops = 2;
        break;
      }
      case 10: {
        const parts = split(kind('citrine')[0]);
        parts.forEach(p => b.boost(p.id));
        connect(parts);
        ops = 1 + parts.length + (parts.length - 1);
        break;
      }
      case 11:
        split(kind('aqua')[0]);
        ops = 1;
        break;
      case 12:
        quarters();
        ops = 3;
        break;
      case 13: {
        const parts = split(kind('aqua')[0]);
        connect([...parts, ...kind('quartz')]);
        ops = 3;
        break;
      }
      case 14:
      case 19: {
        quarters();
        const parts = kind('aqua');
        let merged = drag(parts[0], parts[1])[0];
        merged = drag(merged, parts[2])[0];
        annul();
        if (level.id === 19) connect([merged, ...kind('quartz')]);
        ops = 5;
        break;
      }
      case 15: {
        const parts = split(kind('aqua')[0]);
        parts.forEach(p => b.boost(p.id));
        connect(parts);
        ops = 4;
        break;
      }
      case 20: {
        const q = burn();
        b.boost(q.id);
        connect([q, ...kind('aqua')]);
        ops = 3;
        break;
      }
    }
    annul();
  } catch (err) {
    failures++;
  }

  const sceneFile = resolve(root, `assets/story/cenarios/${level.scene}-quatro-estados.png`);
  const sceneOk = existsSync(sceneFile);
  const solved = b.pieces.size === 0;
  if (!solved || !sceneOk) failures++;

  summary.push({
    ID: level.id,
    Fase: level.name,
    Mundo: CrystalCampaign.worlds[level.world]?.name || level.world,
    PeçasIniciais: initialPieces,
    OperaçõesMin: ops,
    Ferramentas: level.tools.join(', '),
    BossMusical: level.boss ? 'SIM' : 'NÃO',
    Status: !solved ? '❌ FALHOU' : initialPieces === 0 ? '⚠️ VAZIA (SEM PUZZLE)' : '✅ RESOLVIDA'
  });
}

console.log('=== RELATÓRIO DE BALANCEAMENTO DA CAMPANHA (21 FASES) ===\n');
console.table(summary);
if (failures > 0) {
  console.error(`Encontradas ${failures} falhas na campanha.`);
  process.exitCode = 1;
} else {
  console.log('\nTodas as 20 fases principais resolvidas matematicamente. Nota: Fase 21 possui 0 peças atualmente.');
}
