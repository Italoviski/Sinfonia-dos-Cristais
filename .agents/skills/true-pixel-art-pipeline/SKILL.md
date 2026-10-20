---
name: true-pixel-art-pipeline
description: >-
  Audita, quantiza, recorta e empacota spritesheets em Pixel Art verdadeiro (grade inteira,
  paleta controlada, canal alfa binário limpo e zero mixels). Use esta skill sempre que criar,
  editar ou validar imagens, sprites de personagens, gemas, interfaces 9-slice ou cenários.
---

# True Pixel Art Pipeline — Sinfonia dos Cristais

Esta skill garante que todos os recursos gráficos do jogo sigam o padrão **Pixel Art Verdadeiro (16-bit / 32-bit)**, eliminando *mixels*, bordas borradas de anti-aliasing e grades irregulares.

## 1. Especificações Técnicas de Pixel Art do Jogo

- **Grade de Células Inteira**:
  - **Gemas e Ícones**: Células de `48×48` ou `64×64` pixels reais (escaladas por múltiplos inteiros).
  - **Personagens e Guardiãs (`Araci`, `Irecê`, `Jurema`, `Onça`, `Fada`)**: Folhas de sprite com células uniformes (ex.: `64×64`, `96×96` ou `128×128`), âncora centralizada na base (`bottom-center`) para evitar trepidação entre quadros.
  - **Cenários de Biomas (`Caverna`, `Floresta`, `Rio`, `Caatinga`)**: Resolução base `480×270` ou `640×360` (proporção 16:9 exata), sem faixas divisórias pretas pintadas entre quadrantes.
- **Canal Alfa Limpo**:
  - Sprites recortados devem ter transparência RGBA genuína. Pixels de contorno não devem ter alfa parcial nebuloso (`1..200`) que crie halo escuro ou claro contra o fundo.

## 2. Scripts da Pipeline

1. **Auditoria de Todos os Sprites e Cenários**:
   - [audit-sprites.mjs](./scripts/audit-sprites.mjs)
   - Analisa todos os arquivos `.png` em `assets/`, verificando dimensões, divisibilidade por grade (`4×4`, `4×3`, `4×5`, `3×3`, `2×2`), presença de *mixels*, linhas divisórias intrusivas e qualidade do canal alfa.
   - Comando:
     ```powershell
     node .agents/skills/true-pixel-art-pipeline/scripts/audit-sprites.mjs
     ```

2. **Normalização, Quantização e Re-Empacotamento em Grade Exata**:
   - [normalize-spritesheet.mjs](./scripts/normalize-spritesheet.mjs)
   - Converte folhas de sprites com recortes irregulares (como as coordenadas flutuantes antigas de `stage.js`) em folhas de grade inteira perfeita (`cols × rows` de tamanho uniforme `cellW × cellH`), aplicando *nearest-neighbor* real, quantização de paleta e limpeza de halo alfa.
   - Comando:
     ```powershell
     node .agents/skills/true-pixel-art-pipeline/scripts/normalize-spritesheet.mjs
     ```
