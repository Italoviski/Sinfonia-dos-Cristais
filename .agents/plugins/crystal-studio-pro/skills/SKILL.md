---
name: ai-playtester
description: >-
  Executa playtest automatizado completo do jogo Sinfonia dos Cristais (Crystal Math Mania)
  em um navegador real. Use esta skill sempre que precisar jogar as fases automaticamente,
  testar mecânicas de cristais/equações/ritmo, capturar screenshots para inspeção visual de
  pixel art, medir FPS/telemetria ou auditar acessibilidade (WCAG/ARIA).
---

# AI Playtester — Sinfonia dos Cristais

Esta skill capacita o agente a realizar **Playtest Autônomo End-to-End (E2E)** do jogo usando a API interna `window.CrystalTestAPI` (`js/test-harness.js`) em conjunto com automação de navegador (Playwright / CDP / MCP Playwright).

## 1. O Que Esta Skill Verifica

1. **Integridade de Carregamento e Console**:
   - Zero exceções JS não tratadas (`pageerror`), zero erros de console e zero falhas de rede (`404`) em assets de som, fontes ou sprites.
2. **Fluxo de Telas e Navegação**:
   - Tela Inicial (`#home`) $\rightarrow$ Animação de Entrada (`CrystalEntrance`) $\rightarrow$ Mapa da Jornada (`#map`) $\rightarrow$ Tela de Jogo (`#game`) $\rightarrow$ Diálogos de História (`CrystalStory`) $\rightarrow$ Desafio Musical (`CrystalRhythm`) $\rightarrow$ Apresentação Final (`CrystalShowdown`).
3. **Solucionabilidade Real na UI (Todas as 21 Fases)**:
   - Aciona `window.CrystalTestAPI.solveCurrentLevel()` ou interage com as gemas no DOM/Canvas para comprovar que todas as fases (1 a 21) podem ser concluídas com 3 estrelas.
4. **Telemetria de Desempenho (FPS)**:
   - Coleta métricas de `window.CrystalPerformance.report()` (mediana em ms, P95, P99 e FPS médio).
5. **Auditoria de Acessibilidade**:
   - Verifica `aria-label` dinâmicos nas gemas, botões de ferramentas, contraste (`high-contrast`), redução de movimento (`reduce-motion`) e modo `assist` (Ritmo tranquilo).

## 2. Como Executar o Playtest Automatizado

### Opção A: Via Script Automatizado (Headless Runner)
Execute o script de playtest que sobe o servidor local automaticamente, percorre as fases no navegador e gera o relatório completo + screenshots:
- [playtest.mjs](./scripts/playtest.mjs)

Comando:
```powershell
node .agents/skills/ai-playtester/scripts/playtest.mjs
```
Parâmetros opcionais:
- `--level=5`: Executa playtest focado em uma fase específica (1 a 21).
- `--screenshots`: Salva capturas de tela de cada tela/fase em `playtest-artifacts/`.
- `--rhythm`: Testa especificamente o minigame musical (`CrystalRhythm`).

### Opção B: Via MCP Playwright Interativo
Quando quiser inspecionar visualmente passo a passo:
1. Certifique-se de que o servidor está ativo em `http://127.0.0.1:8080` (`node scripts/serve.mjs`).
2. Navegue para `http://127.0.0.1:8080?autotest=1`.
3. No console do navegador (via `browser_evaluate`), utilize a `window.CrystalTestAPI`:
   - `CrystalTestAPI.getState()` — retorna todo o estado semântico e visual.
   - `CrystalTestAPI.startLevel(id)` — pula diretamente para qualquer fase (`1..21`).
   - `CrystalTestAPI.skipStory()` — avança diálogos ativos de `CrystalStory`.
   - `CrystalTestAPI.getHintAction()` — retorna a próxima ação matemática exata para resolver a fase atual.
   - `CrystalTestAPI.solveCurrentLevel()` — executa a resolução completa da fase atual e retorna o resultado.
   - `CrystalTestAPI.completeRhythm(1.0)` — simula desempenho perfeito no desafio musical para testar recompensas e pós-música.
