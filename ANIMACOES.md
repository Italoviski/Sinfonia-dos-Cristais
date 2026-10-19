# Auditoria de animação — 26/09/2026

FPS de poses = quantidade de quadros / duração em segundos. O desenho do navegador com requestAnimationFrame é uma medida diferente. Repetir uma pose ou acelerar quatro poses não cria 60 desenhos distintos por segundo.

| Sequência ativa | Quadros distintos disponíveis | Duração | Cadência das poses | Quadros necessários para 60 poses/s | Faltam |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fada cantando, nova folha | 12 | 1 s | 12/s | 60 | 48 |
| Libertação, nova quebra do cristal | 12 | 1,2 s | 10/s | 72 | 60 |
| Araci musical | 4 | 0,8 s | 5/s | 48 | 44 |
| Irecê musical | 4 | 0,8 s | 5/s | 48 | 44 |
| Jurema musical | 4 | 0,8 s | 5/s | 48 | 44 |
| Onça durante apresentação | 4 | 0,8 s | 5/s | 48 | 44 |
| Fada no mapa, por estado | 4 | 0,68 s | 5,88/s | 41 (arredondado) | 37 |

As folhas de restauração têm quatro estados por objeto. A progressão depende do jogador; não possuem uma duração fixa que permita inferir FPS. O cenário usa transições entre estados, não uma animação desenhada a 60 poses/s.

## Implementado nesta revisão

- Treino musical aguarda indefinidamente o toque após fechar o círculo; toque antecipado não reinicia o ciclo. Mouse, toque e Espaço/Enter continuam disponíveis.
- Acertos mostram anel expansivo, doze fragmentos e julgamento no alvo. Efeito procedural independente da quantidade de poses dos personagens; respeita movimento reduzido.
- Fada presente nas apresentações musicais, com nova folha transparente de 12 poses.
- Quebra de 12 estados antes do diálogo de libertação da Fada, com deslocamento temporal suave e som de recompensa.

## Geração de imagens

Modo: ferramenta nativa de geração de imagens. Arquivos preservados no projeto:

- assets/story/personagens/fada-canto-12-quadros-v2.png
- assets/story/transicoes/libertacao-12-quadros-v2.png

Prompts finais (síntese fiel):

1. Folha pixel art transparente, 4 colunas por 3 linhas, doze poses consecutivas da mesma Fada de pele morena, cabelos castanhos, flor azul, vestido e asas de cristal ciano/lavanda. Cantar e flutuar, escala e âncora constantes, sem texto ou cenário.
2. Folha pixel art transparente, 4 colunas por 3 linhas, doze etapas de cristal ciano/lavanda pendurado: inteiro, rachaduras, ruptura, fragmentos se espalhando e caindo, brilhos finais. Sem Fada desenhada, para composição em camadas.

Duas tentativas anteriores de folhas com 60 poses foram rejeitadas visualmente por cortes e grade irregular. Não foram ligadas ao jogo. A meta de 60 poses distintas/s ainda NÃO foi alcançada. Não há garantia de 60 FPS em qualquer dispositivo.

## Verificações

- 30 testes de regras/campanha aprovados.
- Navegador: clique cedo no treino, espera de 4,2 s, clique tardio inicia música, teclado inicia música, acerto cria efeito e soma 100, modo assistido retoma áudio; sem erros JavaScript.
- Carregamento e apresentação dos quatro mundos, Fada e limpeza da sequência de libertação verificados no navegador.

Pendência: gerar e validar os quadros intermediários indicados na tabela, incluindo continuidade e alinhamento dos personagens musicais. Os novos arquivos são quadros-chave utilizáveis, não uma entrega concluída de todas as animações a 60 poses/s.
