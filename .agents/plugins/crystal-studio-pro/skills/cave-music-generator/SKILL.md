---
name: cave-music-generator
description: Produz e integra a faixa musical de dois atos da Fase 5 (Mundo 1: Caverna — O Sussurro da Fada) combinando a referência de violino melancólico (Amatore/Salvatore) no Ato 1 e o swing teatral de Broadway (De Nada! - Moana) no Ato 2, usando instrumentação mineral/cristalina e conectores MCP (Suno, ElevenLabs, MiniMax, Mureka).
---

# Cave Music Generator — Fase Musical da Caverna (Fase 5)

Esta skill automatiza a produção musical em 2 atos para o desafio rítmico (`CrystalRhythm` em `js/rhythm.js`) do **Mundo 1: Caverna Cristalina (Fase 5 — O Sussurro da Fada)** de *Sinfonia dos Cristais*.

## Contexto Narrativo e Sonoro do Jogo
- **Local**: Santuário Subterrâneo da Porta Ancestral (`scene: 'C5'`, `landmark: 'ceiling-prison'`).
- **Personagem/Voz**: A **Fada das Gemas** (Guardiã da Gema Primordial da Caverna / Rainha da Ordem), inicialmente aprisionada no grande cristal do teto e ouvida apenas como sussurros trêmulos nas Fases 1 a 4.
- **Mecânicas da Caverna Referenciadas**:
  - Fusão de **Quartzos** por arraste (soma de brilhos);
  - Subtração com a **Opala de Fogo** por arraste;
  - Conexão por clique formando **Equações Cristalinas** (linha energética roxa);
  - Anulação sequencial da **Equação Sombria** (`[3, 2]` na Fase 5), despedaçando o Cristal-Prisão em 36 fragmentos e acendendo o relicário de borboleta dourada no topo da **Porta Ancestral**.

## Arquitetura Musical em Dois Atos
1. **Ato I — A Queda da Harmonia e o Sussurro na Caverna (Ref: *Amatore / Salvatore* Violin Instrumental)**:
   - **Andamento e Tom**: `~84 BPM`, Fá# menor / Si menor (modo menor harmônico/frígio com 7ª maior dramática).
   - **Instrumentação da Caverna**: Violino solo melancólico com *portamento* e *reverb* de caverna profunda, Harpa de Vidro (*Glass Harp* / harmônicos de Quartzo), Celesta cristalina, Violoncelo/Viola *legato*, e percussão esparsa de gotas d'água subterrâneas (`C2`/`C3`) e *rimshot* suave.
2. **Ponte Dramática — A Queda no Calabouço e a Libertação (`[Sudden Stop]`)**:
   - Som de pedras rolando na caverna, estalo magnético da Equação Cristalina e explosão sequencial do Cristal-Prisão, seguido pela fala irônica e carismática da Fada recém-liberta.
3. **Ato II — O Show da Ordem e o Renascer (Ref: *De Nada!* — *Moana*)**:
   - **Andamento e Tom**: `~128 BPM`, modulação solar para Maior (Fá# Maior / Ré Maior) com *swing* teatral de Broadway/Vaudeville.
   - **Instrumentação da Caverna**: Marimba de Cristal / Litofone (substituindo o timbre tropical por percussão mineral afinada), Violão acústico percussivo, Contrabaixo acústico em *pizzicato*, Violino solo agora tocando *riffs* alegres e dançantes, palmas reverberantes e ataques de metais (*Brass Stabs* de trompas e trombones ecoando na Catedral Subterrânea da Porta Ancestral).

## Execução do Script
Execute o script da pipeline para gerar os payloads de MCP/API e o mapa de batidas (`BEAT_OFFSETS`) sincronizado:
```bash
node scripts/generate-cave-music.mjs
```
