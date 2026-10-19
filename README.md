# Crystal Math Mania

Jogo educativo em HTML5, CSS e JavaScript: matemática representada por cristais, restauração dos biomas brasileiros e desafios de ritmo com a música fornecida pelo projeto.

## Executar localmente

Com Node.js instalado, abra esta pasta no terminal e execute `npm start`. Acesse http://127.0.0.1:8080 no navegador. Não são necessárias dependências npm externas.

Use o servidor local: abrir index.html por duplo clique pode impedir a análise musical por restrições do navegador. O servidor aceita requisições parciais de áudio e vídeo e atende somente neste computador.

## Controles

- Arraste com mouse ou dedo para mover. Soltar mantém o cristal no local; Quartzo funde e Opala subtrai por arrasto.
- Clique/toque seleciona. Clique novamente cancela; selecionar outra peça conecta sem fundir.
- No teclado: Tab focaliza; Espaço/Enter seleciona ou conecta; setas movem; C corta Água-Marinha; Q divide Citrino.
- A alça move toda a equação. O Diamante desfaz conexões normais, preservando valores.
- No mapa, selecione uma fase para a Fada caminhar até ela. Selecione novamente para abrir o painel de desempenho e começar.
- No musical, clique quando o anel alcançar o círculo de fundo. Espaço/Enter acerta o alvo mais próximo do tempo correto. Escape pausa.
- Ritmo tranquilo espera pelo toque, sem expirar a nota; narrador, contraste e movimento reduzido estão nas configurações.

## Progresso

20 fases em Caverna, Floresta, Rio e Caatinga, mais a fase final no começo da Caverna. As especiais liberam as quatro gemas primordiais. O progresso e os melhores resultados ficam no navegador. O estoque de Diamantes vale somente na sessão: dez ao apresentar a mecânica, um por fase concluída, um consumido por uso. Não há importação ou exportação de fases por JSON.

## Organização

- `index.html`, `css/`: telas, HUD e responsividade.
- `js/rules.js`, `js/equations.js`, `js/kinetic.js`: regras exatas, adaptação visual e física.
- `js/campaign-current.js`: campanha ativa; `campaign.js` fornece o catálogo base de gemas.
- `js/story.js`, `scenery.js`, `stage.js`, `journey-map.js`: narrativa, restauração, personagens e mapa.
- `js/music.js`, `audio.js`, `rhythm.js`: composição progressiva, efeitos e minigame musical.
- `js/score.js`: balanceamento provisório de pontos e estrelas, separado das regras.
- `assets/story/`: cenários, personagens, porta, mapas e transições aprovados.
- `assets/audio/`: música original enviada para o projeto.
- `tests/`: testes de regras e soluções semânticas da campanha; `npm test`.
- `scripts/`: servidor local e preparação de arquivos; `npm run build` gera `dist/`, sem publicar.

Arquivos legados como `game.js`, `storage.js` e os antigos dados em `data/` não são carregados pela entrada atual.

## Estado de desenvolvimento

A integração está em andamento. O ritmo usa detecção antecipada de transientes do áudio, ainda sujeita à revisão musical; não é um beatmap manual. Os descontos e limites de estrelas são provisórios. As medições de FPS dependem do navegador, tela e hardware; testes pontuais próximos de 60 FPS não garantem a mesma taxa em todo dispositivo. Ainda há requisitos em revisão, portanto esta não é uma declaração de versão final.
