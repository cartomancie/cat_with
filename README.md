# 🐱 Gatinho Faminto

Um joguinho de cuidar de um gato de estimação, feito só com HTML, CSS e JS puro (sem instalar nada).

## Como jogar
1. Extraia o .zip e abra o arquivo `index.html` no navegador (duplo clique).
2. Na primeira vez, escolha um **nome** para o seu gatinho.
3. Cuide dele na tela principal:
   - As barras de **fome** e **felicidade** caem sozinhas com o tempo.
   - Clique em **"Fazer carinho"** para ganhar um pouco de felicidade.
   - Clique em **"Alimentar"** para abrir o minigame de comida.
   - Clique em **"😴 Dormir"** para colocar o gatinho pra dormir — a fome e a
     felicidade caem bem mais devagar enquanto ele descansa. Clique de novo
     ("☀️ Acordar") para acordá-lo.
4. No minigame, toque/clique nas comidinhas que caem antes que elas cheguem ao chão.
   Você tem 3 vidas e 30 segundos. De vez em quando cai um **peixinho bônus** 🐟 —
   pegue-o para ganhar moedas extras (ele não tira vida se cair no chão).
   Ao terminar o minigame alimentando o gato (pelo menos 1 item pego), você ganha
   **25 moedas** fixas, + 10 moedas por peixinho pescado.
5. Clique no botão da **mochila 🎒** (canto inferior direito) para abrir o
   **Mercado** e comprar a **Poção Moyai** por 15 moedas. Depois vá na aba
   **Itens**, clique em "Dar ao gatinho 🐾" — a poção viaja até a boca dele,
   o gatinho fica cheiroso e as bochechas ficam rosinhas por 5 segundos! 💗
6. O progresso é salvo automaticamente no navegador (localStorage), então pode
   fechar e voltar depois — inclusive a fome continua caindo mesmo com o jogo fechado.

## Estrutura dos arquivos
```
gato-game/
├── index.html          → estrutura das telas (nome, casa, mochila, minigame, resultado)
├── css/
│   ├── style.css        → layout, cores, mochila, modal e botões
│   └── animations.css   → todas as animações (idle, feliz, triste, dormindo, rosinha...)
├── js/
│   ├── utils.js          → funções auxiliares (aleatório, toasts, trocar de tela)
│   ├── storage.js         → salvar/carregar o progresso (localStorage)
│   ├── sound.js           → efeitos sonoros gerados via Web Audio API
│   ├── cat.js             → humor do gato, sono, bochechas, barras de status, partículas
│   ├── minigame.js        → motor do minigame de comida/peixe caindo (canvas)
│   ├── shop.js            → mochila: Mercado, Itens e a animação de dar item ao gato
│   └── main.js            → liga tudo: telas, eventos, regras do jogo
└── assets/
    ├── cat.png             → sprite do gatinho (fundo transparente)
    ├── food.png             → sprite da comida
    ├── fish.png              → peixinho bônus que cai no minigame
    ├── backpack.png           → ícone da mochila
    ├── potion.png              → Poção Moyai (item da loja)
    └── cat-sleep-scene.jpg      → cena do gatinho dormindo
```

## Personalizar
- Trocar velocidade de fome/felicidade: edite `HUNGER_DECAY_PER_MIN` e
  `HAPPY_DECAY_PER_MIN` em `js/storage.js`.
- Trocar duração/dificuldade do minigame: edite `timeLeft`, `lives` e
  `spawnInterval` em `js/minigame.js`.
- Trocar chance de aparecer peixinho bônus: edite o `0.16` em `_spawnItem()`
  dentro de `js/minigame.js`.
- Adicionar novos itens na loja: edite o array `SHOP_ITEMS` em `js/shop.js`.
- Trocar sprites: substitua os arquivos em `assets/` por outras imagens
  (de preferência com fundo transparente / PNG).

Divirta-se! 🍞🐾
