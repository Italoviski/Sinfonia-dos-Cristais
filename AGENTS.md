# Diretrizes Oficiais de Engenharia, Design v2, Pixel Art e Acessibilidade — Sinfonia dos Cristais

Este arquivo define as regras obrigatórias (`AGENTS.md`) para todos os agentes que modificam o código, os estilos ou os assets de **Crystal Math Mania — Sinfonia dos Cristais**, alinhadas estritamente ao documento mestre `Crystal-Math-Mania-mecanicas-organizadas-v2.txt` e às pastas `apresentacao-conceitos` e `apresentacao-final`.

## 1. Filosofia Pedagógica e Mecânicas Core (Especificação v2)
- **Matemática 100% Visual e Não-Simbólica (Estilo *DragonBox*)**:
  - A matemática deve acontecer exclusivamente por interações visuais e físicas com os cristais, **sem exigir respostas digitadas, algarismos escritos nas gemas ou contas textuais explícitas na tela** no modo padrão de jogo.
  - Quantidades inteiras são representadas por marcadores visuais luminosos (pontos/facetas/orbes de luz) e frações da **Água-Marinha** por níveis de preenchimento e subdivisão cristalina legíveis (metades e quartos).
- **Diferenciação Estrita entre Clique e Arraste**:
  - **Clique / Toque Único**: Seleciona um cristal (aura roxa ondulante). Clicar no mesmo cristal cancela a seleção. Clicar em outro cristal **conecta** ambos em uma **Equação Cristalina** (aproximação magnética suave + linha energética roxa), mantendo os cristais fisicamente separados.
  - **Arraste**: Move cristais suavemente pelo tabuleiro (permanecendo onde soltos). Arrastar um Quartzo sobre outro **funde** ambos; arrastar uma Opala de Fogo sobre um Quartzo **subtrai** seus valores.
  - **Paredes de Parênteses**: Invisíveis por padrão; revelam-se com brilho e som cristalino quando uma peça tenta entrar ou sair do espaço delimitado da equação.
  - **Ordem Matemática e Conexões Inválidas**: A ordem importa na subtração (`Opala de Fogo`) e na precedência. Conexões inválidas fazem os cristais tremerem, exibem o efeito de rompimento de linha (`efeitos-30-quadros.png`, linha 3) e tocam o som de **rompimento de corda mágica**.
  - **Anulação Sequencial e Combo Audiovisual**: Equações normais só anulam Equações Sombrias equivalentes (mesmos tipos de gemas, estrutura e quantidades; um cristal isolado externo nunca anula uma equação). Na anulação, os cristais quebram **um a um em sequência** com fragmentos caindo e combo sonoro crescente (puramente audiovisual, sem alterar a pontuação).
- **As Gemas do Jogo e as 4 Gemas Primordiais**:
  - **Gemas Jogáveis Ativas**: `Quartzo` (inteiros, fusão), `Opala de Fogo` (subtração com ordem), `Água-Marinha` (frações cortáveis dentro ou fora da equação), `Esmeralda` (portal que dobra valor 1 vez, acelera, dá aura verde permanente e deixa **rastro verde desacoplado**), `Citrino` (divisão em $N$ partes iguais dentro ou fora da equação), `Topázio Imperial` (estados **aceso** com feixe elétrico contínuo vs. **apagado** rotacionável que se eletrifica com luz neon ao receber feixe) e `Diamante` (item bônus de suporte no HUD: +10 ao ser apresentado na Fase 2, +1 por fase concluída; arrastado sobre uma equação normal para desfazer conexões com onda circular branca e detalhes coloridos prismáticos).
  - **Em Espera (`[EM ESPERA]`)**: Mecânicas de incógnita da `Turmalina Paraíba` e pêndulo da `Rubelita` permanecem em espera no gameplay.
  - **4 Gemas Primordiais da Porta Ancestral**: **Gema da Fada** (Caverna, já encaixada no topo da porta no menu v2), **Esmeralda Primordial** (Floresta/Terra), **Turmalina Paraíba Primordial** (Rio/Água) e **Opala de Fogo Primordial** (Caatinga/Sol e Terra).

## 2. Interface (HUD v2), Mapa e Transições
- **Layout do HUD em Jogo**:
  - Interface em **tons de roxo levemente translúcidos**, ocupando a tela inteira (`100vw × 100vh`) e **sem HUD inferior**.
  - **Barra Superior**: Voltar ao mapa, título da fase, barra de pontos com marcos de até **3 estrelas**, botão de **Dica** (destaca visualmente o próximo passo sem resolver sozinho), estoque arrastrável de **Diamantes**, botão de **Reiniciar fase** e **Configurações**.
  - **Painel Lateral Direito (`[MANTIDO]`)**: Deve permanecer na direita para acompanhar as etapas resolvidas da fase com ações específicas e claras (`Fundir`, `Subtrair`, `Dividir`, `Conectar`, `Corresponder`, `Anular`).
  - **Sem Importação/Exportação JSON**: Não exibir botões técnicos de JSON na interface.
- **Mapa de Jornada em 2 Cliques e Porta Final**:
  - 20 fases em 4 biomas (5 nós por região: 4 normais + 1 musical com ícone de nota) + 21º nó dourado da **Porta Ancestral** ao lado da Caverna.
  - **1º Clique**: A fada voa pelo caminho até o nó selecionado. **2º Clique**: Abre o painel temático do bioma (`paineis-mundos.png`) com 3 estrelas, status da fase e botões `Começar` / `Voltar`.

## 3. Fidelidade Estrita ao Pixel Art Verdadeiro (True Pixel Art)
- **Resolução e Escalonamento**: Toda renderização em `<canvas>` e imagens de sprite deve usar `imageSmoothingEnabled = false` no JS e `image-rendering: pixelated` no CSS.
- **Limpeza e Alinhamento de Pranchas (`true-pixel-art-pipeline`)**:
  - Conforme documentado em `apresentacao-final/LEIA-ME.txt`, diversas pranchas (`efeitos-30-quadros.png`, personagens e transições) nasceram como pranchas conceituais com fundos opacos ou grades visíveis. Antes de usá-las em produção, sempre execute a higienização de canal alfa (remoção de fundo opaco/bordas de grade), alinhamento de pivôs e empacotamento em grade inteira (`npm run audit:pixels`).
- **Cadência de Animação**:
  - Loop de física, câmera e partículas na taxa nativa (`60 FPS`), com sprites em pixel art operando entre **12 FPS e 24 FPS**, respeitando `prefers-reduced-motion` / `settings.motion`.

## 4. Acessibilidade Universal (Sem Penalização)
- Usar qualquer recurso de acessibilidade (Dica, Modo Calmo no desafio musical, Fonte Legível, Alto Contraste, Paleta Daltônica, Movimento Reduzido ou Toque Único) **nunca gera penalização** de pontos ou estrelas.
- Paridade total de controles: mouse/arraste, teclado (`Tab`, Setas, `Espaço`/`Enter`, `C`, `Q`, `R`, `D`) e Modo Toque Único.

## 5. Arquitetura, Testes e Playtest Autônomo (IA)
- **Separação Semântica**: `js/rules.js` contém a matemática exata (`Quantity` racional e `Board`); a física (`Matter.js`) e a renderização visual nunca devem introduzir erros de ponto flutuante nos valores das gemas.
- **Contrato de Playtest (`window.CrystalTestAPI`)**:
  - `js/test-harness.js` deve manter `window.CrystalTestAPI` sempre sincronizado com o estado real do jogo.
- **Verificação Obrigatória**:
  - Após alterar qualquer regra, fase, HUD ou cena, execute `npm test`, `npm run verify:campaign` e `npm run playtest`.
