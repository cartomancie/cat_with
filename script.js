// ---------- utils.js ----------
// Funções pequenas e reutilizáveis usadas pelo resto do jogo.

const Utils = {
  clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
  },

  rand(min, max){
    return Math.random() * (max - min) + min;
  },

  randInt(min, max){
    return Math.floor(this.rand(min, max + 1));
  },

  choice(arr){
    return arr[this.randInt(0, arr.length - 1)];
  },

  showToast(message, duration = 2200){
    const toast = document.getElementById('toast');
    if(!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  },

  showScreen(id){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
  },

  formatSeconds(s){
    return Math.max(0, Math.ceil(s));
  }
};
// ---------- storage.js ----------
// Guarda e recupera o estado do bichinho no localStorage do navegador,
// incluindo o cálculo de fome/felicidade perdidas enquanto o jogo estava fechado.

const STORAGE_KEY = 'gatinho-faminto-save-v1';

const HUNGER_DECAY_PER_MIN = 1.4;   // quanto de fome cai por minuto real
const HAPPY_DECAY_PER_MIN  = 0.9;   // quanto de felicidade cai por minuto real

const Storage = {
  getDefaultState(){
    return {
      name: '',
      gender: null,         // 'boy' ou 'girl' — escolhido na tela inicial
      hunger: 100,
      happy: 100,
      coins: 0,
      lastUpdate: Date.now(),
      totalFed: 0,
      sleeping: false,
      inventory: { potion: 0 },
      outfits: {},          // roupas já compradas, ex: { 'roupa-giy': true }
      equippedOutfit: null  // id da roupa vestida agora (null = original)
    };
  },

  load(){
    let raw;
    try{
      raw = localStorage.getItem(STORAGE_KEY);
    }catch(e){
      return this.getDefaultState();
    }
    if(!raw) return this.getDefaultState();

    let state;
    try{
      state = JSON.parse(raw);
    }catch(e){
      return this.getDefaultState();
    }

    // Aplica decaimento pelo tempo que passou desde a última visita
    // (a não ser que o gatinho estivesse dormindo, aí a fome cai mais devagar)
    const now = Date.now();
    const minutesPassed = Math.max(0, (now - (state.lastUpdate || now)) / 60000);
    const decayFactor = state.sleeping ? 0.25 : 1;
    state.hunger = Utils.clamp(state.hunger - minutesPassed * HUNGER_DECAY_PER_MIN * decayFactor, 0, 100);
    state.happy  = Utils.clamp(state.happy  - minutesPassed * HAPPY_DECAY_PER_MIN * decayFactor, 0, 100);
    state.lastUpdate = now;
    state.coins = state.coins || 0;
    state.totalFed = state.totalFed || 0;
    state.sleeping = !!state.sleeping;
    state.inventory = state.inventory || { potion: 0 };
    state.inventory.potion = state.inventory.potion || 0;
    state.outfits = state.outfits || {};
    state.equippedOutfit = state.equippedOutfit || null;
    state.gender = state.gender || null;

    // Migração: saves antigos guardavam a roupa rosa com o id 'roupa-giy'.
    // Continua reconhecendo quem já tinha comprado, agora com o id novo 'rosa'.
    if(state.outfits['roupa-giy'] && !state.outfits['rosa']){
      state.outfits['rosa'] = true;
      delete state.outfits['roupa-giy'];
    }
    if(state.equippedOutfit === 'roupa-giy'){
      state.equippedOutfit = 'rosa';
    }

    return state;
  },

  save(state){
    state.lastUpdate = Date.now();
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(e){
      // localStorage indisponível (modo privado, etc) - o jogo segue funcionando sem salvar
    }
  },

  reset(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
  }
};
// ---------- sound.js ----------
// Pequenos efeitos sonoros gerados por osciladores, sem precisar de arquivos .mp3.

const Sound = {
  ctx: null,

  _ensureCtx(){
    if(!this.ctx){
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if(AudioCtx) this.ctx = new AudioCtx();
    }
    if(this.ctx && this.ctx.state === 'suspended'){
      this.ctx.resume();
    }
    return this.ctx;
  },

  _beep({freq = 440, duration = 0.12, type = 'sine', volume = 0.18, glide = 0}){
    const ctx = this._ensureCtx();
    if(!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if(glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + glide), ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  },

  catch(){
    this._beep({freq: 620, duration: 0.1, type: 'triangle', glide: 260, volume: 0.16});
  },

  catchFish(){
    this._beep({freq: 720, duration: 0.12, type: 'sine', glide: 320, volume: 0.16});
    setTimeout(() => this._beep({freq: 900, duration: 0.1, type: 'triangle', glide: 200, volume: 0.12}), 60);
  },

  miss(){
    this._beep({freq: 220, duration: 0.18, type: 'sawtooth', glide: -100, volume: 0.12});
  },

  pet(){
    this._beep({freq: 500, duration: 0.08, type: 'sine', glide: 120, volume: 0.12});
  },

  feedComplete(){
    this._ensureCtx();
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this._beep({freq: f, duration: 0.16, type: 'triangle', volume: 0.15}), i * 90);
    });
  },

  sad(){
    this._beep({freq: 300, duration: 0.3, type: 'sine', glide: -140, volume: 0.1});
  },

  click(){
    this._beep({freq: 380, duration: 0.06, type: 'square', volume: 0.08});
  },

  buy(){
    this._ensureCtx();
    [440, 660].forEach((f, i) => {
      setTimeout(() => this._beep({freq: f, duration: 0.12, type: 'triangle', volume: 0.14}), i * 80);
    });
  },

  coin(){
    this._beep({freq: 880, duration: 0.09, type: 'square', glide: 240, volume: 0.12});
  },

  sleep(){
    this._beep({freq: 260, duration: 0.4, type: 'sine', glide: -80, volume: 0.1});
  },

  wake(){
    this._beep({freq: 500, duration: 0.18, type: 'sine', glide: 140, volume: 0.14});
  },

  sparkle(){
    this._beep({freq: 1000, duration: 0.15, type: 'sine', glide: 400, volume: 0.1});
  }
};
// ---------- cat.js ----------
// Controla a aparência, humor e as pequenas partículas (corações / migalhas) do gato.

const Cat = {
  els: {},

  init(){
    this.els.sprite = document.getElementById('cat-sprite');
    this.els.wrapper = document.getElementById('cat-wrapper');
    this.els.mood = document.getElementById('mood-bubble');
    this.els.nameDisplay = document.getElementById('cat-name-display');
    this.els.hungerFill = document.getElementById('hunger-fill');
    this.els.happyFill = document.getElementById('happy-fill');
    this.els.hungerValue = document.getElementById('hunger-value');
    this.els.happyValue = document.getElementById('happy-value');
    this.els.hungerBarBg = this.els.hungerFill.parentElement;
    this.els.heartsLayer = document.getElementById('hearts-layer');
    this.els.crumbsLayer = document.getElementById('crumbs-layer');
    this.els.feedBtn = document.getElementById('btn-feed');
    this.els.petBtn = document.getElementById('btn-pet');
    this.els.sleepBtn = document.getElementById('btn-sleep');
    this.els.sleepCard = document.getElementById('sleep-card');
    this.els.sleepImg = document.getElementById('sleep-scene-img');
  },

  moodFor(hunger, happy){
    if(hunger < 15) return {emoji: '😿', label: 'sad'};
    if(hunger < 40) return {emoji: '😾', label: 'sad'};
    if(happy > 70 && hunger > 60) return {emoji: '😻', label: 'happy'};
    if(hunger >= 40 && hunger <= 70) return {emoji: '😺', label: 'idle'};
    return {emoji: '😸', label: 'idle'};
  },

  render(state){
    this.els.nameDisplay.textContent = state.name || 'Miau';
    this.els.hungerValue.textContent = Math.round(state.hunger);
    this.els.happyValue.textContent = Math.round(state.happy);
    this.els.hungerFill.style.width = state.hunger + '%';
    this.els.happyFill.style.width = state.happy + '%';

    this.els.hungerBarBg.classList.toggle('critical', state.hunger < 20);
    this.els.feedBtn.classList.toggle('attention', state.hunger < 35 && !state.sleeping);

    // ---- Roupa: troca o sprite acordado/dormindo conforme a roupa vestida ----
    const outfit = (typeof Shop !== 'undefined') ? Shop.getOutfit(state.equippedOutfit) : null;
    if(outfit){
      if(this.els.sprite.dataset.outfit !== outfit.id){
        this.els.sprite.src = outfit.catSprite;
        this.els.sprite.dataset.outfit = outfit.id || '';
      }
      if(this.els.sleepImg && this.els.sleepImg.dataset.outfit !== outfit.id){
        this.els.sleepImg.src = outfit.sleepScene;
        this.els.sleepImg.dataset.outfit = outfit.id || '';
      }
    }

    // ---- Dormindo: troca a cena inteira do gato ----
    const sleeping = !!state.sleeping;
    this.els.wrapper.classList.toggle('hidden-el', sleeping);
    this.els.sleepCard.classList.toggle('active', sleeping);
    this.els.feedBtn.disabled = sleeping;
    this.els.petBtn.disabled = sleeping;
    if(this.els.sleepBtn){
      this.els.sleepBtn.textContent = sleeping ? '☀️ Acordar' : '😴 Dormir';
    }

    if(sleeping){
      if(this.els.mood.textContent !== '😴'){
        this.els.mood.textContent = '😴';
        this.els.mood.classList.remove('pop');
        void this.els.mood.offsetWidth;
        this.els.mood.classList.add('pop');
      }
      return;
    }

    const mood = this.moodFor(state.hunger, state.happy);
    if(this.els.mood.textContent !== mood.emoji){
      this.els.mood.textContent = mood.emoji;
      this.els.mood.classList.remove('pop');
      void this.els.mood.offsetWidth; // reinicia a animação
      this.els.mood.classList.add('pop');
    }

    // Só troca a classe de humor "de repouso" se não houver uma animação de ação tocando
    if(!this.els.sprite.classList.contains('_action')){
      this.els.sprite.classList.remove('idle', 'sad');
      this.els.sprite.classList.add(mood.label === 'sad' ? 'sad' : 'idle');
    }
  },

  playAction(name, duration){
    const sprite = this.els.sprite;
    sprite.classList.add('_action');
    sprite.classList.remove('idle', 'happy', 'eating', 'sad', 'petting');
    sprite.classList.add(name);
    clearTimeout(this._actionTimer);
    this._actionTimer = setTimeout(() => {
      sprite.classList.remove(name, '_action');
    }, duration);
  },

  // ---- Efeito "cheiroso e rosinha" ao dar a poção ----
  blush(duration = 5000){
    const wrapper = this.els.wrapper;
    wrapper.classList.remove('blushing');
    void wrapper.offsetWidth;
    wrapper.classList.add('blushing');
    this.spawnHearts(3);
    clearTimeout(this._blushTimer);
    this._blushTimer = setTimeout(() => {
      wrapper.classList.remove('blushing');
    }, duration);
  },

  spawnHearts(count = 5){
    const layer = this.els.heartsLayer;
    const rect = this.els.wrapper.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const originX = rect.left - layerRect.left + rect.width / 2;
    const originY = rect.top - layerRect.top + rect.height * 0.25;

    for(let i = 0; i < count; i++){
      const heart = document.createElement('span');
      heart.className = 'heart-particle';
      heart.textContent = Utils.choice(['💛', '💕', '✨']);
      heart.style.left = (originX + Utils.rand(-30, 30)) + 'px';
      heart.style.top = originY + 'px';
      heart.style.setProperty('--dx', Utils.rand(-40, 40) + 'px');
      heart.style.animationDelay = (i * 60) + 'ms';
      layer.appendChild(heart);
      setTimeout(() => heart.remove(), 1400);
    }
  },

  spawnCrumbs(count = 8){
    const layer = this.els.crumbsLayer;
    const rect = this.els.wrapper.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const originX = rect.left - layerRect.left + rect.width / 2;
    const originY = rect.top - layerRect.top + rect.height * 0.5;

    for(let i = 0; i < count; i++){
      const crumb = document.createElement('span');
      crumb.className = 'crumb-particle';
      crumb.textContent = Utils.choice(['🍞', '✨', '⭐']);
      crumb.style.left = originX + 'px';
      crumb.style.top = originY + 'px';
      crumb.style.setProperty('--dx', Utils.rand(-70, 70) + 'px');
      crumb.style.setProperty('--dy', Utils.rand(-60, 10) + 'px');
      crumb.style.setProperty('--rot', Utils.rand(-180, 180) + 'deg');
      layer.appendChild(crumb);
      setTimeout(() => crumb.remove(), 800);
    }
  }
};
// ---------- minigame.js ----------
// Minigame simples em canvas: comidinhas (e peixinhos bônus) caem do topo e o
// jogador precisa tocar/clicar nelas antes que cheguem ao chão. Sem dependências externas.

const Minigame = {
  canvas: null,
  ctx: null,
  foodImg: null,
  fishImg: null,
  running: false,

  items: [],
  particles: [],

  timeLeft: 30,
  lives: 3,
  caught: 0,
  fishCaught: 0,
  spawnTimer: 0,
  spawnInterval: 900,
  difficultyTimer: 0,

  onFinish: null,

  init(){
    this.canvas = document.getElementById('mg-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.foodImg = new Image();
    this.foodImg.src = 'food.png';
    this.fishImg = new Image();
    this.fishImg.src = 'fish.png';

    this.canvas.addEventListener('pointerdown', (e) => this._handleTap(e));
    window.addEventListener('resize', () => this._resizeCanvas());
  },

  _resizeCanvas(){
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  },

  start(onFinish){
    this._resizeCanvas();
    this.items = [];
    this.particles = [];
    this.timeLeft = 30;
    this.lives = 3;
    this.caught = 0;
    this.fishCaught = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 900;
    this.difficultyTimer = 0;
    this.onFinish = onFinish;
    this.running = true;

    document.getElementById('mg-time').textContent = this.timeLeft;
    document.getElementById('mg-caught').textContent = this.caught;
    const fishEl = document.getElementById('mg-fish');
    if(fishEl) fishEl.textContent = this.fishCaught;
    this._renderLives();

    this._lastTs = performance.now();
    requestAnimationFrame((ts) => this._loop(ts));
  },

  stop(){
    this.running = false;
  },

  _renderLives(){
    document.getElementById('mg-lives').textContent = '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(3 - Math.max(0, this.lives));
  },

  // Calcula as dimensões/posição reais do peixe desenhado, usadas tanto
  // pra desenhar quanto pra detectar o clique (assim os dois nunca ficam
  // fora de sincronia de novo).
  _fishBox(it){
    const img = this.fishImg;
    let w, h;
    if(img && img.complete && img.naturalWidth){
      w = it.r * 1.8;
      h = w * (img.naturalHeight / img.naturalWidth);
    }else{
      // Proporção aproximada da arte do peixe (alta e fina) como reserva
      w = it.r * 1.8;
      h = w * 3.25;
    }
    const offsetY = -h * 0.32;
    return { w, h, offsetY };
  },

  _handleTap(e){
    if(!this.running) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for(let i = this.items.length - 1; i >= 0; i--){
      const it = this.items[i];

      if(it.type === 'fish'){
        // Peixe: caixa retangular alinhada com o desenho real (imagem alta e fina),
        // com uma margem de folga pra facilitar o toque.
        const { w, h, offsetY } = this._fishBox(it);
        const pad = 12;
        const left = it.x - w / 2 - pad;
        const right = it.x + w / 2 + pad;
        const top = it.y + offsetY - pad;
        const bottom = it.y + offsetY + h + pad;
        if(x >= left && x <= right && y >= top && y <= bottom){
          this._catchItem(i);
          return;
        }
      }else{
        const dx = x - it.x;
        const dy = y - it.y;
        if(Math.sqrt(dx * dx + dy * dy) < it.r + 10){
          this._catchItem(i);
          return;
        }
      }
    }
  },

  _catchItem(index){
    const it = this.items[index];
    this.items.splice(index, 1);

    if(it.type === 'fish'){
      this.fishCaught++;
      const fishEl = document.getElementById('mg-fish');
      if(fishEl) fishEl.textContent = this.fishCaught;
      Sound.catchFish();
      this._spawnBurst(it.x, it.y, ['#7EC8E3', '#BEE9FF', '#FFF', '#4FAE86']);
    }else{
      this.caught++;
      document.getElementById('mg-caught').textContent = this.caught;
      Sound.catch();
      this._spawnBurst(it.x, it.y, ['#F6CE55', '#F28C77', '#7FD8B0', '#FFF']);
    }
  },

  _spawnBurst(x, y, colors){
    for(let i = 0; i < 10; i++){
      const angle = Utils.rand(0, Math.PI * 2);
      const speed = Utils.rand(60, 180);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: Utils.choice(colors || ['#F6CE55', '#F28C77', '#7FD8B0', '#FFF']),
        size: Utils.rand(3, 6)
      });
    }
  },

  _spawnItem(){
    const isFish = Math.random() < 0.16;
    const r = isFish ? Utils.rand(16, 20) : Utils.rand(22, 30);
    this.items.push({
      type: isFish ? 'fish' : 'food',
      x: Utils.rand(r, this.width - r),
      y: -r,
      r,
      vy: Utils.rand(70, 110) + (30 - this.timeLeft) * 2,
      rot: Utils.rand(0, Math.PI * 2),
      vrot: Utils.rand(-1.5, 1.5)
    });
  },

  _loop(ts){
    if(!this.running) return;
    const dt = Math.min(0.05, (ts - this._lastTs) / 1000);
    this._lastTs = ts;

    this._update(dt);
    this._draw();

    if(this.timeLeft > 0 && this.lives > 0){
      requestAnimationFrame((t) => this._loop(t));
    }else{
      this.running = false;
      if(this.onFinish) this.onFinish({caught: this.caught, fishCaught: this.fishCaught, timeUp: this.timeLeft <= 0});
    }
  },

  _update(dt){
    this.timeLeft -= dt;
    document.getElementById('mg-time').textContent = Utils.formatSeconds(this.timeLeft);

    this.spawnTimer += dt * 1000;
    this.difficultyTimer += dt * 1000;
    if(this.difficultyTimer > 4000){
      this.difficultyTimer = 0;
      this.spawnInterval = Math.max(420, this.spawnInterval - 60);
    }
    if(this.spawnTimer > this.spawnInterval){
      this.spawnTimer = 0;
      this._spawnItem();
    }

    for(let i = this.items.length - 1; i >= 0; i--){
      const it = this.items[i];
      it.y += it.vy * dt;
      it.rot += it.vrot * dt;
      if(it.y - it.r > this.height){
        this.items.splice(i, 1);
        if(it.type !== 'fish'){
          this.lives--;
          this._renderLives();
          Sound.miss();
        }
      }
    }

    for(let i = this.particles.length - 1; i >= 0; i--){
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.life -= dt * 1.6;
      if(p.life <= 0) this.particles.splice(i, 1);
    }
  },

  _draw(){
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // linha de "chão" indicando perigo
    ctx.save();
    ctx.strokeStyle = 'rgba(217,105,79,.35)';
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.height - 6);
    ctx.lineTo(this.width, this.height - 6);
    ctx.stroke();
    ctx.restore();

    this.items.forEach(it => {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.type === 'fish' ? 0 : it.rot);
      if(it.type === 'fish'){
        const img = this.fishImg;
        const { w, h, offsetY } = this._fishBox(it);
        if(img.complete && img.naturalWidth){
          ctx.drawImage(img, -w / 2, offsetY, w, h);
        }else{
          ctx.fillStyle = '#7EC8E3';
          ctx.beginPath();
          ctx.arc(0, 0, it.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }else{
        const size = it.r * 2;
        if(this.foodImg.complete && this.foodImg.naturalWidth){
          ctx.drawImage(this.foodImg, -size / 2, -size / 2 * 0.55, size, size * 0.55);
        }else{
          ctx.fillStyle = '#F6CE55';
          ctx.beginPath();
          ctx.arc(0, 0, it.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });

    this.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
};
// ---------- shop.js ----------
// Controla a mochila: aba Mercado (comprar itens) e aba Itens (usar/dar ao gato).

const SHOP_ITEMS = [
  {
    id: 'potion',
    name: 'Poção Moyai',
    price: 15,
    icon: 'potion.png',
    desc: 'Deixa seu gatinho cheiroso e rosinha por alguns segundos.'
  }
];

// ---------- Roupinhas ----------
// Roupas compradas ficam guardadas em state.outfits (id -> true).
// A "Roupa Amarela" é sempre grátis e representa o gato sem roupa nenhuma (skin original).
const OUTFIT_ITEMS = [
  {
    id: 'rosa',
    name: 'Roupa Rosa',
    price: 400,
    icon: 'Rouparose.png',                   // ícone da roupa (mercado/itens)
    catSprite: 'roupa-giy.png',              // gato acordado usando a roupa rosa
    sleepScene: 'cat-sleep-scene-giy.jpg',   // gato dormindo usando a roupa rosa
    desc: 'Um casaquinho rosa fofo pro seu gatinho.'
  },
  {
    id: 'may',
    name: 'Roupa Mey',
    price: 400,
    icon: 'cat-roupa-May.png',               // ícone da roupa (mercado/itens)
    catSprite: 'cat-equip-may.png',          // gato acordado usando a roupa mey
    sleepScene: 'dormiu-may.png',            // gato dormindo usando a roupa mey
    desc: 'Uma roupinha mey estilosa pro seu gatinho.'
  }
];

const ORIGINAL_OUTFIT = {
  id: null,
  name: 'Roupa Amarela',
  icon: 'cat-roupa-giy.png',
  catSprite: 'cat.png',
  sleepScene: 'cat-sleep-scene.jpg',
  desc: 'O jeitinho natural do seu gatinho, sem roupa nenhuma.'
};

const Shop = {
  els: {},
  activeTab: 'market',

  init(getState, onChange){
    this.getState = getState;
    this.onChange = onChange;

    this.els.btnOpen = document.getElementById('btn-backpack');
    this.els.overlay = document.getElementById('backpack-modal');
    this.els.btnClose = document.getElementById('btn-close-backpack');
    this.els.tabBtns = document.querySelectorAll('.tab-btn');
    this.els.panelMarket = document.getElementById('tab-market');
    this.els.panelItems = document.getElementById('tab-items');
    this.els.modalCoins = document.getElementById('modal-coins');
    this.els.itemsEmpty = document.getElementById('items-empty');
    this.els.badge = document.getElementById('potion-badge');

    this.els.btnOpen.addEventListener('click', () => this.open());
    this.els.btnClose.addEventListener('click', () => this.close());
    this.els.overlay.addEventListener('click', (e) => {
      if(e.target === this.els.overlay) this.close();
    });

    this.els.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    this._renderMarket();
    this.renderAll();
  },

  open(){
    Sound.click();
    this.renderAll();
    this.els.overlay.classList.add('active');
  },

  close(){
    this.els.overlay.classList.remove('active');
  },

  switchTab(tab){
    this.activeTab = tab;
    this.els.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    this.els.panelMarket.classList.toggle('active', tab === 'market');
    this.els.panelItems.classList.toggle('active', tab === 'items');
    if(tab === 'items') this._renderItems();
  },

  renderAll(){
    const state = this.getState();
    this.els.modalCoins.textContent = state.coins;
    this._renderMarket();
    this._renderItems();
    this._renderBadge();
  },

  _renderBadge(){
    const state = this.getState();
    const count = state.inventory.potion || 0;
    if(count > 0){
      this.els.badge.hidden = false;
      this.els.badge.textContent = count;
    }else{
      this.els.badge.hidden = true;
    }
  },

  _renderMarket(){
    const state = this.getState();
    this.els.panelMarket.innerHTML = '';

    SHOP_ITEMS.forEach(item => {
      const canAfford = state.coins >= item.price;
      const card = document.createElement('div');
      card.className = 'shop-item';
      card.innerHTML = `
        <img class="shop-item-img" src="${item.icon}" alt="${item.name}">
        <div class="shop-item-info">
          <b>${item.name}</b>
          <p>${item.desc}</p>
        </div>
        <button class="btn btn-primary btn-buy" ${canAfford ? '' : 'disabled'}>${item.price} 🪙</button>
      `;
      card.querySelector('.btn-buy').addEventListener('click', () => this.buy(item.id));
      this.els.panelMarket.appendChild(card);
    });

    // Roupas ainda não compradas aparecem no Mercado
    OUTFIT_ITEMS.filter(o => !state.outfits[o.id]).forEach(outfit => {
      const canAfford = state.coins >= outfit.price;
      const card = document.createElement('div');
      card.className = 'shop-item';
      card.innerHTML = `
        <img class="shop-item-img" src="${outfit.icon}" alt="${outfit.name}">
        <div class="shop-item-info">
          <b>${outfit.name}</b>
          <p>${outfit.desc}</p>
        </div>
        <button class="btn btn-primary btn-buy" ${canAfford ? '' : 'disabled'}>${outfit.price} 🪙</button>
      `;
      card.querySelector('.btn-buy').addEventListener('click', () => this.buyOutfit(outfit.id));
      this.els.panelMarket.appendChild(card);
    });
  },

  _renderItems(){
    const state = this.getState();
    this.els.panelItems.innerHTML = '';
    this.els.panelItems.appendChild(this.els.itemsEmpty);

    const owned = SHOP_ITEMS.filter(item => (state.inventory[item.id] || 0) > 0);
    // Roupas: original é sempre "possuída" (grátis), + roupas já compradas
    const ownedOutfits = [ORIGINAL_OUTFIT, ...OUTFIT_ITEMS.filter(o => state.outfits[o.id])];

    // sempre há pelo menos a Roupa Original, então a mochila nunca fica vazia de verdade
    this.els.itemsEmpty.style.display = 'none';

    owned.forEach(item => {
      const count = state.inventory[item.id] || 0;
      const card = document.createElement('div');
      card.className = 'inv-item';
      card.innerHTML = `
        <img class="inv-item-img" src="${item.icon}" alt="${item.name}">
        <div class="inv-item-info"><b>${item.name}</b><span>x<span class="inv-count">${count}</span></span></div>
        <button class="btn btn-secondary btn-give">Dar ao gatinho 🐾</button>
      `;
      const img = card.querySelector('.inv-item-img');
      card.querySelector('.btn-give').addEventListener('click', () => this.giveToCat(item.id, img));
      this.els.panelItems.appendChild(card);
    });

    ownedOutfits.forEach(outfit => {
      const isEquipped = (state.equippedOutfit || null) === outfit.id;
      const card = document.createElement('div');
      card.className = 'inv-item';
      card.innerHTML = `
        <img class="inv-item-img" src="${outfit.icon}" alt="${outfit.name}">
        <div class="inv-item-info"><b>${outfit.name}</b><span>${outfit.id ? '' : 'Grátis'}</span></div>
        <button class="btn ${isEquipped ? 'btn-primary' : 'btn-secondary'} btn-wear" ${isEquipped ? 'disabled' : ''}>
          ${isEquipped ? 'Vestida ✓' : 'Vestir 👕'}
        </button>
      `;
      card.querySelector('.btn-wear').addEventListener('click', () => this.wearOutfit(outfit.id));
      this.els.panelItems.appendChild(card);
    });
  },

  buy(itemId){
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    const state = this.getState();
    if(!item || state.coins < item.price){
      Sound.sad();
      Utils.showToast('Moedas insuficientes! Alimente seu gatinho para ganhar mais 🪙');
      return;
    }
    state.coins -= item.price;
    state.inventory[item.id] = (state.inventory[item.id] || 0) + 1;
    Sound.buy();
    Utils.showToast(`${item.name} comprada! 🎉`);
    this.onChange();
    this.renderAll();
  },

  getOutfit(id){
    if(!id) return ORIGINAL_OUTFIT;
    return OUTFIT_ITEMS.find(o => o.id === id) || ORIGINAL_OUTFIT;
  },

  buyOutfit(outfitId){
    const outfit = OUTFIT_ITEMS.find(o => o.id === outfitId);
    const state = this.getState();
    if(!outfit || state.outfits[outfitId] || state.coins < outfit.price){
      Sound.sad();
      Utils.showToast('Moedas insuficientes! Alimente seu gatinho para ganhar mais 🪙');
      return;
    }
    state.coins -= outfit.price;
    state.outfits[outfitId] = true;
    // ao comprar, o gatinho já veste a roupa na hora
    state.equippedOutfit = outfitId;
    Sound.buy();
    this.onChange();
    this.switchTab('items');
    this.renderAll();
    Utils.showToast(`${outfit.name} comprada e vestida! 🎉`);
  },

  wearOutfit(outfitId){
    const state = this.getState();
    if(outfitId && !state.outfits[outfitId]) return; // segurança
    state.equippedOutfit = outfitId || null;
    Sound.click();
    this.onChange();
    this.renderAll();
    const outfit = this.getOutfit(outfitId);
    Utils.showToast(`${state.name || 'Seu gatinho'} vestiu ${outfit.name}! ✨`);
  },

  giveToCat(itemId, imgEl){
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    const state = this.getState();
    if(!item || (state.inventory[itemId] || 0) <= 0) return;

    // Guarda a posição/imagem do item AGORA, porque renderAll() vai
    // reconstruir a lista e apagar o elemento original do DOM.
    const startRect = imgEl.getBoundingClientRect();
    const iconSrc = imgEl.src;

    state.inventory[itemId]--;

    // Se o gato estiver dormindo, acorda com a poção :)
    const wasSleeping = state.sleeping;
    state.sleeping = false;

    // Atualiza a UI (e "acorda" o gato no DOM) ANTES de medir a posição dele,
    // senão o cálculo do voo do item pega um elemento ainda escondido.
    this.onChange();
    this.renderAll();
    this._flyToCat(startRect, iconSrc);

    setTimeout(() => {
      this.close();
      Cat.playAction('eating', 900);
      Cat.blush(5000);
      Sound.feedComplete();
      state.happy = Utils.clamp(state.happy + 15, 0, 100);
      this.onChange();
      Utils.showToast(`${state.name || 'Seu gatinho'} ficou cheiroso e rosinha! 💗`);
      if(wasSleeping) Utils.showToast(`${state.name || 'Seu gatinho'} acordou! ☀️`);
    }, 650);
  },

  // Anima o ícone do item "voando" até a boca do gatinho
  _flyToCat(startRect, iconSrc){
    if(!startRect || !startRect.width) return;
    const catEl = document.getElementById('cat-sprite');
    const catRect = catEl.getBoundingClientRect();

    const flying = document.createElement('img');
    flying.src = iconSrc;
    flying.className = 'flying-item';
    flying.style.left = startRect.left + 'px';
    flying.style.top = startRect.top + 'px';
    flying.style.width = startRect.width + 'px';
    document.body.appendChild(flying);

    const endX = catRect.left + catRect.width * 0.5 - startRect.width / 2;
    const endY = catRect.top + catRect.height * 0.35 - startRect.width / 2;

    requestAnimationFrame(() => {
      flying.style.transform = `translate(${endX - startRect.left}px, ${endY - startRect.top}px) scale(.3) rotate(20deg)`;
      flying.style.opacity = '0.2';
    });

    setTimeout(() => flying.remove(), 700);
  }
};
// ---------- main.js ----------
// Orquestra as telas, o estado salvo e liga os botões da interface.

let state = Storage.load();
let decayLoop = null;
let renamingMode = false;
let migrationMode = false;   // true quando é uma conta antiga que só precisa escolher o gatinho
let selectedGender = null;

function persist(){
  Storage.save(state);
}

function updateHomeUI(){
  Cat.render(state);
  document.getElementById('coins-display').textContent = state.coins;
  const modalCoins = document.getElementById('modal-coins');
  if(modalCoins) modalCoins.textContent = state.coins;
}

function startDecayLoop(){
  clearInterval(decayLoop);
  decayLoop = setInterval(() => {
    if(state.sleeping){
      // fome/felicidade caem bem mais devagar enquanto o gatinho dorme
      state.hunger = Utils.clamp(state.hunger - (HUNGER_DECAY_PER_MIN / 60) * 0.25, 0, 100);
      state.happy = Utils.clamp(state.happy - (HAPPY_DECAY_PER_MIN / 60) * 0.25, 0, 100);
    }else{
      state.hunger = Utils.clamp(state.hunger - HUNGER_DECAY_PER_MIN / 60, 0, 100);
      state.happy = Utils.clamp(state.happy - HAPPY_DECAY_PER_MIN / 60, 0, 100);
    }
    updateHomeUI();
    persist();

    if(state.hunger < 15 && !state.sleeping && Math.random() < 0.15){
      Utils.showToast(`${state.name} está com muita fome... 🍞`);
    }
  }, 1000);
}

function goHome(){
  Utils.showScreen('screen-home');
  updateHomeUI();
}

// ---------- Tela: nome do gato ----------
function initNameScreen(){
  const input = document.getElementById('input-name');
  const btn = document.getElementById('btn-confirm-name');
  const error = document.getElementById('name-error');
  const genderWrap = document.getElementById('gender-select');
  const genderBtns = document.querySelectorAll('.gender-option');

  genderBtns.forEach(b => {
    b.addEventListener('click', () => {
      selectedGender = b.dataset.gender;
      genderBtns.forEach(x => x.classList.toggle('selected', x === b));
      error.textContent = '';
    });
  });

  const confirm = () => {
    const value = input.value.trim();
    if(value.length < 1){
      error.textContent = 'Digite um nome para o gatinho!';
      return;
    }
    if(value.length > 16){
      error.textContent = 'Nome muito grande (máx. 16 letras).';
      return;
    }
    if(!renamingMode && !selectedGender){
      error.textContent = 'Escolha um gatinho pra continuar!';
      return;
    }
    error.textContent = '';
    state.name = value;

    if(renamingMode){
      renamingMode = false;
      persist();
      goHome();
      Utils.showToast('Nome atualizado! ✨');
    }else if(migrationMode){
      // Conta antiga: só faltava escolher o gatinho, o nome continua o mesmo
      state.gender = selectedGender;
      migrationMode = false;
      persist();
      goHome();
      Utils.showToast(`Bem-vindo(a) de volta, ${state.name}! 🐾`);
    }else{
      state.gender = selectedGender;
      state.hunger = 100;
      state.happy = 100;
      persist();
      Sound.feedComplete();
      goHome();
      Utils.showToast(`Bem-vindo(a), ${state.name}! 🐾`);
    }
  };

  btn.addEventListener('click', confirm);
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') confirm();
  });
}

function showAdoptionScreen(){
  const genderWrap = document.getElementById('gender-select');
  const genderBtns = document.querySelectorAll('.gender-option');
  selectedGender = null;
  genderBtns.forEach(b => b.classList.remove('selected'));
  genderWrap.style.display = '';

  const input = document.getElementById('input-name');
  input.value = migrationMode ? state.name : '';
  document.getElementById('name-error').textContent = '';
  document.querySelector('.name-card h1').textContent = 'Que gatinho fofo!';
  document.querySelector('.name-card p').textContent = 'Como você quer chamá-lo?';
  document.getElementById('btn-confirm-name').textContent = 'Adotar 🐾';

  Utils.showScreen('screen-name');
}

function openRenameScreen(){
  renamingMode = true;
  const input = document.getElementById('input-name');
  input.value = state.name;
  document.getElementById('name-error').textContent = '';
  document.querySelector('.name-card h1').textContent = 'Trocar o nome';
  document.querySelector('.name-card p').textContent = 'Como prefere chamá-lo agora?';
  document.getElementById('btn-confirm-name').textContent = 'Salvar nome';
  document.getElementById('gender-select').style.display = 'none';
  Utils.showScreen('screen-name');
  input.focus();
}

// ---------- Tela: casa ----------
function initHomeScreen(){
  document.getElementById('btn-rename').addEventListener('click', openRenameScreen);

  document.getElementById('btn-pet').addEventListener('click', () => {
    if(state.sleeping) return;
    Sound.pet();
    Cat.playAction('petting', 500);
    Cat.spawnHearts(4);
    state.happy = Utils.clamp(state.happy + 3, 0, 100);
    updateHomeUI();
    persist();
  });

  document.getElementById('btn-feed').addEventListener('click', () => {
    if(state.sleeping) return;
    startFeedMinigame();
  });

  document.getElementById('btn-sleep').addEventListener('click', () => {
    state.sleeping = !state.sleeping;
    if(state.sleeping){
      Sound.sleep();
      Utils.showToast(`${state.name || 'Seu gatinho'} foi dormir... 😴`);
    }else{
      Sound.wake();
      Utils.showToast(`${state.name || 'Seu gatinho'} acordou! ☀️`);
    }
    updateHomeUI();
    persist();
  });
}

// ---------- Minigame ----------
function startFeedMinigame(){
  Utils.showScreen('screen-minigame');
  Minigame.start((result) => {
    finishFeedMinigame(result);
  });
}

function finishFeedMinigame(result){
  const hungerGain = result.caught * 9;
  const happyGain = result.caught * 3;
  // Cuidar do gatinho (alimentar) rende moedas fixas por sessão + bônus por peixe
  const coinsGain = (result.caught > 0 ? 25 : 0) + (result.fishCaught || 0) * 10;

  state.hunger = Utils.clamp(state.hunger + hungerGain, 0, 100);
  state.happy = Utils.clamp(state.happy + happyGain, 0, 100);
  state.coins += coinsGain;
  state.totalFed += result.caught;
  persist();

  updateHomeUI();
  document.getElementById('result-caught').textContent = result.caught;
  document.getElementById('result-coins').textContent = coinsGain;

  let emoji = '🎉', title = 'Muito bem!', desc = `${state.name} adorou a refeição!`;
  if(result.caught === 0){
    emoji = '😿'; title = 'Ih, não rolou...';
    desc = `${state.name} continua com fome. Tente de novo!`;
  }else if(result.caught < 4){
    emoji = '🙂'; title = 'Foi alguma coisa!';
    desc = `${state.name} comeu um pouquinho.`;
  }else if(result.caught >= 10){
    emoji = '🤩'; title = 'Show de bola!';
    desc = `${state.name} ficou super satisfeito!`;
  }
  if(result.fishCaught > 0){
    desc += ` E ainda pescou ${result.fishCaught} peixinho${result.fishCaught > 1 ? 's' : ''} bônus! 🐟`;
  }

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-desc').textContent = desc;

  Utils.showScreen('screen-result');

  if(result.caught > 0){
    Sound.feedComplete();
  }else{
    Sound.sad();
  }
}

function initResultScreen(){
  document.getElementById('btn-back-home').addEventListener('click', () => {
    goHome();
    if(state.totalFed > 0){
      Cat.playAction('eating', 1000);
      setTimeout(() => Cat.spawnCrumbs(6), 100);
    }
  });
}

// ---------- Boot ----------
function boot(){
  Cat.init();
  Minigame.init();
  initNameScreen();
  initHomeScreen();
  initResultScreen();
  Shop.init(() => state, () => { updateHomeUI(); persist(); });

  document.getElementById('coins-display').textContent = state.coins;

  if(!state.name){
    migrationMode = false;
    showAdoptionScreen();
  }else if(!state.gender){
    migrationMode = true;
    showAdoptionScreen();
  }else{
    goHome();
  }

  startDecayLoop();
}

document.addEventListener('DOMContentLoaded', boot);

