# Project: Sinfonia dos Cristais — Sincronização e Melhorias Visuais na Fase Especial da Caverna

## Architecture
- **Rendering**: Canvas 2D nativo (`#truePixelScreen`), buffer físico $640 \times 360$, espaço lógico $320 \times 180$, $2\times$ transform, `imageSmoothingEnabled = false`, True Pixel Art sem anti-aliasing / mixels.
- **Rhythm Karaoke Engine**: `CaveRhythmKaraoke` em `js/true-pixel-cave.js`.
- **Audio Clock System**: `CaveChapter1.loop` / `update` em `js/true-pixel-cave.js` com Precision Audio Clock (suavização contínua com amortecimento de drift contra degraus de `currentTime`).
- **Ballistics & Trajectory Arc**: Curva balística suave $H(\Delta t)$ proporcional ao tempo de voo (arcos baixos = rápidos, arcos altos = lentos), amostragem discreta em True Pixel Art.
- **Data & Timestamps**: `KARAOKE_PHRASES` e `PRACTICE_PHRASE` em `js/true-pixel-cave.js`, ajustados para os ataques vocais reais do áudio `era-uma-vez-caverna.mp3`.
- **Testing & Playtest**: `tests/rhythm-karaoke.test.mjs`, `js/test-harness.js` (`window.CrystalTestAPI`), `npm test`, `npm run playtest`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Precision Audio Clock | Relógio contínuo a 60 FPS com interpolação via performance.now() para amortecer degraus de 150-250ms de `HTMLMediaElement.currentTime` e compensar latência de áudio (~45ms) | M1 | Survey (Explorer 1 & 3) |
| 2 | Vocal Alignment & Hit Window Calibration | Re-alinhamento dos timestamps de `KARAOKE_PHRASES` aos ataques vocais reais e ampliação calibrada da janela de tolerância de clique em `evaluateHit` / `update` (evitando miss prematuro pós-canto) | M1 | Survey (Explorer 1) |
| 3 | Continuous Ball Kinematics (No Teleport) | Eliminação dos saltos repentinos: decolagem a partir da posição real da palavra anterior, tempo de voo cobrindo o intervalo $\Delta t$, aterrissagem em $t = W_{k+1}.t$ com continuidade $C^0$ | M2 | Survey (Explorer 2 & 3) |
| 4 | Speed-Proportional Arc Height Formula | Implementação da física balística $H(\Delta t) \in [6, 25]\text{px}$: arcos baixos para palavras rápidas/staccato e arcos altos para notas longas/pausas lentas | M2 | Survey (Explorer 2 & ORIGINAL_REQUEST) |
| 5 | True Pixel Art Trajectory Arc Rendering | Renderização visual da linha da trajetória no canvas em True Pixel Art (pontilhado discreto $1\times 1$ / grade inteira, guia translúcida à frente da bolinha e rastro iluminado dourado atrás) | M2 | Survey (Explorer 2 & 3, ORIGINAL_REQUEST) |
| 6 | Phrase Transition Smoothness | Transição elegante da bolinha entre o fim de uma estrofe/linha e o início da próxima no pergaminho, sem salto brusco de 200px | M2 | Survey (Explorer 1 & 2) |
| 7 | Unit Test Suite Expansion | Novos testes em `tests/rhythm-karaoke.test.mjs` validando monotonicidade de $H(\Delta t)$, continuidade a 60 FPS ($\Delta x \le 6\text{px}$), True Pixel Art de 1x1 e precisão do relógio | M3 | Survey (Explorer 3) |
| 8 | Playtest & Verification Automation | Integração do estado do karaokê em `window.CrystalTestAPI` e validação com `npm test`, `npm run verify:campaign` e playtest | M3 | Survey (Explorer 3 & AGENTS.md) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Precision Audio Clock & Vocal Sync | Features 1 e 2: Relógio suave a 60 FPS, calibração de latência, timestamps alinhados aos vocais e calibração da janela de clique em `evaluateHit` | none | DONE |
| 2 | M2: Ball Kinematics & True Pixel Art Trajectory | Features 3, 4, 5 e 6: Cinemática contínua sem saltos, fórmula de altura $H(\Delta t)$ (baixo=rápido, alto=lento), renderização visual do arco em True Pixel Art e transição de frases | M1 | DONE |
| 3 | M3: Verification, Test Coverage & Playtest | Features 7 e 8: Suíte de testes em `tests/rhythm-karaoke.test.mjs`, integração em `window.CrystalTestAPI`, verificação com `npm test`, `verify:campaign` e playtest | M2 | DONE |

## Interface Contracts
### `CaveChapter1` ↔ `CaveRhythmKaraoke`
- `CaveChapter1.musicalTime`: Número contínuo com precisão de frações de milissegundo a 60 FPS (sem degraus).
- `CaveRhythmKaraoke.update(dt, musicalTime, isHolding, isPractice)`: Atualiza estados de palavras, notas sustentadas e partículas.
- `CaveRhythmKaraoke.render(ctx, musicalTime, isPractice, customBox)`: Desenha pergaminho, palavras em bitmap, arcos de trajetória pontilhados, approach rings e bolinha saltadora em coordenadas inteiras True Pixel Art.
- `CaveRhythmKaraoke.computeJumpArc(deltaT, deltaX)`: Retorna `{ height, duration, steps }` onde `height` é estritamente proporcional a `deltaT` ($H \in [6, 25]$).
- `CaveRhythmKaraoke.getBallPosition(time, isPractice)`: Retorna `{ x, y, arcActive, arcHeight }` para permitir amostragem contínua pelos testes automatizados.
- `CaveRhythmKaraoke.evaluateHit(time, isPractice)`: Retorna `{ grade, text, score, col, target, diff }` com tolerâncias calibradas para o estímulo vocal.

### `window.CrystalTestAPI` ↔ `CaveChapter1 / CaveRhythmKaraoke`
- `window.CrystalTestAPI.getState()`: Deve incluir `caveKaraoke: { phraseIndex, wordIndex, musicalTime, ballX, ballY, arcHeight }`.

## Code Layout
- `js/true-pixel-cave.js`:
  - `KARAOKE_PHRASES` e `PRACTICE_PHRASE`: Timestamps refinados e alinhados.
  - `CaveRhythmKaraoke`: Métodos `computeJumpArc`, `getBallPosition`, `renderTrajectoryArc`, `evaluateHit`, `update`, `render`.
  - `CaveChapter1`: Relógio de precisão `musicalTime` com interpolação de alta precisão.
- `js/test-harness.js`: Exposição de `caveKaraoke` no `window.CrystalTestAPI`.
- `tests/rhythm-karaoke.test.mjs`: Testes unitários de física do arco, True Pixel Art, continuidade de frames e tolerâncias de clique.
