# E2E Test Infra: Sinfonia dos Cristais — Fase da Caverna

## Test Philosophy
- Opaque-box, requirement-driven. Derivado estritamente de `ORIGINAL_REQUEST.md` e `PROJECT.md`.
- Metodologia: 4-Tier Test Design (Feature Coverage, Boundary/Corner Cases, Combinations, Real-World Workloads).

## Feature Inventory
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 |
|---|---------|--------|:------:|:------:|:------:|
| 1 | Precision Audio Clock | PROJECT.md §1 | 5 | 5 | ✓ |
| 2 | Vocal Alignment & Hit Window | PROJECT.md §2 | 5 | 5 | ✓ |
| 3 | Continuous Ball Kinematics | PROJECT.md §3 | 5 | 5 | ✓ |
| 4 | Speed-Proportional Arc Height | PROJECT.md §4 | 5 | 5 | ✓ |
| 5 | True Pixel Art Trajectory Rendering | PROJECT.md §5 | 5 | 5 | ✓ |

## Test Architecture
- Test Runner: Node.js `--test` (`tests/*.test.mjs`) e Playwright / CDP Playtester (`.agents/skills/ai-playtester/scripts/playtest.mjs`).
- Output: `TEST_READY.md` ao término com contagem e verificação dos 4 tiers.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Playthrough completo da Fase 5 via automação com registro de hits e zero saltos repentinos | F1, F2, F3, F4, F5 | High |
| 2 | Valsa rápida vs pausa dramática com inspeção de altura e cadência do arco em True Pixel | F3, F4, F5 | Medium |
| 3 | Cliques no ritmo do canto da Fada sob diferentes latências de hardware | F1, F2 | Medium |
