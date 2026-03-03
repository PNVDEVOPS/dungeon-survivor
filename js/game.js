"use strict";
// ===== DUNGEON SURVIVOR v8 =====
// Fixes: balance, auto-fire, bullet hell, SDK, optimization

const C = document.getElementById('G'), X = C.getContext('2d');
const PX = CONFIG.PIXEL_SIZE, ZOOM = CONFIG.ZOOM, WORLD_R = CONFIG.WORLD_RADIUS, SPD = CONFIG.MOVEMENT_SPEED_MULT;
const MAX_PARTICLES = CONFIG.MAX_PARTICLES, MAX_ENEMIES = CONFIG.MAX_ENEMIES, MAX_PROJ = CONFIG.MAX_PROJECTILES, MAX_EB = CONFIG.MAX_ENEMY_BULLETS;

function W() { return window.innerWidth }
function H() { return window.innerHeight }
function resize() { C.width = W(); C.height = H(); X.imageSmoothingEnabled = false }
resize(); window.addEventListener('resize', resize);
const isMob = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
if (isMob) document.getElementById('tl').style.display = 'block';

// ===== DELTA TIME =====
let lastTime = 0, dt = 1, fpsArr = [], fpsDisplay = 0;

// ===== AUDIO =====
let actx = null;
function iA() { if (!actx) try { actx = new (window.AudioContext || window.webkitAudioContext)() } catch (e) { } }
function snd(f, d, v, t, sl) { if (!actx) return; let o = actx.createOscillator(), g = actx.createGain(); o.type = t || 'square'; o.frequency.value = f; if (sl) o.frequency.linearRampToValueAtTime(sl, actx.currentTime + d); g.gain.value = Math.min(v || .1, .12); g.gain.linearRampToValueAtTime(0, actx.currentTime + d); o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d) }
function noi(d, v) { if (!actx) return; let b = actx.createBuffer(1, actx.sampleRate * d, actx.sampleRate), dt2 = b.getChannelData(0); for (let i = 0; i < dt2.length; i++) dt2[i] = Math.random() * 2 - 1; let s = actx.createBufferSource(), g = actx.createGain(); s.buffer = b; g.gain.value = Math.min(v || .05, .08); g.gain.linearRampToValueAtTime(0, actx.currentTime + d); s.connect(g); g.connect(actx.destination); s.start() }
function sfxS() { snd(700, .05, .07, 'square', 180); noi(.03, .04) }
function sfxH() { snd(180, .07, .05, 'sawtooth', 70) }
function sfxK() { snd(350, .08, .06, 'square', 700) }
function sfxL() { snd(550, .1, .07, 'sine', 1100); setTimeout(() => snd(800, .12, .07, 'sine', 1300), 80) }
function sfxB() { snd(80, .25, .08, 'sawtooth', 40); noi(.15, .07) }
function sfxR() { snd(280, .1, .04, 'triangle', 550) }
function sfxC() { snd(1100, .06, .05, 'sine', 1500) }
function sfxX() { noi(.12, .08); snd(70, .16, .07, 'sawtooth', 25) }
function sfxD() { snd(130, .08, .05, 'sawtooth', 40) }

// ===== SAVE =====
const SAVE_KEY = 'ds8';
const DEFAULT_SAVE = {
  coins: 100, ad2d: 0, adDt: '', chO: ['knight', 'mage'], gnO: ['plasma_pistol', 'frost_smg', 'thunder_shotgun'],
  chL: {}, gnL: {}, sL: { hp: 0, spd: 0, arm: 0, crit: 0, xp: 0, mag: 0 },
  sCh: 'knight', sGn: 'plasma_pistol', tK: 0
};
let sv = null;

async function loadSave() {
  sv = await SDK.loadData(SAVE_KEY, { ...DEFAULT_SAVE });
  // Ensure all fields exist (migration)
  for (let k in DEFAULT_SAVE) { if (sv[k] === undefined) sv[k] = DEFAULT_SAVE[k]; }
  if (!sv.sL) sv.sL = { ...DEFAULT_SAVE.sL };
  if (!sv.gnL) sv.gnL = {};
  if (!sv.chL) sv.chL = {};
}

function saveg() {
  SDK.saveData(SAVE_KEY, sv);
}

function showAd(cb) {
  // Try real SDK ad first
  if (SDK.platform !== 'standalone') {
    SDK.showRewarded(cb);
    return;
  }
  // Fallback: fake ad timer
  document.getElementById('ao').classList.add('a');
  let t = 5;
  document.getElementById('atm').textContent = t;
  let iv = setInterval(() => {
    t--; document.getElementById('atm').textContent = t;
    if (t <= 0) { clearInterval(iv); document.getElementById('ao').classList.remove('a'); cb() }
  }, 1000);
}

// ===== CHARACTERS =====
const CHARS = [
  {
    id: 'knight', name: 'Рыцарь', icon: '⚔️', desc: 'Крепкий боец.', cost: 0,
    b: { hp: 6, spd: 2.3, arm: 3, dm: 1 },
    passive: 'Щит: блок 15% урона', ability: 'Удар Щитом: отбрасывает врагов',
    pFn: p => { p.block = .15 },
    aFn: p => {
      let n = 0; for (let e of ens) {
        let d = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);
        if (d < 90) { let a = Math.atan2(e.y - p.y, e.x - p.x); e.x += Math.cos(a) * 80; e.y += Math.sin(a) * 80; hitE(e, 8 * p.dM); n++ }
      }
      if (boss) { let d = Math.sqrt((boss.x - p.x) ** 2 + (boss.y - p.y) ** 2); if (d < 100) { hitE(boss, 12 * p.dM) } }
      if (n || boss) shk = 8, shkI = 7; part(p.x, p.y, '#ffd700', 12, 5)
    }, aCD: 420
  },
  {
    id: 'mage', name: 'Маг', icon: '🔮', desc: 'Мощная магия.', cost: 0,
    b: { hp: 4, spd: 2.5, arm: 0, dm: 1.2 },
    passive: 'Урон ×1.2, взрывы +30%', ability: 'Метеор: AoE удар в позицию',
    pFn: p => { p.expB = 1.3 },
    aFn: p => {
      let mx = mouse.x, my = mouse.y;
      let wx = (mx - W() / 2) / ZOOM + cam.x, wy = (my - H() / 2) / ZOOM + cam.y;
      setTimeout(() => {
        part(wx, wy, '#ff4020', 25, 7); sfxX(); shk = 10; shkI = 8;
        for (let e of ens) { if (Math.sqrt((e.x - wx) ** 2 + (e.y - wy) ** 2) < 80) hitE(e, 20 * p.dM) }
        if (boss && Math.sqrt((boss.x - wx) ** 2 + (boss.y - wy) ** 2) < 90) hitE(boss, 20 * p.dM)
      }, 300);
      part(wx, wy, '#ff8040', 8, 2)
    }, aCD: 480
  },
  {
    id: 'ranger', name: 'Рейнджер', icon: '🏹', desc: 'Быстрый стрелок.', cost: 150,
    b: { hp: 5, spd: 3.1, arm: 1, dm: 1.05 },
    passive: '-15% кулдауны', ability: 'Рывок: быстрый бросок вперёд',
    pFn: p => { p.cdB = .85 },
    aFn: p => { let a = Math.atan2(mouse.y - H() / 2, mouse.x - W() / 2); p.x += Math.cos(a) * 120; p.y += Math.sin(a) * 120; p.inv = 30; part(p.x, p.y, '#00ff88', 10, 4) }, aCD: 240
  },
  {
    id: 'necro', name: 'Некромант', icon: '💀', desc: 'Тёмная магия.', cost: 250,
    b: { hp: 4, spd: 2.3, arm: 0, dm: 1.1 },
    passive: 'Вампиризм 5%', ability: 'Взрыв Душ: урон всем вокруг',
    pFn: p => { p.vamp = .05 },
    aFn: p => {
      for (let e of ens) { let d = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2); if (d < 130) hitE(e, 12 * p.dM) }
      if (boss && Math.sqrt((boss.x - p.x) ** 2 + (boss.y - p.y) ** 2) < 140) hitE(boss, 12 * p.dM);
      part(p.x, p.y, '#a040ff', 20, 6); shk = 6; shkI = 5
    }, aCD: 360
  },
  {
    id: 'cyborg', name: 'Киборг', icon: '🤖', desc: 'Техно-воин.', cost: 400,
    b: { hp: 5, spd: 2.7, arm: 2, dm: 1.08 },
    passive: 'Щит 1♥ каждые 12с', ability: 'Турель: авто-стреляет 5с',
    pFn: p => { p.shM = 1; p.sh = 1; p.shC = 720 },
    aFn: p => { turrets.push({ x: p.x, y: p.y, life: 300, t: 0, dm: 4 * p.dM }) }, aCD: 540
  },
  {
    id: 'paladin', name: 'Паладин', icon: '✝️', desc: 'Святой воин.', cost: 300,
    b: { hp: 7, spd: 2.0, arm: 4, dm: 0.95 },
    passive: 'Аура Исцеления: +3% HP/сек', ability: 'Священный Молот: оглушение вокруг',
    pFn: p => { p.holyAura = 0.03 },
    aFn: p => {
      for (let e of ens) {
        let d = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);
        if (d < 120) { hitE(e, 15 * p.dM); e.sl = Math.max(e.sl || 0, 120) }
      }
      if (boss) { let d = Math.sqrt((boss.x - p.x) ** 2 + (boss.y - p.y) ** 2); if (d < 130) { hitE(boss, 15 * p.dM); boss.sl = 60 } }
      part(p.x, p.y, '#ffe080', 20, 6); shk = 10; shkI = 8; snd(600, .12, .08, 'sine', 1200)
    }, aCD: 480
  },
  {
    id: 'berserker', name: 'Берсерк', icon: '🪓', desc: 'Ярость = сила.', cost: 200,
    b: { hp: 5, spd: 2.8, arm: 1, dm: 1.0 },
    passive: 'Ярость: ×1.5 урон при HP<40%', ability: 'Вихрь: крутящийся удар вокруг',
    pFn: p => { p.rageThreshold = 0.4; p.rageDmgMult = 1.5 },
    aFn: p => {
      let hits = 0;
      for (let e of ens) {
        let d = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);
        if (d < 100) { hitE(e, 10 * p.dM); let a = Math.atan2(e.y - p.y, e.x - p.x); e.x += Math.cos(a) * 40; e.y += Math.sin(a) * 40; hits++ }
      }
      if (boss) { let d = Math.sqrt((boss.x - p.x) ** 2 + (boss.y - p.y) ** 2); if (d < 110) hitE(boss, 10 * p.dM) }
      part(p.x, p.y, '#ff4040', 15, 6); shk = 8; shkI = 7; if (hits > 0) { p.hp = Math.min(p.mH, p.hp + hits * 0.5) }
    }, aCD: 300
  },
];

// ===== GUNS (NERFED - lower damage, balanced fire rates) =====
const GUNS = [
  { id: 'plasma_pistol', name: 'Плазма Пистолет', icon: '🔫', desc: 'Надёжный.', cost: 0, dm: 6, rate: 22, mag: 16, rld: 65, spr: .06, spd: 7, col: '#00ff88', pR: 3, sp: null, t: 's' },
  { id: 'arcane_rifle', name: 'Аркан. Винтовка', icon: '🔮', desc: 'Пробивает.', cost: 100, dm: 10, rate: 35, mag: 8, rld: 80, spr: .03, spd: 9, col: '#a060ff', pR: 3, sp: 'pierce', prc: 3, t: 's' },
  { id: 'thunder_shotgun', name: 'Дробовик', icon: '⚡', desc: '5 картечин.', cost: 120, dm: 4, rate: 48, mag: 5, rld: 90, spr: .18, spd: 6, col: '#ffcc00', pR: 3, sp: 'multi', pel: 5, t: 'sp' },
  { id: 'frost_smg', name: 'Морозный ПП', icon: '❄️', desc: 'Замедляет.', cost: 100, dm: 3, rate: 10, mag: 35, rld: 70, spr: .12, spd: 7, col: '#60d0ff', pR: 2, sp: 'slow', slA: 90, t: 's' },
  { id: 'fire_launcher', name: 'Огнемёт', icon: '🔥', desc: 'Взрывы.', cost: 200, dm: 14, rate: 55, mag: 6, rld: 100, spr: .07, spd: 5, col: '#ff6020', pR: 5, sp: 'exp', exR: 50, t: 's' },
  { id: 'railgun', name: 'Рельсотрон', icon: '⚡', desc: 'Сквозь всех.', cost: 300, dm: 22, rate: 70, mag: 3, rld: 110, spr: 0, spd: 20, col: '#ff40ff', pR: 2, sp: 'beam', prc: 99, t: 'b' },
  { id: 'void_cannon', name: 'Пушка Бездны', icon: '🕳️', desc: 'Чёрная дыра.', cost: 350, dm: 25, rate: 80, mag: 3, rld: 120, spr: .04, spd: 3.5, col: '#8020e0', pR: 7, sp: 'vort', vR: 75, vD: 110, t: 's' },
  { id: 'minigun', name: 'Миниган', icon: '💎', desc: 'Быстрый.', cost: 250, dm: 2, rate: 5, mag: 80, rld: 115, spr: .19, spd: 8, col: '#20ffff', pR: 2, sp: null, t: 's' },
];

// ===== ENEMIES (BUFFED HP ×3-4) =====
const ET = {
  slime: {
    r: 10, spd: .55, hp: 45, xp: 1, dm: 1, col: '#40c040',
    draw(x, y, f, a) { let p = PX; X.fillStyle = f ? '#fff' : '#2a8a2a'; X.fillRect(x - p * 3, y, p * 6, p * 2); X.fillStyle = f ? '#fff' : '#40c040'; X.fillRect(x - p * 3, y - p * 2, p * 6, p * 3); X.fillRect(x - p * 2, y - p * 3, p * 4, p); X.fillStyle = '#60e060'; X.fillRect(x - p * 2, y - p * 2, p * 2, p); X.fillRect(x + p, y - p * 2, p, p); X.fillStyle = '#111'; X.fillRect(x - p * 2, y - p * 2, p, p); X.fillRect(x + p * 2, y - p * 2, p, p) }
  },
  bat: {
    r: 8, spd: 1.1, hp: 25, xp: 1, dm: 1, col: '#a060d0',
    draw(x, y, f, a) { let p = PX, w = Math.sin(a * .25) * 3 | 0; X.fillStyle = f ? '#fff' : '#7030a0'; X.fillRect(x - p * (4 + w), y - p, p * (2 + w), p * 2); X.fillRect(x + p * 2, y - p, p * (2 + w), p * 2); X.fillStyle = f ? '#fff' : '#a060d0'; X.fillRect(x - p * 2, y - p * 2, p * 4, p * 4); X.fillStyle = '#ff2020'; X.fillRect(x - p, y - p, p, p); X.fillRect(x + p, y - p, p, p) }
  },
  skeleton: {
    r: 11, spd: .65, hp: 65, xp: 2, dm: 1, col: '#d0c8b0',
    draw(x, y, f, a) { let p = PX; X.fillStyle = f ? '#fff' : '#b0a890'; X.fillRect(x - p * 2, y - p * 4, p * 4, p * 4); X.fillRect(x - p * 1.5, y, p * 3, p * 4); X.fillStyle = '#111'; X.fillRect(x - p, y - p * 3, p, p); X.fillRect(x + p, y - p * 3, p, p); X.fillRect(x - p * .5, y - p * 1.5, p, p); X.fillStyle = f ? '#fff' : '#908870'; X.fillRect(x - p * 3, y - p * 2, p, p * 3); X.fillRect(x + p * 2, y - p * 2, p, p * 3) }
  },
  spider: {
    r: 9, spd: .95, hp: 35, xp: 1, dm: 1, col: '#505050',
    draw(x, y, f, a) { let p = PX, l = Math.sin(a * .18) * p | 0; X.fillStyle = f ? '#fff' : '#404040'; X.fillRect(x - p * 2, y - p, p * 4, p * 3); X.fillStyle = f ? '#fff' : '#505050'; for (let i = -1; i <= 1; i += 2) { X.fillRect(x + i * p * 3, y - p * 2 + l, p, p * 3); X.fillRect(x + i * p * 4, y + l, p, p * 2) } X.fillStyle = '#ff0000'; X.fillRect(x - p, y - p, p, p); X.fillRect(x + p, y - p, p, p) }
  },
  orc: {
    r: 14, spd: .42, hp: 140, xp: 3, dm: 1, col: '#408040',
    draw(x, y, f, a) { let p = PX; X.fillStyle = f ? '#fff' : '#306030'; X.fillRect(x - p * 3, y, p * 6, p * 5); X.fillStyle = f ? '#fff' : '#408040'; X.fillRect(x - p * 3, y - p * 4, p * 6, p * 5); X.fillRect(x - p * 4, y - p * 2, p * 2, p * 4); X.fillRect(x + p * 3, y - p * 2, p * 2, p * 4); X.fillStyle = '#111'; X.fillRect(x - p * 2, y - p * 3, p * 1.5, p * 1.5); X.fillRect(x + p, y - p * 3, p * 1.5, p * 1.5); X.fillStyle = '#ddd'; X.fillRect(x - p, y - p, p * .8, p); X.fillRect(x + p, y - p, p * .8, p) }
  },
  mage_e: {
    r: 11, spd: .48, hp: 75, xp: 3, dm: 1, col: '#8040c0', shoots: true, sCD: 100,
    draw(x, y, f, a) { let p = PX; X.fillStyle = f ? '#fff' : '#6030a0'; X.fillRect(x - p * 2, y, p * 4, p * 4); X.fillStyle = f ? '#fff' : '#8040c0'; X.fillRect(x - p * 2.5, y - p * 4, p * 5, p * 5); X.fillStyle = f ? '#fff' : '#a060e0'; X.fillRect(x - p * 3, y - p * 5, p * 6, p * 2); X.fillStyle = '#f0d0ff'; X.fillRect(x - p, y - p * 3, p, p); X.fillRect(x + p, y - p * 3, p, p); X.fillStyle = '#c0a060'; X.fillRect(x + p * 3, y - p * 5, p, p * 7); X.fillStyle = '#e040ff'; X.fillRect(x + p * 2.5, y - p * 6, p * 2, p * 2) }
  },
  ghost: {
    r: 12, spd: .75, hp: 55, xp: 2, dm: 1, col: '#8090d0', isGhost: true,
    draw(x, y, f, a) { let p = PX; X.globalAlpha = .6; X.fillStyle = f ? '#fff' : '#8090d0'; X.fillRect(x - p * 3, y - p * 3, p * 6, p * 6); X.fillRect(x - p * 2, y + p * 3, p, p * 2); X.fillRect(x, y + p * 3, p, p * 3); X.fillRect(x + p * 2, y + p * 3, p, p * 2); X.fillStyle = '#111'; X.fillRect(x - p * 1.5, y - p * 2, p * 1.5, p * 2); X.fillRect(x + p, y - p * 2, p * 1.5, p * 2); X.globalAlpha = 1 }
  },
  demon: {
    r: 13, spd: .58, hp: 120, xp: 4, dm: 1, col: '#c03030', shoots: true, sCD: 85,
    draw(x, y, f, a) { let p = PX; X.fillStyle = f ? '#fff' : '#a02020'; X.fillRect(x - p * 3, y - p * 2, p * 6, p * 6); X.fillStyle = f ? '#fff' : '#c03030'; X.fillRect(x - p * 3, y - p * 5, p * 6, p * 4); X.fillStyle = f ? '#fff' : '#e04040'; X.fillRect(x - p * 4, y - p * 6, p * 2, p * 3); X.fillRect(x + p * 3, y - p * 6, p * 2, p * 3); X.fillStyle = '#ff0'; X.fillRect(x - p * 1.5, y - p * 4, p * 1.5, p * 1.5); X.fillRect(x + p, y - p * 4, p * 1.5, p * 1.5) }
  },
  golem: {
    r: 18, spd: .28, hp: 250, xp: 5, dm: 2, col: '#6a6a70',
    draw(x, y, f, a) { let p = PX; X.fillStyle = f ? '#fff' : '#5a5a64'; X.fillRect(x - p * 5, y - p * 2, p * 10, p * 7); X.fillStyle = f ? '#fff' : '#6a6a70'; X.fillRect(x - p * 4, y - p * 6, p * 8, p * 5); X.fillStyle = f ? '#fff' : '#7a7a84'; X.fillRect(x - p * 3, y - p * 8, p * 6, p * 3); X.fillStyle = f ? '#fff' : '#4a4a54'; X.fillRect(x - p * 6, y - p * 3, p * 3, p * 5); X.fillRect(x + p * 4, y - p * 3, p * 3, p * 5); X.fillStyle = '#40a0ff'; X.fillRect(x - p * 2, y - p * 5, p * 1.5, p * 1.5); X.fillRect(x + p, y - p * 5, p * 1.5, p * 1.5) }
  },
  dragon: {
    r: 15, spd: .62, hp: 170, xp: 5, dm: 2, col: '#e06020', shoots: true, sCD: 80,
    draw(x, y, f, a) { let p = PX, w = Math.sin(a * .12) * p | 0; X.fillStyle = f ? '#fff' : '#c04010'; X.fillRect(x - p * 4, y - p * 2, p * 8, p * 5); X.fillStyle = f ? '#fff' : '#e06020'; X.fillRect(x - p * 3, y - p * 5, p * 6, p * 4); X.fillStyle = f ? '#fff' : '#d05818'; X.fillRect(x - p * 7, y - p * 4 + w, p * 4, p * 3); X.fillRect(x + p * 4, y - p * 4 - w, p * 4, p * 3); X.fillStyle = '#ff0'; X.fillRect(x - p * 2, y - p * 4, p, p); X.fillRect(x + p * 2, y - p * 4, p, p); X.fillStyle = f ? '#fff' : '#c04010'; X.fillRect(x - p * 5, y + p, p * 2, p); X.fillRect(x - p * 6, y + p * 2, p * 2, p) }
  },
  // --- NEW ENEMIES ---
  bomber: {
    r: 10, spd: .85, hp: 30, xp: 2, dm: 3, col: '#ff6040', isBomber: true,
    draw(x, y, f, a) { let p = PX; X.fillStyle = f ? '#fff' : '#c04020'; X.fillRect(x - p * 2, y - p * 2, p * 4, p * 5); X.fillStyle = f ? '#fff' : '#ff6040'; X.fillRect(x - p * 3, y - p * 3, p * 6, p * 3); X.fillStyle = '#ff0'; X.fillRect(x - p, y - p * 4, p * 2, p); let blink = Math.sin(a * .3) > 0; if (blink) { X.fillStyle = '#ff0000'; X.fillRect(x - p * .5, y - p * 5, p, p) } X.fillStyle = '#111'; X.fillRect(x - p, y - p * 2, p, p); X.fillRect(x + p, y - p * 2, p, p) }
  },
  shielder: {
    r: 13, spd: .40, hp: 180, xp: 4, dm: 1, col: '#4080c0', hasShield: true,
    draw(x, y, f, a) { let p = PX; X.fillStyle = f ? '#fff' : '#305880'; X.fillRect(x - p * 3, y - p * 3, p * 6, p * 7); X.fillStyle = f ? '#fff' : '#4080c0'; X.fillRect(x - p * 2, y - p * 5, p * 4, p * 3); X.fillStyle = '#3090d0'; X.fillRect(x - p * 5, y - p * 4, p * 3, p * 6); X.fillStyle = '#50b0ff'; X.fillRect(x - p * 4, y - p * 3, p, p * 4); X.fillStyle = '#111'; X.fillRect(x - p, y - p * 4, p, p); X.fillRect(x + p, y - p * 4, p, p) }
  },
  healer: {
    r: 10, spd: .35, hp: 60, xp: 4, dm: 1, col: '#40c080', isHealer: true, sCD: 90,
    draw(x, y, f, a) { let p = PX; X.fillStyle = f ? '#fff' : '#208050'; X.fillRect(x - p * 2, y - p * 1, p * 4, p * 5); X.fillStyle = f ? '#fff' : '#40c080'; X.fillRect(x - p * 2, y - p * 4, p * 4, p * 4); X.fillStyle = '#80ffb0'; X.fillRect(x - p * .5, y - p * 3, p, p * 3); X.fillRect(x - p * 1.5, y - p * 2, p * 3, p); X.fillStyle = '#111'; X.fillRect(x - p, y - p * 3, p, p); X.fillRect(x + p, y - p * 3, p, p) }
  },
  assassin: {
    r: 9, spd: 1.4, hp: 40, xp: 3, dm: 2, col: '#8030a0', isAssassin: true,
    draw(x, y, f, a) { let p = PX; X.globalAlpha = .75; X.fillStyle = f ? '#fff' : '#502070'; X.fillRect(x - p * 2, y - p * 1, p * 4, p * 4); X.fillStyle = f ? '#fff' : '#8030a0'; X.fillRect(x - p * 2, y - p * 4, p * 4, p * 4); X.fillStyle = '#c060ff'; X.fillRect(x - p, y - p * 3, p, p); X.fillRect(x + p, y - p * 3, p, p); X.fillStyle = '#aaa'; X.fillRect(x + p * 2, y - p * 2, p * 3, p); X.globalAlpha = 1 }
  },
  necro_e: {
    r: 12, spd: .38, hp: 90, xp: 5, dm: 1, col: '#6020a0', isNecromancer: true,
    draw(x, y, f, a) { let p = PX; X.fillStyle = f ? '#fff' : '#3a1060'; X.fillRect(x - p * 3, y - p * 1, p * 6, p * 6); X.fillStyle = f ? '#fff' : '#6020a0'; X.fillRect(x - p * 3, y - p * 5, p * 6, p * 5); X.fillStyle = f ? '#fff' : '#8040c0'; X.fillRect(x - p * 2, y - p * 7, p * 4, p * 3); X.fillStyle = '#c080ff'; X.fillRect(x - p, y - p * 4, p, p); X.fillRect(x + p, y - p * 4, p, p); X.fillStyle = '#b0a060'; X.fillRect(x + p * 3, y - p * 7, p, p * 8); X.fillStyle = '#40ff80'; X.fillRect(x + p * 2.5, y - p * 8, p * 2, p * 2) }
  },
  worm: {
    r: 7, spd: .70, hp: 20, xp: 1, dm: 1, col: '#a08040', isWorm: true,
    draw(x, y, f, a) { let p = PX, w = Math.sin(a * .2) * p | 0; X.fillStyle = f ? '#fff' : '#806030'; X.fillRect(x - p * 2, y - p + w, p * 4, p * 2); X.fillStyle = f ? '#fff' : '#a08040'; X.fillRect(x - p * 3, y - p * .5 + w, p * 2, p); X.fillRect(x + p, y - p * .5 - w, p * 2, p); X.fillStyle = '#111'; X.fillRect(x - p, y - p * .5, p * .5, p * .5); X.fillRect(x + p * .5, y - p * .5, p * .5, p * .5) }
  },
};

// ===== BOSSES =====
const BOSS = [
  {
    name: 'GOBLIN WARLORD', r: 30, spd: .5, hp: 1500, xp: 80, dm: 2, col: '#40c040', atks: ['charge', 'ring', 'summon'], ph: 2,
    draw(x, y, f, a) {
      let p = PX;
      X.fillStyle = f ? '#fff' : '#306030'; X.fillRect(x - p * 8, y + p, p * 16, p * 7);
      X.fillStyle = f ? '#fff' : '#408040'; X.fillRect(x - p * 8, y - p * 6, p * 16, p * 8);
      X.fillStyle = f ? '#fff' : '#50a050'; X.fillRect(x - p * 6, y - p * 10, p * 12, p * 5);
      X.fillStyle = '#f0c030'; X.fillRect(x - p * 5, y - p * 12, p * 10, p * 2);
      X.fillRect(x - p * 5, y - p * 14, p * 2, p * 2); X.fillRect(x - p * 1, y - p * 14, p * 2, p * 2); X.fillRect(x + p * 3, y - p * 14, p * 2, p * 2);
      X.fillStyle = f ? '#fff' : '#408040'; X.fillRect(x - p * 11, y - p * 4, p * 3, p * 8); X.fillRect(x + p * 8, y - p * 4, p * 3, p * 8);
      X.fillStyle = '#888'; X.fillRect(x + p * 11, y - p * 8, p * 2, p * 10); X.fillStyle = '#aaa'; X.fillRect(x + p * 10, y - p * 10, p * 5, p * 4);
      X.fillStyle = '#ff0'; X.fillRect(x - p * 4, y - p * 9, p * 2.5, p * 2); X.fillRect(x + p * 2, y - p * 9, p * 2.5, p * 2);
      X.fillStyle = '#fff'; X.fillRect(x - p * 3, y - p * 5, p * 1.5, p * 2.5); X.fillRect(x + p * 2, y - p * 5, p * 1.5, p * 2.5)
    }
  },
  {
    name: 'VOID SORCERER', r: 35, spd: .35, hp: 2400, xp: 120, dm: 2, col: '#8020e0', atks: ['spiral', 'teleport', 'nova'], ph: 2,
    draw(x, y, f, a) {
      let p = PX, fl = Math.sin(a * .05) * p | 0;
      X.fillStyle = f ? '#fff' : '#4010a0'; X.fillRect(x - p * 7, y - p * 2, p * 14, p * 10);
      X.fillRect(x - p * 9, y + p * 4, p * 4, p * 4); X.fillRect(x + p * 5, y + p * 4, p * 4, p * 4);
      X.fillStyle = f ? '#fff' : '#6020c0'; X.fillRect(x - p * 6, y - p * 8, p * 12, p * 7);
      X.fillStyle = f ? '#fff' : '#8030e0'; X.fillRect(x - p * 5, y - p * 12, p * 10, p * 5); X.fillRect(x - p * 4, y - p * 14, p * 8, p * 3);
      X.fillStyle = '#000'; X.fillRect(x - p * 3, y - p * 10, p * 6, p * 4);
      X.fillStyle = '#ff00ff'; X.fillRect(x - p * 2, y - p * 9, p * 1.5, p * 1.5); X.fillRect(x + p, y - p * 9, p * 1.5, p * 1.5);
      X.fillStyle = '#c0a060'; X.fillRect(x - p * 10, y - p * 14, p * 1.5, p * 18);
      X.fillStyle = '#e060ff'; X.fillRect(x - p * 11.5, y - p * 17, p * 4.5, p * 4); X.fillStyle = '#fff'; X.fillRect(x - p * 10, y - p * 16, p * 1.5, p * 1.5);
      X.fillStyle = `rgba(160,64,255,${.3 + Math.sin(a * .08) * .2})`;
      X.fillRect(x - p * 8 + fl, y - p * 6, p * 2, p * 2); X.fillRect(x + p * 7 - fl, y - p * 4, p * 2, p * 2)
    }
  },
  {
    name: 'INFERNO DRAGON', r: 42, spd: .3, hp: 3600, xp: 180, dm: 3, col: '#e04020', atks: ['breath', 'ring', 'charge'], ph: 3,
    draw(x, y, f, a) {
      let p = PX, w = Math.sin(a * .1) * p * 2 | 0;
      X.fillStyle = f ? '#fff' : '#a02010'; X.fillRect(x - p * 10, y - p * 4, p * 20, p * 10);
      X.fillStyle = f ? '#fff' : '#e04020'; X.fillRect(x + p * 8, y - p * 10, p * 10, p * 8);
      X.fillStyle = f ? '#fff' : '#ff6030'; X.fillRect(x + p * 16, y - p * 8, p * 4, p * 4);
      X.fillStyle = '#888'; X.fillRect(x + p * 10, y - p * 13, p * 2, p * 4); X.fillRect(x + p * 15, y - p * 13, p * 2, p * 4);
      X.fillStyle = '#ff0'; X.fillRect(x + p * 12, y - p * 8, p * 2, p * 2); X.fillRect(x + p * 15, y - p * 8, p * 2, p * 2);
      X.fillStyle = f ? '#fff' : '#c03818'; X.fillRect(x - p * 6, y - p * 12 + w, p * 10, p * 6); X.fillRect(x - p * 12, y - p * 10 + w, p * 8, p * 4);
      X.fillRect(x - p * 6, y - p * 12 - w, p * 10, p * 6);
      X.fillStyle = f ? '#fff' : '#a02010'; X.fillRect(x - p * 14, y, p * 5, p * 3); X.fillRect(x - p * 17, y + p * 2, p * 4, p * 2);
      X.fillStyle = f ? '#fff' : '#ff8040'; X.fillRect(x - p * 6, y + p * 2, p * 14, p * 3);
      X.fillStyle = f ? '#fff' : '#802010'; X.fillRect(x - p * 6, y + p * 5, p * 4, p * 5); X.fillRect(x + p * 3, y + p * 5, p * 4, p * 5)
    }
  },
  {
    name: 'LICH EMPEROR', r: 38, spd: .4, hp: 5400, xp: 250, dm: 3, col: '#20c0c0', atks: ['everything'], ph: 3,
    draw(x, y, f, a) {
      let p = PX, fl = Math.sin(a * .06) * p | 0;
      X.fillStyle = f ? '#fff' : '#104040'; X.fillRect(x - p * 8, y - p * 2, p * 16, p * 12);
      X.fillStyle = f ? '#fff' : '#186060'; X.fillRect(x - p * 10, y + p * 6, p * 6, p * 4); X.fillRect(x + p * 4, y + p * 6, p * 6, p * 4);
      X.fillStyle = f ? '#fff' : '#20a0a0'; X.fillRect(x - p * 6, y - p * 8, p * 12, p * 7);
      X.fillStyle = f ? '#fff' : '#d0d0b0'; X.fillRect(x - p * 5, y - p * 13, p * 10, p * 6);
      X.fillRect(x - p * 4, y - p * 15, p * 8, p * 3);
      X.fillStyle = '#20e0e0'; X.fillRect(x - p * 6, y - p * 16, p * 12, p * 2);
      X.fillRect(x - p * 6, y - p * 18, p * 2, p * 2); X.fillRect(x - p * 2, y - p * 19, p * 4, p * 3); X.fillRect(x + p * 4, y - p * 18, p * 2, p * 2);
      X.fillStyle = '#20ffff'; X.fillRect(x - p * 3, y - p * 12, p * 2, p * 2); X.fillRect(x + p * 2, y - p * 12, p * 2, p * 2);
      X.fillStyle = '#b0b098'; X.fillRect(x - p * 4, y - p * 8, p * 8, p * 2);
      X.fillStyle = '#d0b060'; X.fillRect(x + p * 8, y - p * 18, p * 1.5, p * 22);
      X.fillStyle = '#20ffff'; X.fillRect(x + p * 7, y - p * 20, p * 3.5, p * 3.5); X.fillStyle = '#fff'; X.fillRect(x + p * 8, y - p * 19, p * 1.5, p * 1.5);
      X.globalAlpha = .4; X.fillStyle = '#20ffff';
      X.fillRect(x - p * 10 + fl, y - p * 8, p * 2, p * 2); X.fillRect(x + p * 10 - fl, y - p * 6, p * 2, p * 2); X.fillRect(x + fl * 2, y - p * 18, p * 1.5, p * 1.5); X.globalAlpha = 1
    }
  },
];

// ===== UPGRADES (NERFED passive damage, balanced stats) =====
const UPG = [
  // Stats
  { id: 'dm', i: '⚔️', n: 'Урон', d: '+10%', fn: () => P.dM *= 1.10, mx: 10, cat: 'stat' },
  { id: 'sp', i: '🏃', n: 'Скорость', d: '+6%', fn: () => P.speed *= 1.06, mx: 6, cat: 'stat' },
  { id: 'mh', i: '❤️', n: '+1 Жизнь', d: '+1♥', fn: () => { P.mH++; P.hp = Math.min(P.hp + 1, P.mH) }, mx: 5, cat: 'stat' },
  { id: 'rg', i: '💚', n: 'Реген', d: 'Лечение 0.2/с', fn: () => P.regen += .2, mx: 5, cat: 'stat' },
  { id: 'ar', i: '🛡️', n: 'Броня', d: '-1 урон', fn: () => P.arm++, mx: 5, cat: 'stat' },
  { id: 'cr', i: '💥', n: 'Крит', d: '+6%', fn: () => P.crC += .06, mx: 6, cat: 'stat' },
  { id: 'mg', i: '🧲', n: 'Магнит', d: '+20 радиус', fn: () => P.magR += 20, mx: 6, cat: 'stat' },
  { id: 'fr', i: '⏱️', n: 'Скорострел', d: '-8% кд', fn: () => P.frM *= .92, mx: 5, cat: 'stat' },
  { id: 'pc', i: '🗡️', n: 'Пробивание', d: '+1 пробив.', fn: () => P.bPrc++, mx: 4, cat: 'stat' },
  { id: 'dg', i: '💨', n: 'Уклонение', d: '+5% мисс', fn: () => P.dodge += .05, mx: 4, cat: 'stat' },
  { id: 'cb', i: '🪙', n: 'Золотоиск.', d: '+20%🪙', fn: () => P.cM += .2, mx: 3, cat: 'stat' },
  { id: 'xb', i: '📗', n: 'Мудрость', d: '+20%XP', fn: () => P.xM += .2, mx: 3, cat: 'stat' },
  { id: 'hl', i: '➕', n: 'Зелье', d: '+2♥', fn: () => P.hp = Math.min(P.mH, P.hp + 2), mx: 99, cat: 'stat' },
  // Weapons (NERFED)
  { id: 'ob', i: '🔵', n: 'Орбитал', d: 'Крутящийся шар', fn: () => P.orb++, mx: 4, cat: 'wpn' },
  { id: 'sp2', i: '🔱', n: 'Копья', d: 'Вращающиеся копья', fn: () => P.spears++, mx: 3, cat: 'wpn' },
  { id: 'au', i: '🔥', n: 'Огненная Аура', d: 'Жжёт ближних', fn: () => P.aura += 3, mx: 4, cat: 'wpn' },
  { id: 'lt', i: '⚡', n: 'Молния', d: 'Случ. удар молнии', fn: () => P.lightning++, mx: 3, cat: 'wpn' },
  { id: 'sh', i: '🛡️', n: 'Защитный Круг', d: 'Отражает пули', fn: () => P.shield++, mx: 2, cat: 'wpn' },
  { id: 'ps', i: '☠️', n: 'Ядовитый След', d: 'Яд за собой', fn: () => P.poison++, mx: 3, cat: 'wpn' },
  { id: 'ex', i: '💣', n: 'Взрыв. Снаряды', d: '8% шанс', fn: () => P.exCh += .08, mx: 3, cat: 'wpn' },
  { id: 'ms', i: '🎯', n: 'Мультивыстрел', d: '+1 снаряд', fn: () => P.multi++, mx: 3, cat: 'wpn' },
  { id: 'th', i: '🌵', n: 'Шипы', d: 'Контактный урон', fn: () => P.thorns += 4, mx: 4, cat: 'wpn' },
  { id: 'ls', i: '🩸', n: 'Вампиризм', d: '+2% хила', fn: () => P.vamp += .02, mx: 4, cat: 'wpn' },
  { id: 'ch', i: '⛓️', n: 'Цепная Молния', d: 'Снаряды прыгают', fn: () => P.chain++, mx: 3, cat: 'wpn' },
  // Proc skills
  { id: 'pf', i: '❄️', n: 'Морозный Удар', d: '8% заморозка', fn: () => P.procFreeze++, mx: 3, cat: 'proc' },
  { id: 'pe', i: '💀', n: 'Казнь', d: '5% инста-килл <15%HP', fn: () => P.procExecute++, mx: 3, cat: 'proc' },
  { id: 'pw', i: '💥', n: 'Ударная Волна', d: '6% AoE при попадании', fn: () => P.procShockwave++, mx: 3, cat: 'proc' },
];

// ===== EVENTS =====
const EVENTS = [
  {
    n: '🪙 ЗОЛОТАЯ ЛИХОРАДКА', c: '#f0c030', d: 500, tint: 'rgba(200,160,0,.08)',
    fn: () => { eCM = 3; for (let i = 0; i < 15; i++) { let a = Math.random() * 6.28, d = 60 + Math.random() * 200; orbs.push({ x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, xp: 0, r: 4, b: Math.random() * 6, t: 'coin', cv: 2 }) } }, end: () => { eCM = 1 }
  },
  {
    n: '👹 ЭЛИТНАЯ ВОЛНА', c: '#ff4040', d: 400, tint: 'rgba(200,0,0,.06)',
    fn: () => { eEL = true; shk = 6; shkI = 5 }, end: () => { eEL = false }
  },
  {
    n: '🪲 РОЙ!', c: '#60ff60', d: 350, tint: 'rgba(0,200,0,.05)',
    fn: () => { for (let i = 0; i < 50; i++) spawnE('slime', .8); for (let i = 0; i < 20; i++) spawnE('bat', .8) }, end: () => { }
  },
  {
    n: '📗 ДВОЙНОЙ XP', c: '#a060ff', d: 500, tint: 'rgba(100,0,200,.06)',
    fn: () => { eXM = 2 }, end: () => { eXM = 1 }
  },
  {
    n: '❄️ ЗАМОРОЗКА', c: '#60d0ff', d: 300, tint: 'rgba(0,100,200,.08)',
    fn: () => { for (let e of ens) e.sl = Math.max(e.sl || 0, 200) }, end: () => { }
  },
  {
    n: '💀 НЕКРОВОЛНА', c: '#a040ff', d: 400, tint: 'rgba(100,0,160,.07)',
    fn: () => { for (let i = 0; i < 20; i++) spawnE('skeleton', 1.3); for (let i = 0; i < 10; i++) spawnE('ghost', 1.3) }, end: () => { }
  },
];

// ===== STATE =====
let run = false, pau = false, T = 0;
let P = null;
let proj = [], ens = [], orbs = [], parts = [], dNs = [], eBs = [], vorts = [], turrets = [], poisonT = [];
let wObjs = []; let boss = null;
let wave = 1, kills = 0, bK = 0, sC = 0;
let eSp = 0, spT = 0, eCM = 1, eXM = 1, eEL = false;
let evA = null, evT = 0;
let cam = { x: 0, y: 0 }, shk = 0, shkI = 0;
let uC = {}; let lastAd = 0;
let crates = []; // world crates (weapon + bonus)
let crateT = 0; // crate spawn timer
let bonusCrateT = 0;

// ===== INPUT =====
let keys = {}, mouse = { x: 0, y: 0, dn: false, clicked: false };
let mSt = { a: false, dx: 0, dy: 0 }, aSt = { a: false, dx: 0, dy: 0, dn: false };
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if ('wasd r '.includes(e.key.toLowerCase()) || e.key.startsWith('Arrow')) e.preventDefault();
  if (e.key === 'Escape' && run && !pau) { showPauseMenu() }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
C.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY });
C.addEventListener('mousedown', e => { if (e.button === 0) { mouse.dn = true; mouse.clicked = true; iA() } });
C.addEventListener('mouseup', e => { if (e.button === 0) mouse.dn = false });
C.addEventListener('contextmenu', e => e.preventDefault());
// Ability on space/right-click
window.addEventListener('keydown', e => { if (e.key === ' ' && P && P.aTmr <= 0) { P.aTmr = P.aCD; let ch = CHARS.find(c => c.id === sv.sCh); if (ch) ch.aFn(P) } });
C.addEventListener('mousedown', e => { if (e.button === 2 && P && P.aTmr <= 0) { P.aTmr = P.aCD; let ch = CHARS.find(c => c.id === sv.sCh); if (ch) ch.aFn(P) } });

if (isMob) {
  let mTi = null, aTi = null, km = document.getElementById('km'), ka = document.getElementById('ka');
  document.addEventListener('touchstart', e => {
    iA(); for (let t of e.changedTouches) {
      if (t.clientX < W() / 2 && mTi === null) { mTi = t.identifier; mSt.a = true; mSt.ox = t.clientX; mSt.oy = t.clientY }
      else if (t.clientX >= W() / 2 && aTi === null) { aTi = t.identifier; aSt.a = true; aSt.ox = t.clientX; aSt.oy = t.clientY; aSt.dn = true }
    }
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    for (let t of e.changedTouches) {
      if (t.identifier === mTi) { let dx = t.clientX - mSt.ox, dy = t.clientY - mSt.oy, d = Math.sqrt(dx * dx + dy * dy), m = 45; if (d > m) { dx = dx / d * m; dy = dy / d * m } mSt.dx = dx / m; mSt.dy = dy / m; km.style.transform = `translate(${-50 + dx / m * 35}%,${-50 + dy / m * 35}%)` }
      else if (t.identifier === aTi) { let dx = t.clientX - aSt.ox, dy = t.clientY - aSt.oy, d = Math.sqrt(dx * dx + dy * dy), m = 45; if (d > m) { dx = dx / d * m; dy = dy / d * m } aSt.dx = dx / m; aSt.dy = dy / m; ka.style.transform = `translate(${-50 + dx / m * 35}%,${-50 + dy / m * 35}%)`; mouse.x = W() / 2 + aSt.dx * 300; mouse.y = H() / 2 + aSt.dy * 300 }
    }
  }, { passive: true });
  document.addEventListener('touchend', e => {
    for (let t of e.changedTouches) {
      if (t.identifier === mTi) { mTi = null; mSt.a = false; mSt.dx = 0; mSt.dy = 0; km.style.transform = 'translate(-50%,-50%)' }
      if (t.identifier === aTi) { aTi = null; aSt.a = false; aSt.dx = 0; aSt.dy = 0; aSt.dn = false; ka.style.transform = 'translate(-50%,-50%)' }
    }
  }, { passive: true });
  document.getElementById('br').addEventListener('touchstart', () => { if (P) P.wR = true }, { passive: true });
}

// ===== WORLD =====
function genW() {
  wObjs = [];
  for (let i = 0; i < 60; i++) { let a = Math.random() * 6.28, d = 250 + Math.random() * (WORLD_R - 450); wObjs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, t: 'tree', r: 5 }) }
  for (let i = 0; i < 20; i++) { let a = Math.random() * 6.28, d = 200 + Math.random() * (WORLD_R - 350); wObjs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, t: 'rock', r: 0 }) }
  for (let i = 0; i < 180; i++) { let a = (6.28 / 180) * i; wObjs.push({ x: Math.cos(a) * (WORLD_R + 15), y: Math.sin(a) * (WORLD_R + 15), t: 'bnd', r: 28 }) }
}

// ===== INIT PLAYER =====
function initP() {
  let ch = CHARS.find(c => c.id === sv.sCh) || CHARS[0];
  let g = GUNS.find(g => g.id === sv.sGn) || GUNS[0];
  // Apply config overrides to gun stats
  let gc = CONFIG.WEAPONS[g.id];
  if (gc) { g = { ...g, dm: gc.dm, rate: gc.rate, mag: gc.mag, rld: gc.rld, spr: gc.spr, spd: gc.spd } }
  let s = sv.sL, gl = sv.gnL[g.id] || 0;
  let wu = CONFIG.WEAPON_UPGRADE;
  P = {
    x: 0, y: 0, r: 10, hp: ch.b.hp + s.hp, mH: ch.b.hp + s.hp,
    speed: ch.b.spd + s.spd * .1, arm: ch.b.arm + s.arm, dM: ch.b.dm,
    crC: CONFIG.PLAYER.BASE_CRIT + s.crit * .03, crM: CONFIG.PLAYER.CRIT_MULT,
    magR: CONFIG.PLAYER.BASE_MAGNET + s.mag * 8, regen: 0, rgT: 0,
    xp: 0, xpN: CONFIG.LEVELING.baseXP, lvl: 1,
    gun: { ...g, mag: g.mag + gl * wu.magPerLevel }, ammo: g.mag + gl * wu.magPerLevel, mAm: g.mag + gl * wu.magPerLevel,
    rld: false, rldT: 0, fT: 0, frM: 1, bPrc: 0, exCh: 0,
    dodge: 0, thorns: 0, vamp: 0, multi: 0, orb: 0, orbA: 0,
    spears: 0, spA: 0, aura: 0, lightning: 0, lightT: 0, shield: 0, poison: 0, poisonT: 0, chain: 0,
    cM: 1, xM: 1 + s.xp * .1, inv: 0, fac: 1, anim: 0, rev: false, adRev: false,
    block: 0, expB: 1, cdB: 1, shM: 0, sh: 0, shC: 0, shT: 0, wR: false,
    holyAura: 0, rageThreshold: 0, rageDmgMult: 1, rageDmg: 1,
    procFreeze: 0, procExecute: 0, procShockwave: 0,
    gun2: null, // second weapon slot
    aTmr: 0, aCD: ch.aCD || 300,
    // Hit cooldown maps for orbitals/spears (FIX: prevents per-frame damage)
    orbHit: new Map(),
    spearHit: new Map(),
  };
  ch.pFn(P);
}

// ===== SPAWN (off-screen) =====
function spawnE(tk, hm) {
  let t = ET[tk]; if (!t) return;
  if (ens.length >= MAX_ENEMIES) return; // FIX: cap enemies for performance
  let viewR = Math.max(W(), H()) / 2 / ZOOM + 80;
  let a = Math.random() * 6.28, d = viewR + 50 + Math.random() * 120;
  let ex = P.x + Math.cos(a) * d, ey = P.y + Math.sin(a) * d;
  let ed = Math.sqrt(ex * ex + ey * ey); if (ed > WORLD_R - 40) { ex *= (WORLD_R - 40) / ed; ey *= (WORLD_R - 40) / ed }
  let el = eEL && Math.random() < .25;
  // Use config speed if available
  let cfgE = CONFIG.ENEMIES[tk];
  let spd = cfgE ? cfgE.spd : t.spd;
  let hp = cfgE ? cfgE.hp : t.hp;
  ens.push({
    x: ex, y: ey, r: t.r * (el ? 1.2 : 1), spd: spd, hp: hp * hm * (el ? 1.8 : 1), mH: hp * hm * (el ? 1.8 : 1),
    xp: t.xp * (el ? 2.5 : 1), dm: t.dm * (el ? 1.5 : 1), col: el ? '#ff8000' : t.col,
    tk, fl: 0, an: Math.random() * 100 | 0, sho: t.shoots, sCD: t.sCD || 0, sT: (t.sCD || 100) + Math.random() * 50 | 0,
    isGhost: t.isGhost, pT: 0, vis: true, sl: 0, el, cD: el ? .3 : .06,
    _id: ++spawnId // unique ID for hit cooldown tracking
  });
}
let spawnId = 0;

function spawnBoss(w) {
  let idx = Math.min(Math.floor(w / 5) - 1, BOSS.length - 1); let b = BOSS[idx]; let hm = 1 + Math.max(0, Math.floor(w / 5) - 1) * .35;
  let a = Math.random() * 6.28;
  boss = {
    ...b, x: P.x + Math.cos(a) * 450, y: P.y + Math.sin(a) * 450,
    hp: b.hp * hm, mH: b.hp * hm, fl: 0, aT: 100, cA: 0, chg: 0, chT: null, ang: 0, an: 0, cPh: 1, isBoss: true,
    _id: ++spawnId
  };
  banner(b.name, '#ff4040', 2500); sfxB();
  document.getElementById('bbw').style.display = 'block'; document.getElementById('bn').textContent = b.name;
}

// ===== WAVE CONFIG (uses CONFIG for escalation) =====
function waveCfg(w) {
  let wc = CONFIG.WAVES;
  let iB = w % wc.bossEveryN === 0;

  // Build available enemy types from config unlocks
  let ty = [];
  for (let u of wc.unlocks) {
    if (w >= u.wave) {
      for (let t of u.types) { if (ET[t] && !ty.includes(t)) ty.push(t) }
    }
  }
  if (ty.length === 0) ty = ['slime'];

  // Enemy count
  let cnt = iB ? (wc.countBossBase + w * wc.countBossPerWave) : (wc.countBase + w * wc.countPerWave);

  // Apply difficulty spikes
  for (let spike of wc.spikes) {
    if (w >= spike.wave) cnt += spike.countBonus;
  }

  // HP scaling
  let hm = 1 + (w - 1) * wc.hpScalePerWave;

  // Spawn rate
  let rate = wc.spawnRateBase - w * wc.spawnRateDecay;
  for (let spike of wc.spikes) {
    if (w >= spike.wave) rate += spike.spawnRateBonus;
  }
  rate = Math.max(wc.spawnRateMin, Math.round(rate));

  return { ty, cnt, hm, rate, iB };
}

// ===== COMBAT =====
function part(x, y, c, n, s) {
  for (let i = 0; i < n; i++) {
    if (parts.length >= MAX_PARTICLES) parts.shift(); // FIX: cap particles
    let a = Math.random() * 6.28, v = Math.random() * s;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 14 + Math.random() * 12 | 0, ml: 26, c, r: 2 + Math.random() * 2 })
  }
}
function dN(x, y, v, cr) { dNs.push({ x, y, t: Math.floor(v) + '', l: 42, c: cr ? '#ffcc00' : '#fff', s: cr ? 15 : 10, vy: -1.1 }) }
function mF(x, y, a, c) { for (let i = 0; i < 5; i++) { let s = 2 + Math.random() * 4; parts.push({ x, y, vx: Math.cos(a + (.5 - Math.random()) * .7) * s, vy: Math.sin(a + (.5 - Math.random()) * .7) * s, l: 5 + Math.random() * 5 | 0, ml: 10, c, r: 2 + Math.random() * 3 }) } }

function hitE(e, dm) {
  let rageMult = (P && P.rageDmg) ? P.rageDmg : 1;
  let cr = Math.random() < P.crC, d = dm * (cr ? P.crM : 1) * rageMult;
  // Proc skills
  if (P && P.procFreeze > 0 && Math.random() < CONFIG.PROCS.freeze.chance * P.procFreeze) { e.sl = Math.max(e.sl || 0, CONFIG.PROCS.freeze.duration) }
  if (P && P.procExecute > 0 && e.hp / e.mH < CONFIG.PROCS.execute.threshold && Math.random() < CONFIG.PROCS.execute.chance * P.procExecute) { d = e.hp + 1; dN(e.x, e.y - 20, 0, false); dNs[dNs.length - 1] && (dNs[dNs.length - 1].t = 'EXECUTE', dNs[dNs.length - 1].c = '#ff2020') }
  if (P && P.procShockwave > 0 && Math.random() < CONFIG.PROCS.shockwave.chance * P.procShockwave) { for (let e2 of ens) { if (e2 !== e && Math.sqrt((e2.x - e.x) ** 2 + (e2.y - e.y) ** 2) < CONFIG.PROCS.shockwave.radius) { e2.hp -= d * CONFIG.PROCS.shockwave.dmgMult; e2.fl = 3 } } part(e.x, e.y, '#ffaa40', 8, 5) }
  // Shielder: damage goes to shield first
  if (e.tk === 'shielder' && e.shieldHP > 0) {
    let absorbed = Math.min(e.shieldHP, d);
    e.shieldHP -= absorbed;
    d -= absorbed;
    if (e.shieldHP <= 0) { part(e.x, e.y, '#50b0ff', 8, 4); e.col = '#305880' }
    if (d <= 0) { e.fl = 3; dN(e.x, e.y - (e.r || 10), 0, false); dNs[dNs.length - 1].t = 'SHIELD'; dNs[dNs.length - 1].c = '#50b0ff'; return 0 }
  }
  e.hp -= d; e.fl = 5; dN(e.x, e.y - (e.r || 10), d, cr); part(e.x, e.y, e.col || '#fff', 2, 2); sfxH();
  if (P.vamp > 0 && P.hp < P.mH) { P.hp = Math.min(P.mH, P.hp + d * P.vamp) }
  // Chain lightning (FIX: synchronous, no race condition)
  if (P.chain > 0 && !e._chained) {
    e._chained = true;
    let closest = null, cDist = 999;
    let targets = [...ens]; if (boss && boss !== e) targets.push(boss);
    for (let e2 of targets) { if (e2 === e || e2._chained) continue; let dd = Math.sqrt((e2.x - e.x) ** 2 + (e2.y - e.y) ** 2); if (dd < 120 && dd < cDist) { cDist = dd; closest = e2 } }
    if (closest) {
      hitE(closest, d * .3 * P.chain);
      parts.push({ x: e.x, y: e.y, vx: (closest.x - e.x) * .1, vy: (closest.y - e.y) * .1, l: 6, ml: 6, c: '#60d0ff', r: 3 })
    }
  }
  return d;
}

function takeDmg(dm) {
  if (P.inv > 0) return;
  if (Math.random() < P.dodge) { dN(P.x, P.y - 20, 0, 0); dNs[dNs.length - 1].t = 'MISS'; dNs[dNs.length - 1].c = '#80c0ff'; P.inv = 10; return }
  if (P.block && Math.random() < P.block) { dN(P.x, P.y - 20, 0, 0); dNs[dNs.length - 1].t = 'BLOCK'; dNs[dNs.length - 1].c = '#00ff88'; P.inv = 10; return }
  if (P.sh > 0) { P.sh--; P.inv = 15; dN(P.x, P.y - 20, 0, 0); dNs[dNs.length - 1].t = '🛡️'; dNs[dNs.length - 1].c = '#00aaff'; part(P.x, P.y, '#00aaff', 6, 3); return }
  let d = Math.max(1, dm - P.arm); P.hp -= d; P.inv = 40;
  dN(P.x, P.y - 20, d, false); shk = 8; shkI = 7; sfxD();
  parts.push({ x: P.x, y: P.y, vx: 0, vy: 0, l: 5, ml: 5, c: '#ff0000', r: 200, flash: true });
}

// ===== AUTO-AIM: find nearest enemy for auto-fire =====
function getAutoAimAngle() {
  let bestDist = CONFIG.AUTO_AIM_RANGE; // max auto-aim range (in world units)
  let bestTarget = null;
  let allTargets = [...ens];
  if (boss) allTargets.push(boss);
  for (let e of allTargets) {
    if (e.isGhost && !e.vis) continue;
    let dx = e.x - P.x, dy = e.y - P.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) { bestDist = d; bestTarget = e; }
  }
  if (bestTarget) {
    return Math.atan2(bestTarget.y - P.y, bestTarget.x - P.x);
  }
  return null; // no target in range
}

function fireGun() {
  if (P.rld || P.fT > 0 || P.ammo <= 0) return;

  // AUTO-AIM: if mouse is held or auto-fire, use nearest enemy; if mouse moved recently, use mouse aim
  let a;
  if (mouse.dn || aSt.dn) {
    // Manual aim override
    a = Math.atan2(mouse.y - H() / 2, mouse.x - W() / 2);
  } else {
    // Auto-fire: aim at nearest enemy
    a = getAutoAimAngle();
    if (a === null) return; // no targets, don't waste ammo
  }

  let g = P.gun, shots = 1 + P.multi, cd = Math.max(3, Math.floor(g.rate * P.frM * (P.cdB || 1)));
  P.fT = cd; P.ammo--;
  mF(P.x + Math.cos(a) * 16, P.y + Math.sin(a) * 16, a, g.col); sfxS();
  shk = Math.max(shk, 1); shkI = Math.max(shkI, 1);
  // Shell casing
  if (parts.length < MAX_PARTICLES) {
    parts.push({ x: P.x, y: P.y, vx: Math.cos(a + 1.57) * 1.5, vy: Math.sin(a + 1.57) * 1.5 - 1, l: 25, ml: 25, c: '#c0a060', r: 2, grav: true });
  }

  for (let s = 0; s < shots; s++) {
    if (proj.length >= MAX_PROJ) break; // FIX: cap projectiles
    let sa = a + (s > 0 ? (s % 2 ? 1 : -1) * Math.ceil(s / 2) * .15 : 0), sp = (Math.random() - .5) * g.spr * 2, fa = sa + sp;
    let prc = g.prc || 1; prc += P.bPrc;
    let exp = g.sp === 'exp' || Math.random() < P.exCh;
    let exR = g.exR || 45; if (P.expB) exR *= P.expB;

    if (g.t === 'sp') {
      for (let p = 0; p < (g.pel || 5); p++) {
        let pa = fa + (Math.random() - .5) * g.spr * 3;
        proj.push({ x: P.x, y: P.y, vx: Math.cos(pa) * g.spd * SPD, vy: Math.sin(pa) * g.spd * SPD, dm: g.dm * P.dM, r: g.pR, l: 9999, c: g.col, prc: 1, exp: false, sl: g.sp === 'slow' ? g.slA : 0, vo: false })
      }
    }
    else if (g.t === 'b') { proj.push({ x: P.x, y: P.y, vx: Math.cos(fa) * g.spd * SPD, vy: Math.sin(fa) * g.spd * SPD, dm: g.dm * P.dM, r: g.pR, l: 9999, c: g.col, prc, beam: true, exp: false, sl: 0, vo: false, trail: true }) }
    else { proj.push({ x: P.x, y: P.y, vx: Math.cos(fa) * g.spd * SPD, vy: Math.sin(fa) * g.spd * SPD, dm: g.dm * P.dM, r: g.pR, l: 9999, c: g.col, prc, exp, exR, sl: g.sp === 'slow' ? g.slA : 0, vo: g.sp === 'vort', voR: g.vR || 0, voD: g.vD || 0 }) }
  }
  if (P.ammo <= 0) startRld();
}

function startRld() { if (P.rld) return; P.rld = true; let gl = sv.gnL[P.gun.id] || 0; P.rldT = Math.max(20, P.gun.rld - gl * CONFIG.WEAPON_UPGRADE.reloadPerLevel); sfxR() }

// Boss attacks
function bAtk(b) {
  let pool = b.atks; if (pool[0] === 'everything') pool = ['ring', 'spiral', 'charge', 'nova', 'teleport', 'summon', 'breath'];
  let atk = pool[b.cA % pool.length]; b.cA++;
  if (atk === 'charge') { b.chg = 50; b.chT = { x: P.x, y: P.y }; sfxB() }
  else if (atk === 'ring') { let n = 12 + b.cPh * 4; for (let i = 0; i < n; i++) { let a = (6.28 / n) * i; eBs.push({ x: b.x, y: b.y, vx: Math.cos(a) * 1.5 * SPD, vy: Math.sin(a) * 1.5 * SPD, r: 4, dm: b.dm, l: 150, c: b.col }) } }
  else if (atk === 'spiral') { let n = 14 + b.cPh * 4; for (let i = 0; i < n; i++) { setTimeout(() => { if (!boss) return; let a = b.ang + i * .4; eBs.push({ x: b.x, y: b.y, vx: Math.cos(a) * 1.5 * SPD, vy: Math.sin(a) * 1.5 * SPD, r: 4, dm: b.dm * .8, l: 160, c: '#a040ff' }) }, i * 60) } }
  else if (atk === 'nova') { let rn = 2 + b.cPh; for (let r = 0; r < rn; r++) { setTimeout(() => { if (!boss) return; let n = 16; for (let i = 0; i < n; i++) { let a = (6.28 / n) * i + r * .3; eBs.push({ x: b.x, y: b.y, vx: Math.cos(a) * (1.2 + r * .3) * SPD, vy: Math.sin(a) * (1.2 + r * .3) * SPD, r: 5, dm: b.dm * .7, l: 120, c: '#ff4040' }) } }, r * 350) } }
  else if (atk === 'summon') { for (let i = 0; i < 3 + b.cPh * 2; i++) spawnE('skeleton', 1 + wave * .06) }
  else if (atk === 'teleport') { let a = Math.random() * 6.28; b.x = P.x + Math.cos(a) * 150; b.y = P.y + Math.sin(a) * 150; part(b.x, b.y, b.col, 15, 5); shk = 5; shkI = 4 }
  else if (atk === 'breath') { for (let i = -4; i <= 4; i++) { let a = Math.atan2(P.y - b.y, P.x - b.x) + i * .08; eBs.push({ x: b.x, y: b.y, vx: Math.cos(a) * 2.5 * SPD, vy: Math.sin(a) * 2.5 * SPD, r: 5, dm: b.dm, l: 100, c: '#ff6020' }) } }
}

function bossRwd() {
  sC += 20; banner('⭐ СУПЕРБОНУС!', '#f0c030', 3000); sfxL(); shk = 12; shkI = 10;
  P.hp = Math.min(P.mH, P.hp + Math.ceil(P.mH * .5)); P.ammo = P.mAm; P.rld = false;
  for (let i = 0; i < 20; i++) { let a = Math.random() * 6.28, d = Math.random() * 110; orbs.push({ x: boss.x + Math.cos(a) * d, y: boss.y + Math.sin(a) * d, xp: boss.xp / 16, r: 5, b: Math.random() * 6, t: 'gold' }) }
  for (let i = 0; i < 8; i++) { let a = Math.random() * 6.28, d = 20 + Math.random() * 80; orbs.push({ x: boss.x + Math.cos(a) * d, y: boss.y + Math.sin(a) * d, xp: 0, r: 4, b: Math.random() * 6, t: 'coin', cv: 5 }) }
  SDK.happyTime();
}

function banner(t, c, d) { let e = document.getElementById('ev'); e.textContent = t; e.style.color = c; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', d) }

// ===== UPDATE =====
function update() {
  if (!run || pau || !P) return; T++;

  // FIX: don't show ads during boss fights
  if (T % 300 === 0 && Date.now() - lastAd > 300000 && !boss) {
    pau = true;
    if (SDK.platform !== 'standalone') {
      SDK.showInterstitial().then(() => { pau = false; lastAd = Date.now() });
    } else {
      showAd(() => { pau = false; lastAd = Date.now() });
    }
  }
  // Events
  if (wave >= CONFIG.EVENTS.minWave && !evA && !boss && T % CONFIG.EVENTS.triggerInterval === 0 && Math.random() < CONFIG.EVENTS.triggerChance) {
    let ev = EVENTS[Math.random() * EVENTS.length | 0]; evA = ev; evT = ev.d; ev.fn(); banner(ev.n, ev.c, 2500);
    let ti = document.getElementById('evtint'); ti.style.background = ev.tint || 'transparent'; ti.style.opacity = '1'; shk = 5; shkI = 4
  }
  if (evA) { evT--; if (evT <= 0) { evA.end(); evA = null; document.getElementById('evtint').style.opacity = '0' } }

  // Move
  let dx = 0, dy = 0;
  if (isMob && mSt.a) { dx = mSt.dx; dy = mSt.dy }
  else { if (keys.w || keys['ц'] || keys.arrowup) dy = -1; if (keys.s || keys['ы'] || keys.arrowdown) dy = 1; if (keys.a || keys['ф'] || keys.arrowleft) dx = -1; if (keys.d || keys['в'] || keys.arrowright) dx = 1; if (dx && dy) { dx *= .707; dy *= .707 } }
  let nx = P.x + dx * P.speed * SPD * dt, ny = P.y + dy * P.speed * SPD * dt;
  let blocked = false; for (let o of wObjs) { if (o.r < 1) continue; if (Math.sqrt((nx - o.x) ** 2 + (ny - o.y) ** 2) < P.r + o.r) { blocked = true; break } }
  if (!blocked) { P.x = nx; P.y = ny }
  if (dx) P.fac = dx > 0 ? 1 : -1; if (dx || dy) P.anim++;
  let pd = Math.sqrt(P.x ** 2 + P.y ** 2); if (pd > WORLD_R - 20) { P.x *= (WORLD_R - 20) / pd; P.y *= (WORLD_R - 20) / pd }
  if (P.inv > 0) P.inv--;
  if (P.aTmr > 0) P.aTmr--;
  if (P.regen > 0) { P.rgT++; if (P.rgT >= 60) { P.hp = Math.min(P.mH, P.hp + P.regen); P.rgT = 0 } }
  if (P.shM > 0) { P.shT++; if (P.shT >= P.shC && P.sh < P.shM) { P.sh = P.shM; P.shT = 0; part(P.x, P.y, '#00aaff', 6, 3) } }
  // Paladin holy aura: heal over time
  if (P.holyAura > 0 && T % 60 === 0 && P.hp < P.mH) { P.hp = Math.min(P.mH, P.hp + P.mH * P.holyAura) }
  // Berserker rage: boost damage when low HP
  if (P.rageThreshold) { P.rageDmg = (P.hp / P.mH <= P.rageThreshold) ? P.rageDmgMult : 1 } else { P.rageDmg = 1 }
  if (P.rld) { P.rldT--; if (P.rldT <= 0) { P.rld = false; P.ammo = P.mAm } }
  if (keys.r || P.wR) { P.wR = false; if (!P.rld && P.ammo < P.mAm) startRld() }

  // ---- PASSIVE WEAPONS (with hit cooldown FIX) ----
  // Orbitals: hit cooldown 30 frames per enemy
  if (P.orb > 0) {
    P.orbA += .03 * SPD * dt;
    for (let i = 0; i < P.orb; i++) {
      let a = P.orbA + (6.28 / P.orb) * i, ox = P.x + Math.cos(a) * 52, oy = P.y + Math.sin(a) * 52;
      let allT = [...ens]; if (boss) allT.push(boss);
      for (let e of allT) {
        if (Math.sqrt((e.x - ox) ** 2 + (e.y - oy) ** 2) < e.r + 9) {
          let key = 'o' + e._id; let lastHit = P.orbHit.get(key) || 0;
          if (T - lastHit >= 30) { hitE(e, 3 * P.dM); P.orbHit.set(key, T); }
        }
      }
    }
  }
  // Spears: hit cooldown 25 frames per enemy
  if (P.spears > 0) {
    P.spA += .025 * SPD * dt;
    for (let i = 0; i < P.spears; i++) {
      let a = P.spA + (6.28 / P.spears) * i, len = 65;
      let sx = P.x + Math.cos(a) * len, sy = P.y + Math.sin(a) * len;
      let allT = [...ens]; if (boss) allT.push(boss);
      for (let e of allT) {
        if (Math.sqrt((e.x - sx) ** 2 + (e.y - sy) ** 2) < e.r + 12) {
          let key = 's' + e._id; let lastHit = P.spearHit.get(key) || 0;
          if (T - lastHit >= 25) { hitE(e, 4 * P.dM); P.spearHit.set(key, T); }
        }
      }
    }
  }
  // Aura (NERFED: every 15 frames, reduced damage)
  if (P.aura > 0 && T % 15 === 0) {
    for (let e of ens) { if (Math.sqrt((e.x - P.x) ** 2 + (e.y - P.y) ** 2) < 50 + P.aura * 5) { e.hp -= P.aura * P.dM * .08; e.fl = 2 } }
    if (boss && Math.sqrt((boss.x - P.x) ** 2 + (boss.y - P.y) ** 2) < 60 + P.aura * 5) { boss.hp -= P.aura * P.dM * .08; boss.fl = 2 }
  }
  // Lightning (NERFED: longer cooldown, less damage)
  if (P.lightning > 0) {
    P.lightT++;
    if (P.lightT >= 120 - P.lightning * 8) {
      P.lightT = 0;
      let targets = [...ens]; if (boss) targets.push(boss);
      let valid = targets.filter(e => Math.sqrt((e.x - P.x) ** 2 + (e.y - P.y) ** 2) < 200);
      if (valid.length) {
        let t = valid[Math.random() * valid.length | 0]; hitE(t, 8 * P.dM * P.lightning);
        part(t.x, t.y, '#ffff40', 8, 4); snd(1200, .06, .06, 'square', 200); shk = 3; shkI = 2;
        parts.push({ x: t.x, y: t.y - 80, vx: 0, vy: 6, l: 6, ml: 6, c: '#ffff60', r: 3 })
      }
    }
  }
  // Shield reflect
  if (P.shield > 0) { for (let b of eBs) { if (Math.sqrt((b.x - P.x) ** 2 + (b.y - P.y) ** 2) < 35 + P.shield * 10) { b.vx *= -1; b.vy *= -1; b.dm = 5 * P.dM; b.c = '#00ff88'; b.reflected = true } } }
  // Poison trail (NERFED)
  if (P.poison > 0) { P.poisonT++; if (P.poisonT >= 15) { P.poisonT = 0; poisonT.push({ x: P.x, y: P.y, l: 90 + P.poison * 20, r: 16 + P.poison * 2, dm: P.poison * 1 * P.dM }) } }

  if (P.fT > 0) P.fT--;

  // ===== FIRE SYSTEM =====
  // Auto-fire: always fires at nearest enemy in range
  fireGun();
  // Gun2 auto-fire (secondary weapon)
  if (P.gun2 && !P.gun2.rld && (P.gun2.fT || 0) <= 0) {
    let a2 = getAutoAimAngle();
    if (a2 !== null) {
      let g2 = P.gun2;
      if (g2.ammo === undefined) g2.ammo = g2.mag;
      if (g2.ammo > 0) {
        let cd2 = Math.max(3, Math.floor(g2.rate * P.frM * (P.cdB || 1)));
        g2.fT = cd2; g2.ammo--;
        if (proj.length < MAX_PROJ) {
          let sp2 = (Math.random() - .5) * g2.spr * 2;
          proj.push({ x: P.x, y: P.y, vx: Math.cos(a2 + sp2) * g2.spd * SPD, vy: Math.sin(a2 + sp2) * g2.spd * SPD, dm: g2.dm * P.dM, r: g2.pR || 3, l: 9999, c: g2.col || '#ff8800', prc: (g2.prc || 1) + P.bPrc, exp: g2.sp === 'exp' || Math.random() < P.exCh, exR: g2.exR || 45, sl: g2.sp === 'slow' ? g2.slA : 0, vo: g2.sp === 'vort', voR: g2.vR || 0, voD: g2.vD || 0 });
        }
        if (g2.ammo <= 0) { g2.rld = true; g2.rldT = Math.max(20, g2.rldBase || 60); }
      }
    }
  }
  if (P.gun2) {
    if (P.gun2.fT > 0) P.gun2.fT--;
    if (P.gun2.rld && P.gun2.rldT > 0) { P.gun2.rldT--; if (P.gun2.rldT <= 0) { P.gun2.rld = false; P.gun2.ammo = P.gun2.mag } }
  }

  // Cull distance for all projectiles (off-screen + margin)
  let cullDist = Math.max(W(), H()) / ZOOM + 200;

  // ---- PROJECTILES ----
  for (let p of proj) {
    // Off-screen culling instead of timer
    let pdx = p.x - cam.x, pdy = p.y - cam.y;
    if (Math.abs(pdx) > cullDist || Math.abs(pdy) > cullDist) { p.l = 0 }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.trail && parts.length < MAX_PARTICLES) part(p.x, p.y, p.c, 1, .8);
    let tg = [...ens]; if (boss) tg.push(boss);
    for (let e of tg) {
      if (e.isGhost && !e.vis) continue;
      if (Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2) < (e.r || 10) + p.r) {
        hitE(e, p.dm); if (p.sl) e.sl = Math.max(e.sl || 0, p.sl);
        if (p.exp) {
          part(p.x, p.y, '#ff6020', 12, 6); sfxX(); shk = Math.max(shk, 6); shkI = Math.max(shkI, 5);
          for (let e2 of tg) if (e2 !== e && Math.sqrt((e2.x - p.x) ** 2 + (e2.y - p.y) ** 2) < (p.exR || 45)) hitE(e2, p.dm * .3)
        }
        if (p.vo && p.voD) vorts.push({ x: p.x, y: p.y, r: p.voR, d: p.voD, l: p.voD, dm: p.dm * .08 });
        p.prc = (p.prc || 1) - 1; if (p.prc <= 0) p.l = 0; break
      }
    }
  }
  proj = proj.filter(p => p.l > 0);

  for (let v of vorts) {
    v.l--; let tg = [...ens]; if (boss) tg.push(boss);
    for (let e of tg) { let dd = Math.sqrt((e.x - v.x) ** 2 + (e.y - v.y) ** 2); if (dd < v.r + (e.r || 10)) { let f = .6 * SPD; e.x += (v.x - e.x) / dd * f; e.y += (v.y - e.y) / dd * f; if (v.l % 12 === 0) hitE(e, v.dm) } }
    if (v.l % 4 === 0 && parts.length < MAX_PARTICLES) part(v.x + (Math.random() - .5) * v.r, v.y + (Math.random() - .5) * v.r, '#8020e0', 1, 1)
  }
  vorts = vorts.filter(v => v.l > 0);

  // Turrets (NERFED damage)
  for (let tu of turrets) {
    tu.life--; tu.t++;
    if (tu.t % 18 === 0) {
      let closest = null, cD = 250; for (let e of ens) { let d = Math.sqrt((e.x - tu.x) ** 2 + (e.y - tu.y) ** 2); if (d < cD) { cD = d; closest = e } }
      if (!closest && boss) { let d = Math.sqrt((boss.x - tu.x) ** 2 + (boss.y - tu.y) ** 2); if (d < 250) { closest = boss } }
      if (closest) {
        let a = Math.atan2(closest.y - tu.y, closest.x - tu.x);
        proj.push({ x: tu.x, y: tu.y, vx: Math.cos(a) * 8 * SPD, vy: Math.sin(a) * 8 * SPD, dm: tu.dm, r: 2, l: 80, c: '#20ffff', prc: 1, exp: false, sl: 0, vo: false });
        part(tu.x + Math.cos(a) * 8, tu.y + Math.sin(a) * 8, '#20ffff', 2, 2)
      }
    }
  }
  turrets = turrets.filter(t => t.life > 0);

  // Poison trails (NERFED)
  for (let p of poisonT) {
    p.l--; if (p.l % 12 === 0) {
      for (let e of ens) { if (Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2) < p.r + e.r) { e.hp -= p.dm; e.fl = 2 } }
      if (boss && Math.sqrt((boss.x - p.x) ** 2 + (boss.y - p.y) ** 2) < p.r + boss.r) { boss.hp -= p.dm; boss.fl = 2 }
    }
  }
  poisonT = poisonT.filter(p => p.l > 0);

  // Enemy bullets - cap
  if (eBs.length > MAX_EB) eBs.splice(0, eBs.length - MAX_EB);
  for (let b of eBs) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    // Off-screen culling for enemy bullets
    let ebdx = b.x - cam.x, ebdy = b.y - cam.y;
    if (Math.abs(ebdx) > cullDist || Math.abs(ebdy) > cullDist) b.l = 0;
    b.l--;
    if (!b.reflected && Math.sqrt((P.x - b.x) ** 2 + (P.y - b.y) ** 2) < P.r + b.r) { takeDmg(b.dm); b.l = 0 }
    if (b.reflected) {
      for (let e of ens) { if (Math.sqrt((e.x - b.x) ** 2 + (e.y - b.y) ** 2) < e.r + b.r) { hitE(e, b.dm); b.l = 0; break } }
      if (boss && Math.sqrt((boss.x - b.x) ** 2 + (boss.y - b.y) ** 2) < boss.r + b.r) { hitE(boss, b.dm); b.l = 0 }
    }
  }
  eBs = eBs.filter(b => b.l > 0);

  // Clear chain flags (FIX: synchronous, after all hits processed)
  for (let e of ens) e._chained = false; if (boss) boss._chained = false;

  // ---- ENEMIES ----
  for (let e of ens) {
    if (e.isGhost) { e.pT++; e.vis = e.pT % 150 < 110 }
    e.an++; let sm = e.sl > 0 ? .3 : 1; if (e.sl > 0) e.sl--;
    let ex = P.x - e.x, ey = P.y - e.y, ed = Math.sqrt(ex ** 2 + ey ** 2);
    if (ed > 1) { e.x += (ex / ed) * e.spd * sm * SPD * dt; e.y += (ey / ed) * e.spd * sm * SPD * dt }
    if (e.sho) { e.sT--; if (e.sT <= 0 && ed < 600) { e.sT = e.sCD; let a = Math.atan2(P.y - e.y, P.x - e.x); eBs.push({ x: e.x, y: e.y, vx: Math.cos(a) * 2 * SPD, vy: Math.sin(a) * 2 * SPD, r: 3, dm: e.dm, l: 9999, c: e.col }) } }
    if (e.fl > 0) e.fl--;
    if (ed < P.r + e.r) { takeDmg(e.dm); if (P.thorns) hitE(e, P.thorns) }

    // --- NEW ENEMY BEHAVIORS ---
    // Healer: heals nearby enemies
    if (e.tk === 'healer') {
      if (!e.healT) e.healT = 0;
      e.healT++;
      let hcfg = CONFIG.ENEMIES.healer;
      if (e.healT >= hcfg.healCD) {
        e.healT = 0;
        for (let e2 of ens) {
          if (e2 === e || e2.hp >= e2.mH) continue;
          if (Math.sqrt((e2.x - e.x) ** 2 + (e2.y - e.y) ** 2) < hcfg.healRadius) {
            e2.hp = Math.min(e2.mH, e2.hp + hcfg.healAmount);
            part(e2.x, e2.y, '#40ff80', 3, 2);
          }
        }
        part(e.x, e.y, '#80ffb0', 5, 3);
      }
    }
    // Assassin: dashes toward player periodically
    if (e.tk === 'assassin') {
      if (!e.dashT) e.dashT = 0;
      e.dashT++;
      let acfg = CONFIG.ENEMIES.assassin;
      if (e.dashT >= acfg.dashCD && ed < 200) {
        e.dashT = 0;
        let da = Math.atan2(P.y - e.y, P.x - e.x);
        e.x += Math.cos(da) * acfg.dashDist;
        e.y += Math.sin(da) * acfg.dashDist;
        part(e.x, e.y, '#c060ff', 6, 3);
      }
    }
    // Necromancer enemy: summons skeletons
    if (e.tk === 'necro_e') {
      if (!e.sumT) e.sumT = 0;
      e.sumT++;
      let ncfg = CONFIG.ENEMIES.necro_e;
      if (e.sumT >= ncfg.summonCD) {
        e.sumT = 0;
        for (let i = 0; i < ncfg.summonCount; i++) {
          if (ens.length < MAX_ENEMIES) {
            let sa = Math.random() * 6.28;
            let se = { ...ET[ncfg.summonType], x: e.x + Math.cos(sa) * 30, y: e.y + Math.sin(sa) * 30 };
            let hm = 1 + (wave - 1) * CONFIG.WAVES.hpScalePerWave;
            ens.push({
              x: se.x, y: se.y, r: se.r, spd: se.spd, hp: se.hp * hm, mH: se.hp * hm,
              xp: se.xp, dm: se.dm, col: se.col, tk: ncfg.summonType, fl: 0, an: Math.random() * 100 | 0,
              sho: se.shoots, sCD: se.sCD || 0, sT: (se.sCD || 100), isGhost: se.isGhost,
              pT: 0, vis: true, sl: 0, el: false, cD: .06, _id: ++spawnId
            });
          }
        }
        part(e.x, e.y, '#8040ff', 8, 4);
      }
    }
    // Shielder: frontal shield absorbs damage (handled in hitE wrapper below)
    if (e.tk === 'shielder' && e.shieldHP === undefined) {
      e.shieldHP = CONFIG.ENEMIES.shielder.shieldHP;
    }

    if (e.hp <= 0) {
      // Bomber: explodes on death
      if (e.tk === 'bomber') {
        let bcfg = CONFIG.ENEMIES.bomber;
        let dd = Math.sqrt((P.x - e.x) ** 2 + (P.y - e.y) ** 2);
        if (dd < bcfg.explodeRadius) takeDmg(bcfg.explodeDmg);
        for (let e2 of ens) {
          if (e2 === e) continue;
          let dd2 = Math.sqrt((e2.x - e.x) ** 2 + (e2.y - e.y) ** 2);
          if (dd2 < bcfg.explodeRadius) { e2.hp -= bcfg.explodeDmg; e2.fl = 3 }
        }
        part(e.x, e.y, '#ff6020', 15, 7); sfxX(); shk = Math.max(shk, 6); shkI = Math.max(shkI, 5);
      }
      // Worm: splits into smaller worms on death
      if (e.tk === 'worm' && !e.isSplit) {
        let wcfg = CONFIG.ENEMIES.worm;
        for (let i = 0; i < wcfg.splitCount; i++) {
          if (ens.length < MAX_ENEMIES) {
            let sa = Math.random() * 6.28;
            ens.push({
              x: e.x + Math.cos(sa) * 15, y: e.y + Math.sin(sa) * 15,
              r: 5, spd: .9, hp: 10, mH: 10, xp: 1, dm: 1, col: '#c0a050',
              tk: 'worm', fl: 0, an: Math.random() * 100 | 0, sho: false, sCD: 0, sT: 0,
              isGhost: false, pT: 0, vis: true, sl: 0, el: false, cD: .04,
              isSplit: true, _id: ++spawnId
            });
          }
        }
      }
      kills++; sv.tK++; part(e.x, e.y, e.col, 6, 3); sfxK(); shk = Math.max(shk, 2); shkI = Math.max(shkI, 2);
      orbs.push({ x: e.x, y: e.y, xp: e.xp * (eXM || 1), r: 3 + e.xp, b: Math.random() * 6, t: e.xp >= 4 ? 'big' : e.xp >= 2 ? 'med' : 'sm' });
      if (Math.random() < e.cD * eCM) orbs.push({ x: e.x + 6, y: e.y, xp: 0, r: 4, b: Math.random() * 6, t: 'coin', cv: 1 });
      // Clean up hit cooldown maps
      P.orbHit.delete('o' + e._id);
      P.spearHit.delete('s' + e._id);
    }
  }
  ens = ens.filter(e => e.hp > 0);

  // ---- BOSS ----
  if (boss) {
    let b = boss; b.ang += .015 * SPD * dt; b.aT--; b.an++;
    let hp = b.hp / b.mH;
    if (b.ph >= 2 && hp < .5 && b.cPh < 2) { b.cPh = 2; banner('⚠️ ФАЗА 2!', '#ff4040', 1800); b.aT = 10; shk = 12; shkI = 10; sfxB() }
    if (b.ph >= 3 && hp < .25 && b.cPh < 3) { b.cPh = 3; banner('⚠️ ФАЗА 3!', '#ff2020', 1800); b.aT = 5; shk = 16; shkI = 12; sfxB() }
    if (b.chg > 0) { let t = b.chT, dx2 = t.x - b.x, dy2 = t.y - b.y, d2 = Math.sqrt(dx2 ** 2 + dy2 ** 2); if (d2 > 5) { b.x += (dx2 / d2) * 4.5 * SPD * dt; b.y += (dy2 / d2) * 4.5 * SPD * dt } b.chg--; part(b.x, b.y, b.col, 1, 2) }
    else { let dx2 = P.x - b.x, dy2 = P.y - b.y, d2 = Math.sqrt(dx2 ** 2 + dy2 ** 2); if (d2 > 60) { b.x += (dx2 / d2) * b.spd * (1 + b.cPh * .1) * SPD * dt; b.y += (dy2 / d2) * b.spd * (1 + b.cPh * .1) * SPD * dt } }
    if (b.aT <= 0) { b.aT = Math.max(40, 90 - b.cPh * 15); bAtk(b) }
    if (b.fl > 0) b.fl--;
    if (Math.sqrt((P.x - b.x) ** 2 + (P.y - b.y) ** 2) < P.r + b.r) takeDmg(b.dm);
    document.getElementById('bbf').style.width = Math.max(0, hp * 100) + '%';
    if (b.hp <= 0) { bK++; part(b.x, b.y, b.col, 30, 8); part(b.x, b.y, '#f0c030', 20, 7); shk = 18; shkI = 14; bossRwd(); boss = null; document.getElementById('bbw').style.display = 'none' }
  }

  // ---- ORBS ----
  for (let o of orbs) {
    o.b += .04; let dx2 = P.x - o.x, dy2 = P.y - o.y, d = Math.sqrt(dx2 ** 2 + dy2 ** 2);
    if (d < P.magR) { let s = Math.max(2, 5.5 - d * .01); o.x += (dx2 / d) * s * SPD * dt; o.y += (dy2 / d) * s * SPD * dt }
    if (d < P.r + o.r) {
      o.dead = true;
      if (o.t === 'coin' || o.t === 'gold') { let v = Math.ceil((o.cv || 1) * P.cM * eCM); sC += v; sfxC() }
      else {
        P.xp += o.xp * P.xM;
        while (P.xp >= P.xpN) { P.xp -= P.xpN; P.lvl++; P.xpN = Math.floor(P.xpN * CONFIG.LEVELING.xpMultiplier) + CONFIG.LEVELING.xpFlatAdd; showLvl() }
      }
    }
  }
  orbs = orbs.filter(o => !o.dead);

  for (let p of parts) { p.x += p.vx; p.y += p.vy; p.vx *= .92; p.vy *= .92; if (p.grav) p.vy += .12; p.l-- }
  parts = parts.filter(p => p.l > 0);
  for (let d of dNs) { d.y += d.vy; d.l-- } dNs = dNs.filter(d => d.l > 0);

  // ---- CRATES ----
  crateT++;
  bonusCrateT++;
  // Weapon crate spawn
  if (wave >= 2 && crateT >= CONFIG.CRATES.weaponSpawnInterval && Math.random() < CONFIG.CRATES.weaponSpawnChance) {
    crateT = 0;
    let ca = Math.random() * 6.28, cd2 = 200 + Math.random() * 500;
    let cx2 = P.x + Math.cos(ca) * cd2, cy2 = P.y + Math.sin(ca) * cd2;
    let wd = Math.sqrt(cx2 * cx2 + cy2 * cy2); if (wd > WORLD_R - 60) { cx2 *= (WORLD_R - 60) / wd; cy2 *= (WORLD_R - 60) / wd }
    // Pick random unlocked or new weapon
    let avGuns = GUNS.filter(g => sv.gnO.includes(g.id) && g.id !== P.gun.id && (!P.gun2 || g.id !== P.gun2.id));
    if (avGuns.length > 0) {
      let rg = avGuns[Math.random() * avGuns.length | 0];
      crates.push({ x: cx2, y: cy2, type: 'weapon', gun: rg, pickupT: 0, r: 16 });
      banner('📦 Оружие на карте!', '#f0c030', 2000);
    }
  }
  // Bonus crate spawn
  if (wave >= 2 && bonusCrateT >= CONFIG.CRATES.bonusSpawnInterval && Math.random() < CONFIG.CRATES.bonusSpawnChance) {
    bonusCrateT = 0;
    let ca = Math.random() * 6.28, cd2 = 200 + Math.random() * 400;
    let cx2 = P.x + Math.cos(ca) * cd2, cy2 = P.y + Math.sin(ca) * cd2;
    let wd = Math.sqrt(cx2 * cx2 + cy2 * cy2); if (wd > WORLD_R - 60) { cx2 *= (WORLD_R - 60) / wd; cy2 *= (WORLD_R - 60) / wd }
    let bonusTypes = ['magnet', 'fullheal', 'doublexp'];
    crates.push({ x: cx2, y: cy2, type: 'bonus', bonus: bonusTypes[Math.random() * bonusTypes.length | 0], pickupT: 0, r: 14 });
    banner('⭐ Бонус на карте!', '#40ff80', 2000);
  }
  // Process crates
  for (let cr of crates) {
    let dd = Math.sqrt((P.x - cr.x) ** 2 + (P.y - cr.y) ** 2);
    if (dd < CONFIG.CRATES.pickupRadius) {
      cr.pickupT += dt;
      if (cr.pickupT >= CONFIG.CRATES.pickupTime) {
        cr.dead = true;
        if (cr.type === 'weapon') {
          let gc = CONFIG.WEAPONS[cr.gun.id];
          let ng = gc ? { ...cr.gun, dm: gc.dm, rate: gc.rate, mag: gc.mag, rld: gc.rld, spr: gc.spr, spd: gc.spd } : cr.gun;
          if (!P.gun2) {
            P.gun2 = { ...ng, ammo: ng.mag, rldBase: ng.rld, rld: false, fT: 0 }; banner(`🔫 +${cr.gun.name}!`, '#f0c030', 2500); sfxL();
          } else {
            // Show weapon swap choice
            pau = true;
            let ls = document.getElementById('ls'); ls.classList.add('a');
            let lc = document.getElementById('lc'); lc.innerHTML = '';
            document.getElementById('lt').textContent = 'ЗАМЕНА ОРУЖИЯ';
            // Option 1: replace gun1
            let d1 = document.createElement('div'); d1.className = 'uc';
            d1.innerHTML = `<div class="ui">${P.gun.icon || '🔫'}</div><div class="un">Заменить: ${P.gun.name}</div><div class="ud">→ ${cr.gun.name}</div>`;
            d1.onclick = () => { P.gun = { ...ng }; P.ammo = ng.mag; P.mAm = ng.mag; P.rld = false; ls.classList.remove('a'); pau = false; document.getElementById('lt').textContent = 'LEVEL UP!' };
            lc.appendChild(d1);
            // Option 2: replace gun2
            let d2 = document.createElement('div'); d2.className = 'uc';
            d2.innerHTML = `<div class="ui">${P.gun2.icon || '🔫'}</div><div class="un">Заменить: ${P.gun2.name}</div><div class="ud">→ ${cr.gun.name}</div>`;
            d2.onclick = () => { P.gun2 = { ...ng, ammo: ng.mag, rldBase: ng.rld, rld: false, fT: 0 }; ls.classList.remove('a'); pau = false; document.getElementById('lt').textContent = 'LEVEL UP!' };
            lc.appendChild(d2);
            // Option 3: skip
            let d3 = document.createElement('div'); d3.className = 'uc';
            d3.innerHTML = `<div class="ui">❌</div><div class="un">Отказаться</div><div class="ud">Оставить текущее</div>`;
            d3.onclick = () => { ls.classList.remove('a'); pau = false; document.getElementById('lt').textContent = 'LEVEL UP!' };
            lc.appendChild(d3);
          }
        } else if (cr.type === 'bonus') {
          if (cr.bonus === 'magnet') { P.magR += 80; banner('🧲 МЕГА-МАГНИТ!', '#40ff80', 2500); for (let o of orbs) { o.x = P.x + (Math.random() - .5) * 30; o.y = P.y + (Math.random() - .5) * 30 } }
          else if (cr.bonus === 'fullheal') { P.hp = P.mH; banner('💚 ПОЛНОЕ ИСЦЕЛЕНИЕ!', '#40ff80', 2500); part(P.x, P.y, '#40ff80', 20, 5) }
          else if (cr.bonus === 'doublexp') { eXM = 2; setTimeout(() => { eXM = 1 }, 7200); banner('📗 2× ОПЫТ 2 МИН!', '#a060ff', 2500) }
          sfxL();
        }
      }
    } else {
      cr.pickupT = Math.max(0, cr.pickupT - dt * 0.5); // slowly decay if player walks away
    }
  }
  crates = crates.filter(c => !c.dead);

  // Spawning (BULLET HELL: faster, more enemies)
  let cfg = waveCfg(wave);
  if (eSp < cfg.cnt) { spT--; if (spT <= 0) { spT = cfg.rate; let spawnBatch = Math.min(3, cfg.cnt - eSp); for (let i = 0; i < spawnBatch; i++) { spawnE(cfg.ty[Math.random() * cfg.ty.length | 0], cfg.hm); eSp++ } } }
  if (eSp >= cfg.cnt && ens.length === 0 && !boss) {
    wave++; eSp = 0; spT = 20; let nc = waveCfg(wave);
    banner(nc.iB ? `⚔️ ВОЛНА ${wave} — БОСС!` : `ВОЛНА ${wave}`, nc.iB ? '#ff4040' : '#00ff88', 2000);
    if (nc.iB) setTimeout(() => { if (run) spawnBoss(wave) }, 2500)
  }
  if (shk > 0) shk--;
  cam.x += (P.x - cam.x) * .1; cam.y += (P.y - cam.y) * .1;
  if (P.hp <= 0) gameOver();

  // HUD
  document.getElementById('xpf').style.width = (P.xp / P.xpN * 100) + '%';
  document.getElementById('chud').textContent = '🪙 ' + (sv.coins + sC);
  // Wave info
  document.getElementById('waveInfo').textContent = `👾 ${ens.length}/${cfg.cnt} | ⏱ W${wave}`;
}

// ===== DRAW =====
function drawHeart(x, y, full, half) {
  let p = 2;
  if (full) { X.fillStyle = '#ff2040'; X.fillRect(x, y + p, p * 2, p); X.fillRect(x + p * 3, y + p, p * 2, p); X.fillRect(x - p, y + p * 2, p * 7, p * 2); X.fillRect(x, y + p * 4, p * 5, p); X.fillRect(x + p, y + p * 5, p * 3, p); X.fillRect(x + p * 2, y + p * 6, p, p); X.fillStyle = '#ff6080'; X.fillRect(x, y + p * 2, p, p) }
  else if (half) { X.fillStyle = '#ff2040'; X.fillRect(x, y + p, p * 2, p); X.fillRect(x - p, y + p * 2, p * 4, p * 2); X.fillRect(x, y + p * 4, p * 3, p); X.fillRect(x + p, y + p * 5, p * 2, p); X.fillRect(x + p * 2, y + p * 6, p, p); X.fillStyle = '#333'; X.fillRect(x + p * 3, y + p, p * 2, p); X.fillRect(x + p * 3, y + p * 2, p * 3, p * 2); X.fillRect(x + p * 3, y + p * 4, p * 2, p); X.fillRect(x + p * 3, y + p * 5, p, p) }
  else { X.fillStyle = '#333'; X.fillRect(x, y + p, p * 2, p); X.fillRect(x + p * 3, y + p, p * 2, p); X.fillRect(x - p, y + p * 2, p * 7, p * 2); X.fillRect(x, y + p * 4, p * 5, p); X.fillRect(x + p, y + p * 5, p * 3, p); X.fillRect(x + p * 2, y + p * 6, p, p) }
}

function draw() {
  X.clearRect(0, 0, C.width, C.height); X.fillStyle = '#0a0f0a'; X.fillRect(0, 0, C.width, C.height);
  if (!P || !run) { return }
  X.save();
  let sx = 0, sy = 0; if (shk > 0) { sx = (Math.random() * shkI * 2 - shkI) | 0; sy = (Math.random() * shkI * 2 - shkI) | 0 }
  let cx = W() / 2 - cam.x * ZOOM + sx, cy = H() / 2 - cam.y * ZOOM + sy;
  X.translate(cx, cy); X.scale(ZOOM, ZOOM);

  // Floor
  let tS = 64, vsX = cam.x - W() / 2 / ZOOM, vsY = cam.y - H() / 2 / ZOOM;
  for (let x = Math.floor(vsX / tS) * tS; x < cam.x + W() / 2 / ZOOM + tS; x += tS) {
    for (let y = Math.floor(vsY / tS) * tS; y < cam.y + H() / 2 / ZOOM + tS; y += tS) {
      if (x * x + y * y > (WORLD_R + 100) ** 2) continue;
      let h = ((x * 73856093) ^ (y * 19349663)) & 0xFFFF, g = 38 + (h % 14);
      X.fillStyle = `rgb(${g * .4 | 0},${g + 12},${g * .28 | 0})`; X.fillRect(x, y, tS, tS);
      if (h % 8 === 0) { X.fillStyle = `rgb(${g * .3 | 0},${g + 18},${g * .18 | 0})`; X.fillRect(x + (h % 30) + 4, y + ((h >> 4) % 30) + 4, PX, PX * 2) }
    }
  }

  // Boundary
  X.strokeStyle = 'rgba(0,0,0,.5)'; X.lineWidth = 80; X.beginPath(); X.arc(0, 0, WORLD_R + 40, 0, 6.28); X.stroke();
  X.strokeStyle = 'rgba(0,0,0,.2)'; X.lineWidth = 40; X.beginPath(); X.arc(0, 0, WORLD_R, 0, 6.28); X.stroke();

  // World objects (culled)
  for (let o of wObjs) {
    let dx2 = o.x - cam.x, dy2 = o.y - cam.y; if (Math.abs(dx2) > W() / 2 / ZOOM + 50 || Math.abs(dy2) > H() / 2 / ZOOM + 50) continue;
    let ox = o.x | 0, oy = o.y | 0;
    if (o.t === 'tree') { X.fillStyle = 'rgba(0,0,0,.12)'; X.fillRect(ox - 5, oy + 7, 10, 3); X.fillStyle = '#5a3a18'; X.fillRect(ox - 2, oy - 1, 4, 9); X.fillStyle = '#1a7030'; X.fillRect(ox - 8, oy - 6, 16, 6); X.fillStyle = '#28a040'; X.fillRect(ox - 5, oy - 10, 10, 5); X.fillStyle = '#38c050'; X.fillRect(ox - 3, oy - 13, 6, 3) }
    else if (o.t === 'rock') { X.fillStyle = '#6a6a74'; X.fillRect(ox - 7, oy - 2, 14, 7); X.fillStyle = '#7a7a84'; X.fillRect(ox - 9, oy - 5, 18, 5); X.fillStyle = '#8a8a94'; X.fillRect(ox - 3, oy - 7, 6, 3) }
    else if (o.t === 'bnd') { X.fillStyle = '#0a2018'; X.fillRect(ox - 16, oy - 14, 32, 24); X.fillStyle = '#1a3020'; X.fillRect(ox - 12, oy - 20, 24, 10); X.fillStyle = '#2a4030'; X.fillRect(ox - 8, oy - 24, 16, 6) }
  }

  // Crates
  for (let cr of crates) {
    let cdx = cr.x - cam.x, cdy = cr.y - cam.y;
    if (Math.abs(cdx) > W() / 2 / ZOOM + 30 || Math.abs(cdy) > H() / 2 / ZOOM + 30) continue;
    let cx2 = cr.x | 0, cy2 = cr.y | 0, p = PX;
    if (cr.type === 'weapon') {
      // Wooden crate with weapon icon
      X.fillStyle = '#8a6020'; X.fillRect(cx2 - p * 4, cy2 - p * 4, p * 8, p * 8);
      X.fillStyle = '#c09030'; X.fillRect(cx2 - p * 3, cy2 - p * 3, p * 6, p * 6);
      X.fillStyle = '#f0c030'; X.fillRect(cx2 - p, cy2 - p * 2, p * 2, p * 4);
      X.fillRect(cx2 - p * 2, cy2 - p, p * 4, p * 2);
      // Glow pulse
      let glow = .15 + Math.sin(T * .06) * .08;
      X.globalAlpha = glow; X.fillStyle = '#f0c030'; X.beginPath(); X.arc(cx2, cy2, 20, 0, 6.28); X.fill(); X.globalAlpha = 1;
    } else {
      // Bonus crate - star shape
      let bonusCol = cr.bonus === 'magnet' ? '#40a0ff' : cr.bonus === 'fullheal' ? '#40ff80' : '#a060ff';
      X.fillStyle = '#2a2a3e'; X.fillRect(cx2 - p * 3, cy2 - p * 3, p * 6, p * 6);
      X.fillStyle = bonusCol; X.fillRect(cx2 - p * 2, cy2 - p * 2, p * 4, p * 4);
      X.fillStyle = '#fff'; X.fillRect(cx2 - p * .5, cy2 - p * .5, p, p);
      let glow = .12 + Math.sin(T * .08) * .08;
      X.globalAlpha = glow; X.fillStyle = bonusCol; X.beginPath(); X.arc(cx2, cy2, 18, 0, 6.28); X.fill(); X.globalAlpha = 1;
    }
    // Pickup progress bar
    if (cr.pickupT > 0) {
      let pct = cr.pickupT / CONFIG.CRATES.pickupTime;
      let bw = 24;
      X.fillStyle = '#1a1a2a'; X.fillRect(cx2 - bw / 2, cy2 + p * 5, bw, 3);
      X.fillStyle = '#00ff88'; X.fillRect(cx2 - bw / 2, cy2 + p * 5, (bw * pct) | 0, 3);
    }
  }

  // Poison trails
  for (let p of poisonT) { X.globalAlpha = Math.min(.25, p.l / 60 * .25); X.fillStyle = '#40c040'; X.beginPath(); X.arc(p.x, p.y, p.r, 0, 6.28); X.fill(); X.globalAlpha = 1 }
  // Vortexes
  for (let v of vorts) { X.globalAlpha = v.l / v.d * .4; X.strokeStyle = '#8020e0'; X.lineWidth = 3; X.beginPath(); X.arc(v.x, v.y, v.r * (1 - v.l / v.d * .3), 0, 6.28); X.stroke(); X.globalAlpha = 1 }

  // Orbs
  for (let o of orbs) {
    let by = Math.sin(o.b) * 2, ox = o.x | 0, oy = (o.y + by) | 0;
    if (o.t === 'coin' || o.t === 'gold') { X.fillStyle = o.t === 'gold' ? '#f0c030' : '#f0d060'; X.fillRect(ox - 3, oy - 3, 6, 6); X.fillStyle = '#fff'; X.fillRect(ox - 1, oy - 1, 2, 2) }
    else if (o.t === 'big') { X.fillStyle = '#4080ff'; X.fillRect(ox - 3, oy - 4, 6, 8); X.fillStyle = '#80c0ff'; X.fillRect(ox - 1, oy - 2, 2, 2) }
    else if (o.t === 'med') { X.fillStyle = '#40c040'; X.fillRect(ox - 3, oy - 3, 6, 6); X.fillStyle = '#80ff80'; X.fillRect(ox - 1, oy - 1, 2, 2) }
    else { X.fillStyle = '#40e040'; X.fillRect(ox - 2, oy - 2, 4, 4) }
  }

  // Particles (non-flash)
  for (let p of parts) { if (p.flash) continue; X.globalAlpha = Math.min(1, p.l / p.ml); X.fillStyle = p.c; X.fillRect(p.x - p.r / 2 | 0, p.y - p.r / 2 | 0, p.r | 0, p.r | 0); X.globalAlpha = 1 }
  // Turrets
  for (let tu of turrets) { X.fillStyle = '#20c0c0'; X.fillRect(tu.x - 5 | 0, tu.y - 5 | 0, 10, 10); X.fillStyle = '#60ffff'; X.fillRect(tu.x - 3 | 0, tu.y - 3 | 0, 6, 6) }

  // ENEMIES (with view culling)
  let viewW = W() / 2 / ZOOM + 60, viewH = H() / 2 / ZOOM + 60;
  for (let e of ens) {
    if (e.isGhost && !e.vis) continue;
    if (Math.abs(e.x - cam.x) > viewW || Math.abs(e.y - cam.y) > viewH) continue; // FIX: culling
    X.save(); if (e.isGhost && e.pT % 150 > 90) X.globalAlpha = .4; if (e.sl > 0) { X.globalAlpha = Math.max(.5, X.globalAlpha - .2) }
    let et = ET[e.tk]; if (et && et.draw) et.draw(e.x | 0, e.y | 0, e.fl > 0, e.an);
    if (e.el) { X.strokeStyle = '#ff8000'; X.lineWidth = 2; X.beginPath(); X.arc(e.x, e.y, e.r + 3, 0, 6.28); X.stroke() }
    if (e.sl > 0) { X.fillStyle = 'rgba(100,200,255,.12)'; X.beginPath(); X.arc(e.x, e.y, e.r + 4, 0, 6.28); X.fill() }
    if (e.hp < e.mH) { let bw = e.r * 2; X.fillStyle = '#300'; X.fillRect(e.x - bw / 2 | 0, e.y - e.r - 5 | 0, bw, 2); X.fillStyle = '#f02020'; X.fillRect(e.x - bw / 2 | 0, e.y - e.r - 5 | 0, (bw * e.hp / e.mH) | 0, 2) }
    X.restore()
  }

  // BOSS
  if (boss) {
    let b = boss;
    X.globalAlpha = .06 + Math.sin(T * .04) * .03; X.strokeStyle = b.col; X.lineWidth = 4; X.beginPath(); X.arc(b.x, b.y, b.r + 14 + Math.sin(T * .06) * 5, 0, 6.28); X.stroke(); X.globalAlpha = 1;
    if (b.draw) b.draw(b.x | 0, b.y | 0, b.fl > 0, b.an);
    else { X.fillStyle = b.fl > 0 ? '#fff' : b.col; X.beginPath(); X.arc(b.x, b.y, b.r, 0, 6.28); X.fill() }
    if (b.cPh > 1) { X.strokeStyle = 'rgba(255,255,255,.3)'; X.lineWidth = 1; for (let i = 0; i < b.cPh; i++) { X.beginPath(); X.arc(b.x, b.y, b.r + 18 + i * 7, 0, 6.28); X.stroke() } }
  }

  // PLAYER
  X.save(); if (P.inv > 0 && Math.floor(P.inv / 3) % 2) X.globalAlpha = .3;
  let px = P.x | 0, py = P.y | 0, bob = Math.sin(P.anim * .12) * 1.5 | 0;
  // Use auto-aim angle for gun visual if no manual input
  let ga;
  if (mouse.dn || aSt.dn) {
    ga = Math.atan2(mouse.y - H() / 2, mouse.x - W() / 2);
  } else {
    ga = getAutoAimAngle();
    if (ga === null) ga = Math.atan2(mouse.y - H() / 2, mouse.x - W() / 2);
  }
  if (P.aura > 0) { X.globalAlpha = .08; X.fillStyle = '#ff4020'; X.beginPath(); X.arc(px, py, 50 + P.aura * 5, 0, 6.28); X.fill(); X.globalAlpha = P.inv > 0 && Math.floor(P.inv / 3) % 2 ? .3 : 1 }
  if (P.shield > 0) { X.strokeStyle = 'rgba(0,255,136,.15)'; X.lineWidth = 2; X.beginPath(); X.arc(px, py, 35 + P.shield * 10, 0, 6.28); X.stroke() }
  X.fillStyle = 'rgba(0,0,0,.18)'; X.fillRect(px - 7, py + 9, 14, 3);
  let lo = Math.sin(P.anim * .22) * 2 | 0;
  X.fillStyle = '#3a3a50'; X.fillRect(px - 4, py + 3 + bob, 3, 6); X.fillRect(px + 1, py + 3 + bob + lo, 3, 6);
  let ch = CHARS.find(c => c.id === sv.sCh);
  X.fillStyle = ch && ch.b.dm > 1.1 ? '#6040a0' : '#4060a0'; X.fillRect(px - 5, py - 4 + bob, 10, 8);
  X.fillStyle = '#dbb088'; X.fillRect(px - 3, py - 11 + bob, 6, 7);
  let ed2 = Math.cos(ga) * 2 | 0; X.fillStyle = '#222'; X.fillRect(px - 2 + ed2, py - 9 + bob, 2, 2); X.fillRect(px + 1 + ed2, py - 9 + bob, 2, 2);
  X.strokeStyle = P.gun.col; X.lineWidth = 3; X.beginPath(); X.moveTo(px, py + bob - 2); X.lineTo(px + Math.cos(ga) * 18, py + bob - 2 + Math.sin(ga) * 18); X.stroke();
  if (P.sh > 0) { X.strokeStyle = 'rgba(0,170,255,.2)'; X.lineWidth = 2; X.beginPath(); X.arc(px, py + bob, P.r + 4, 0, 6.28); X.stroke() }
  X.restore();

  // Ammo bar
  let abW = 22, abY = py - 17 + bob;
  X.fillStyle = '#1a1a2a'; X.fillRect(px - abW / 2, abY, abW, 2);
  if (P.rld) { let pct = 1 - P.rldT / Math.max(1, P.gun.rld); X.fillStyle = '#ff8020'; X.fillRect(px - abW / 2, abY, (abW * pct) | 0, 2) }
  else { X.fillStyle = '#00aaff'; X.fillRect(px - abW / 2, abY, (abW * P.ammo / P.mAm) | 0, 2) }

  // Orbitals
  if (P.orb > 0) { for (let i = 0; i < P.orb; i++) { let a = P.orbA + (6.28 / P.orb) * i, ox = P.x + Math.cos(a) * 52, oy = P.y + Math.sin(a) * 52; X.fillStyle = '#4080ff'; X.fillRect(ox - 3 | 0, oy - 3 | 0, 6, 6); X.fillStyle = '#80c0ff'; X.fillRect(ox - 1 | 0, oy - 1 | 0, 3, 3) } }
  // Spears
  if (P.spears > 0) { for (let i = 0; i < P.spears; i++) { let a = P.spA + (6.28 / P.spears) * i, len = 65; X.strokeStyle = '#c0a060'; X.lineWidth = 2; X.beginPath(); X.moveTo(P.x + Math.cos(a) * 20, P.y + Math.sin(a) * 20); X.lineTo(P.x + Math.cos(a) * len, P.y + Math.sin(a) * len); X.stroke(); X.fillStyle = '#e0e0e0'; let tx = P.x + Math.cos(a) * len, ty = P.y + Math.sin(a) * len; X.fillRect(tx - 3 | 0, ty - 3 | 0, 6, 6) } }

  // Projectiles
  for (let p of proj) {
    if (p.beam) { X.strokeStyle = p.c; X.lineWidth = p.r * 2.5; X.globalAlpha = .5 + Math.random() * .5; X.beginPath(); X.moveTo(p.x - p.vx * 5, p.y - p.vy * 5); X.lineTo(p.x, p.y); X.stroke(); X.globalAlpha = 1 }
    else { X.fillStyle = p.c; X.beginPath(); X.arc(p.x, p.y, p.r, 0, 6.28); X.fill(); X.fillStyle = 'rgba(255,255,255,.5)'; X.fillRect(p.x - 1 | 0, p.y - 1 | 0, 2, 2) }
  }

  // Enemy bullets
  for (let b of eBs) { X.fillStyle = b.c; X.beginPath(); X.arc(b.x, b.y, b.r, 0, 6.28); X.fill(); X.fillStyle = '#fff'; X.fillRect(b.x - 1 | 0, b.y - 1 | 0, 2, 2) }

  // Damage numbers
  for (let d of dNs) { X.globalAlpha = Math.min(1, d.l / 15); X.font = `bold ${d.s}px Orbitron`; X.textAlign = 'center'; X.fillStyle = '#000'; X.fillText(d.t, (d.x + 1) | 0, (d.y + 1) | 0); X.fillStyle = d.c; X.fillText(d.t, d.x | 0, d.y | 0) }
  X.globalAlpha = 1;

  // Screen flash
  for (let p of parts) { if (!p.flash) continue; X.globalAlpha = p.l / p.ml * .12; X.fillStyle = p.c; X.fillRect(cam.x - W() / 2 / ZOOM, cam.y - H() / 2 / ZOOM, W() / ZOOM, H() / ZOOM); X.globalAlpha = 1 }
  X.restore();

  // ===== HUD (screen space) =====
  // HP Bar
  let hpW = 140, hpH = 10, hpX = 8, hpY = 6;
  let hpPct = Math.max(0, P.hp / P.mH);
  let hpCol = hpPct > 0.5 ? '#00ff60' : hpPct > 0.25 ? '#ffcc00' : '#ff2020';
  X.fillStyle = '#1a0a0a'; X.fillRect(hpX, hpY, hpW, hpH);
  X.fillStyle = hpCol; X.fillRect(hpX, hpY, (hpW * hpPct) | 0, hpH);
  X.strokeStyle = '#333'; X.lineWidth = 1; X.strokeRect(hpX, hpY, hpW, hpH);
  X.font = 'bold 8px Orbitron'; X.textAlign = 'center'; X.fillStyle = '#fff';
  X.fillText(`${Math.ceil(P.hp)} / ${P.mH}`, hpX + hpW / 2, hpY + 8);
  // Rage indicator
  if (P.rageDmg > 1) { X.fillStyle = '#ff2020'; X.font = 'bold 8px Orbitron'; X.textAlign = 'left'; X.fillText('RAGE!', hpX + hpW + 6, hpY + 9) }
  X.textAlign = 'left';
  X.font = 'bold 10px Orbitron'; X.fillStyle = '#00ff88';
  X.fillText(`LVL ${P.lvl}  W${wave}  ☠${kills}`, 8, 32);
  if (P.aCD) {
    let pct = 1 - P.aTmr / P.aCD; X.fillStyle = '#1a1a2a'; X.fillRect(8, 36, 50, 4); X.fillStyle = pct >= 1 ? '#00ff88' : '#666'; X.fillRect(8, 36, 50 * pct | 0, 4);
    if (pct >= 1) { X.fillStyle = '#00ff88'; X.font = '7px Orbitron'; X.fillText('SPACE', 12, 49) }
  }

  // Navigation arrows to crates
  for (let cr of crates) {
    let cdx = cr.x - cam.x, cdy = cr.y - cam.y;
    let csx = W() / 2 + cdx * ZOOM, csy = H() / 2 + cdy * ZOOM;
    // Only show arrow if off-screen
    if (csx < 0 || csx > W() || csy < 0 || csy > H()) {
      let ang = Math.atan2(cdy, cdx);
      let arrX = W() / 2 + Math.cos(ang) * Math.min(W(), H()) * 0.4;
      let arrY = H() / 2 + Math.sin(ang) * Math.min(W(), H()) * 0.4;
      X.save(); X.translate(arrX, arrY); X.rotate(ang);
      X.fillStyle = cr.type === 'weapon' ? '#f0c030' : '#40ff80';
      X.beginPath(); X.moveTo(10, 0); X.lineTo(-6, -6); X.lineTo(-6, 6); X.closePath(); X.fill();
      X.font = '7px Orbitron'; X.textAlign = 'center'; X.fillText(cr.type === 'weapon' ? '📦' : '⭐', 0, -10);
      X.restore();
    }
  }

  // Crosshair
  if (!isMob) {
    let cx2 = mouse.x, cy2 = mouse.y; X.strokeStyle = P.gun.col; X.lineWidth = 1.5;
    X.beginPath(); X.arc(cx2, cy2, 7, 0, 6.28); X.stroke();
    X.beginPath(); X.moveTo(cx2 - 11, cy2); X.lineTo(cx2 - 4, cy2); X.moveTo(cx2 + 4, cy2); X.lineTo(cx2 + 11, cy2);
    X.moveTo(cx2, cy2 - 11); X.lineTo(cx2, cy2 - 4); X.moveTo(cx2, cy2 + 4); X.lineTo(cx2, cy2 + 11); X.stroke()
  }
}

// ===== LEVEL UP =====
function showLvl() {
  pau = true; sfxL(); document.getElementById('ls').classList.add('a');
  let c = document.getElementById('lc'); c.innerHTML = '';
  let av = UPG.filter(u => (uC[u.id] || 0) < u.mx);
  let pk = []; for (let i = 0; i < 4 && av.length; i++) { let idx = Math.random() * av.length | 0; pk.push(av[idx]); av.splice(idx, 1) }
  for (let u of pk) {
    let cd = document.createElement('div'); cd.className = 'uc'; let cnt = uC[u.id] || 0;
    let nextLvl = cnt + 1;
    let isMax = nextLvl >= u.mx;
    cd.innerHTML = `<div class="ui">${u.i}</div><div class="un">${u.n}</div><div class="ud">${u.d}</div><div class="ulvl">${nextLvl}/${u.mx}${isMax ? ' MAX' : ''}</div>`;
    cd.onclick = () => { u.fn(); uC[u.id] = (uC[u.id] || 0) + 1; document.getElementById('ls').classList.remove('a'); pau = false; updateSkillHUD() }; c.appendChild(cd)
  }
  if (pk.length === 0) {
    // All upgrades maxed - auto-close
    document.getElementById('ls').classList.remove('a'); pau = false;
  }
}

// ===== GAME OVER =====
function gameOver() {
  run = false; sv.coins += sC; saveg();
  // FIX: correct time calculation
  let totalSec = Math.floor(T / 60);
  let m = Math.floor(totalSec / 60), s = totalSec % 60;
  document.getElementById('gst').innerHTML = `LVL ${P.lvl} | Волна ${wave}<br>☠ ${kills} | +${sC}🪙<br>${m}:${s.toString().padStart(2, '0')}`;
  document.getElementById('gs').classList.add('a');
  document.getElementById('rvc').style.display = (sv.coins + sC >= 30 && !P.rev) ? '' : 'none';
  document.getElementById('rva').style.display = !P.adRev ? '' : 'none';
  SDK.gameplayStop();
  SDK.submitScore(kills);
}

document.getElementById('rvc').onclick = () => { if (!P || P.rev || (sv.coins + sC) < 30) return; sC -= 30; if (sC < 0) { sv.coins += sC; sC = 0; saveg() } P.rev = true; P.hp = P.mH; P.inv = 120; P.ammo = P.mAm; P.rld = false; document.getElementById('gs').classList.remove('a'); run = true };
document.getElementById('rva').onclick = () => { if (!P || P.adRev) return; showAd(() => { P.adRev = true; P.hp = P.mH; P.inv = 120; P.ammo = P.mAm; P.rld = false; document.getElementById('gs').classList.remove('a'); run = true }) };
document.getElementById('rmn').onclick = () => { document.getElementById('gs').classList.remove('a'); document.getElementById('menu').classList.remove('hid'); document.getElementById('testPanel').classList.remove('a'); document.getElementById('skillHud').innerHTML = ''; buildMenu() };

// ===== MENU =====
function buildMenu() { document.getElementById('cdd').textContent = '🪙 ' + sv.coins; buildCh(); buildGn(); buildSt(); updAd() }
document.querySelectorAll('.tab').forEach(t => t.onclick = () => { document.querySelectorAll('.tab').forEach(t2 => t2.classList.remove('a')); t.classList.add('a'); document.querySelectorAll('.pn').forEach(p => p.classList.remove('a')); document.getElementById('p-' + t.dataset.t).classList.add('a') });

function buildCh() {
  let g = document.getElementById('chg'); g.innerHTML = '';
  CHARS.forEach(ch => {
    let ow = sv.chO.includes(ch.id), sel = sv.sCh === ch.id;
    let d = document.createElement('div'); d.className = 'cc' + (sel ? ' s' : '') + (ow ? '' : ' lk');
    d.innerHTML = `<div class="ci">${ch.icon}</div><div class="cn">${ch.name}</div><div class="cx">${ch.desc}</div><div class="cs">${ch.passive}<br>🔥 ${ch.ability}</div>` +
      (ow ? `<div class="ow">✓${sel ? ' Выбран' : ''}</div>` : (ch.cost > 0 ? `<button class="bb">🪙 ${ch.cost}</button>` : ``));
    if (ow) d.onclick = () => { sv.sCh = ch.id; saveg(); buildCh() };
    else if (ch.cost > 0) { let btn = d.querySelector('.bb'); if (btn) btn.onclick = e => { e.stopPropagation(); if (sv.coins >= ch.cost) { sv.coins -= ch.cost; sv.chO.push(ch.id); sv.sCh = ch.id; saveg(); buildMenu() } else alert('Мало монет!') } }
    g.appendChild(d)
  })
}

function buildGn() {
  let g = document.getElementById('gng'); g.innerHTML = '';
  GUNS.forEach(gn => {
    let ow = sv.gnO.includes(gn.id), sel = sv.sGn === gn.id, lv = sv.gnL[gn.id] || 0, uc = CONFIG.WEAPON_UPGRADE.baseCost + lv * CONFIG.WEAPON_UPGRADE.costPerLevel;
    let d = document.createElement('div'); d.className = 'cc' + (sel ? ' s' : '') + (ow ? '' : ' lk');
    let gc = CONFIG.WEAPONS[gn.id] || gn;
    let wu = CONFIG.WEAPON_UPGRADE;
    d.innerHTML = `<div class="ci">${gn.icon}</div><div class="cn">${gn.name}</div><div class="cx">${gn.desc}</div><div class="cs">DMG:${gc.dm} MAG:${gc.mag + lv * wu.magPerLevel} RLD:${gc.rld - lv * wu.reloadPerLevel}</div>` +
      (ow ? `<div class="ow">✓${sel ? ' Выбран' : ''}</div>${lv < wu.maxLevel ? `<button class="bb ug">⬆${uc}🪙</button>` : ''}` + (lv > 0 ? `<div class="lv">LV${lv}</div>` : '') :
        (gn.cost > 0 ? `<button class="bb">🪙 ${gn.cost}</button>` : ``));
    if (ow) {
      d.onclick = () => { sv.sGn = gn.id; saveg(); buildGn() }; let ub = d.querySelector('.ug');
      if (ub) ub.onclick = e => { e.stopPropagation(); if (sv.coins >= uc) { sv.coins -= uc; sv.gnL[gn.id] = (sv.gnL[gn.id] || 0) + 1; saveg(); buildMenu() } else alert('Мало монет!') }
    }
    else if (gn.cost > 0) { let btn = d.querySelector('.bb'); if (btn) btn.onclick = e => { e.stopPropagation(); if (sv.coins >= gn.cost) { sv.coins -= gn.cost; sv.gnO.push(gn.id); sv.sGn = gn.id; saveg(); buildMenu() } else alert('Мало монет!') } }
    g.appendChild(d)
  })
}

const SDef = [
  { id: 'hp', n: '❤️ Жизни', mx: CONFIG.PERM_STATS.hp.max, c: l => CONFIG.PERM_STATS.hp.baseCost + l * CONFIG.PERM_STATS.hp.costPerLevel },
  { id: 'spd', n: '🏃 Скорость', mx: CONFIG.PERM_STATS.spd.max, c: l => CONFIG.PERM_STATS.spd.baseCost + l * CONFIG.PERM_STATS.spd.costPerLevel },
  { id: 'arm', n: '🛡️ Броня', mx: CONFIG.PERM_STATS.arm.max, c: l => CONFIG.PERM_STATS.arm.baseCost + l * CONFIG.PERM_STATS.arm.costPerLevel },
  { id: 'crit', n: '💥 Крит', mx: CONFIG.PERM_STATS.crit.max, c: l => CONFIG.PERM_STATS.crit.baseCost + l * CONFIG.PERM_STATS.crit.costPerLevel },
  { id: 'xp', n: '📗 Опыт', mx: CONFIG.PERM_STATS.xp.max, c: l => CONFIG.PERM_STATS.xp.baseCost + l * CONFIG.PERM_STATS.xp.costPerLevel },
  { id: 'mag', n: '🧲 Магнит', mx: CONFIG.PERM_STATS.mag.max, c: l => CONFIG.PERM_STATS.mag.baseCost + l * CONFIG.PERM_STATS.mag.costPerLevel },
];

function buildSt() {
  let el = document.getElementById('stl'); el.innerHTML = '';
  SDef.forEach(s => {
    let lv = sv.sL[s.id] || 0, co = s.c(lv), mx = lv >= s.mx;
    let r = document.createElement('div'); r.className = 'sr';
    r.innerHTML = `<div class="sn">${s.n}</div><div class="sl">${lv}/${s.mx}</div><button class="bb"${mx ? ' disabled' : ''}>${mx ? 'MAX' : '⬆' + co + '🪙'}</button>`;
    if (!mx) r.querySelector('.bb').onclick = () => { if (sv.coins >= co) { sv.coins -= co; sv.sL[s.id] = lv + 1; saveg(); buildMenu() } else alert('Мало монет!') }; el.appendChild(r)
  })
}

function updAd() {
  let td = new Date().toDateString(); if (sv.adDt !== td) { sv.ad2d = 0; sv.adDt = td; saveg() }
  let left = 5 - sv.ad2d; document.getElementById('alt').textContent = `${left}/5 сегодня`;
  let btn = document.getElementById('acb'); btn.disabled = left <= 0;
  btn.onclick = () => { if (left > 0) showAd(() => { sv.coins += 50; sv.ad2d++; saveg(); buildMenu() }) }
}

// ===== SKILL HUD (left side) =====
function updateSkillHUD() {
  let el = document.getElementById('skillHud');
  if (!el || !P) return;
  let html = '';
  for (let u of UPG) {
    let cnt = uC[u.id] || 0;
    if (cnt > 0) {
      html += `<div class="sk-row"><span class="sk-icon">${u.i}</span><span class="sk-name">${u.n}</span><span class="sk-lvl">${cnt}/${u.mx}</span></div>`;
    }
  }
  el.innerHTML = html;
}

// ===== TEST MODE =====
let testMode = false;
function startTestMode() {
  iA(); document.getElementById('menu').classList.add('hid'); document.getElementById('gs').classList.remove('a');
  document.getElementById('testPanel').classList.add('a');
  initP(); genW(); proj = []; ens = []; orbs = []; parts = []; dNs = []; eBs = []; vorts = []; turrets = []; poisonT = [];
  crates = []; crateT = 0; bonusCrateT = 0;
  T = 0; wave = 1; kills = 0; bK = 0; sC = 0; eSp = 0; spT = 0; boss = null; uC = {}; evA = null; eCM = 1; eXM = 1; eEL = false;
  lastAd = Date.now(); run = true; pau = false; testMode = true;
  mouse.x = W() / 2; mouse.y = H() / 2;
  // God mode defaults
  P.hp = 999; P.mH = 999;
  buildTestPanel();
}

function buildTestPanel() {
  let tp = document.getElementById('testPanel');
  tp.innerHTML = `
    <h3>ТЕСТ РЕЖИМ</h3>
    <div class="trow"><label>Бессмертие</label><button id="t-god">GOD ON</button></div>
    <div class="trow"><label>Добавить уровень</label><button id="t-lvl">+1 LVL</button></div>
    <div class="trow"><label>+10 уровней</label><button id="t-lvl10">+10 LVL</button></div>
    <div class="trow"><label>Монеты +1000</label><button id="t-coins">+1000</button></div>
    <div class="trow"><label>Убить всех врагов</label><button id="t-killall">KILL ALL</button></div>
    <div class="trow"><label>Спавнить босса</label><button id="t-boss">BOSS</button></div>
    <h3>ПЕРЕЙТИ К ВОЛНЕ</h3>
    <div class="trow"><label>Волна 5</label><button id="t-w5">W5</button></div>
    <div class="trow"><label>Волна 10</label><button id="t-w10">W10</button></div>
    <div class="trow"><label>Волна 15</label><button id="t-w15">W15</button></div>
    <div class="trow"><label>Волна 20</label><button id="t-w20">W20</button></div>
    <div class="trow"><label>+1 Волна</label><button id="t-wnext">+1 W</button></div>
    <h3>СПАВН ВРАГОВ</h3>
    <div class="trow"><label>10 Slime</label><button id="t-slime">SPAWN</button></div>
    <div class="trow"><label>5 Bomber</label><button id="t-bomber">SPAWN</button></div>
    <div class="trow"><label>5 Shielder</label><button id="t-shielder">SPAWN</button></div>
    <div class="trow"><label>5 Healer</label><button id="t-healer">SPAWN</button></div>
    <div class="trow"><label>5 Assassin</label><button id="t-assassin">SPAWN</button></div>
    <div class="trow"><label>5 Necro</label><button id="t-necro_e">SPAWN</button></div>
    <div class="trow"><label>10 Worm</label><button id="t-worm">SPAWN</button></div>
    <div class="trow"><label>5 Dragon</label><button id="t-dragon">SPAWN</button></div>
    <div class="trow"><label>5 Golem</label><button id="t-golem">SPAWN</button></div>
    <h3>ВСЕ АПГРЕЙДЫ</h3>
    <div class="trow"><label>Все навыки</label><button id="t-allup">GIVE ALL</button></div>
    <div class="trow"><label>Все оружия</label><button id="t-allwpn">UNLOCK</button></div>
    <h3>ОРУЖИЕ</h3>
    ${GUNS.map(g => `<div class="trow"><label>${g.icon} ${g.name}</label><button class="t-gun" data-id="${g.id}">EQUIP</button></div>`).join('')}
    <br><div class="trow"><button id="t-close" style="width:100%;padding:4px">ЗАКРЫТЬ ПАНЕЛЬ</button></div>
  `;

  // Wire up buttons
  let godOn = true;
  tp.querySelector('#t-god').onclick = () => { godOn = !godOn; if (godOn) { P.hp = 999; P.mH = 999 } else { P.mH = 6; P.hp = 6 } tp.querySelector('#t-god').textContent = godOn ? 'GOD ON' : 'GOD OFF' };
  tp.querySelector('#t-lvl').onclick = () => { showLvl() };
  tp.querySelector('#t-lvl10').onclick = () => { for (let i = 0; i < 10; i++) { P.lvl++; showLvl() } };
  tp.querySelector('#t-coins').onclick = () => { sC += 1000 };
  tp.querySelector('#t-killall').onclick = () => { for (let e of ens) e.hp = 0; if (boss) boss.hp = 0 };
  tp.querySelector('#t-boss').onclick = () => { spawnBoss(wave) };
  tp.querySelector('#t-w5').onclick = () => { wave = 5; eSp = 999; ens = [] };
  tp.querySelector('#t-w10').onclick = () => { wave = 10; eSp = 999; ens = [] };
  tp.querySelector('#t-w15').onclick = () => { wave = 15; eSp = 999; ens = [] };
  tp.querySelector('#t-w20').onclick = () => { wave = 20; eSp = 999; ens = [] };
  tp.querySelector('#t-wnext').onclick = () => { wave++; eSp = 0; spT = 0; ens = []; banner(`ВОЛНА ${wave}`, '#00ff88', 2000) };

  // Enemy spawn buttons
  let spawnMap = { slime: 10, bomber: 5, shielder: 5, healer: 5, assassin: 5, necro_e: 5, worm: 10, dragon: 5, golem: 5 };
  for (let [ek, cnt] of Object.entries(spawnMap)) {
    let btn = tp.querySelector('#t-' + ek);
    if (btn) btn.onclick = () => { let hm = 1 + (wave - 1) * CONFIG.WAVES.hpScalePerWave; for (let i = 0; i < cnt; i++) spawnE(ek, hm) };
  }

  tp.querySelector('#t-allup').onclick = () => {
    for (let u of UPG) {
      let cnt = uC[u.id] || 0;
      while (cnt < u.mx) { u.fn(); cnt++; uC[u.id] = cnt }
    }
    updateSkillHUD();
  };
  tp.querySelector('#t-allwpn').onclick = () => { for (let g of GUNS) { if (!sv.gnO.includes(g.id)) sv.gnO.push(g.id) } saveg() };
  tp.querySelectorAll('.t-gun').forEach(btn => {
    btn.onclick = () => {
      let gid = btn.dataset.id;
      let g = GUNS.find(g => g.id === gid);
      if (g) {
        let gc = CONFIG.WEAPONS[g.id];
        if (gc) g = { ...g, dm: gc.dm, rate: gc.rate, mag: gc.mag, rld: gc.rld, spr: gc.spr, spd: gc.spd };
        let gl = sv.gnL[g.id] || 0;
        let wu = CONFIG.WEAPON_UPGRADE;
        P.gun = { ...g, mag: g.mag + gl * wu.magPerLevel };
        P.ammo = P.gun.mag; P.mAm = P.gun.mag; P.rld = false;
      }
    };
  });
  tp.querySelector('#t-close').onclick = () => { tp.classList.remove('a') };
}

// ===== PAUSE MENU =====
function showPauseMenu() {
  pau = true;
  document.getElementById('pauseMenu').classList.add('a');
}
function hidePauseMenu() {
  pau = false;
  document.getElementById('pauseMenu').classList.remove('a');
}
document.getElementById('pm-resume').onclick = () => { hidePauseMenu() };
document.getElementById('pm-menu').onclick = () => {
  hidePauseMenu(); run = false;
  sv.coins += sC; saveg();
  document.getElementById('menu').classList.remove('hid');
  document.getElementById('testPanel').classList.remove('a');
  document.getElementById('skillHud').innerHTML = '';
  document.getElementById('bbw').style.display = 'none';
  buildMenu();
};

// ===== GAME OBJECT (for SDK pause/resume) =====
window.Game = {
  pause() { pau = true },
  resume() { pau = false }
};

// ===== START =====
document.getElementById('pbtn').onclick = () => {
  iA(); document.getElementById('menu').classList.add('hid'); document.getElementById('gs').classList.remove('a');
  document.getElementById('testPanel').classList.remove('a'); testMode = false;
  initP(); genW(); proj = []; ens = []; orbs = []; parts = []; dNs = []; eBs = []; vorts = []; turrets = []; poisonT = [];
  crates = []; crateT = 0; bonusCrateT = 0;
  T = 0; wave = 1; kills = 0; bK = 0; sC = 0; eSp = 0; spT = 0; boss = null; uC = {}; evA = null; eCM = 1; eXM = 1; eEL = false;
  lastAd = Date.now(); run = true; pau = false; mouse.x = W() / 2; mouse.y = H() / 2;
  updateSkillHUD();
  SDK.gameplayStart();
};
document.getElementById('tbtn').onclick = () => { startTestMode() };

function loop(timestamp) {
  // Delta time (capped at 3 to prevent spiraling)
  if (lastTime) {
    dt = Math.min(3, (timestamp - lastTime) / 16.67);
  }
  lastTime = timestamp;

  // FPS counter
  fpsArr.push(timestamp);
  while (fpsArr.length > 0 && fpsArr[0] < timestamp - 1000) fpsArr.shift();
  if (T % 30 === 0) fpsDisplay = fpsArr.length;
  document.getElementById('fps').textContent = fpsDisplay + ' FPS | ' + ens.length + ' mobs';

  update(); draw(); requestAnimationFrame(loop);
}

// ===== INIT =====
async function init() {
  await SDK.init();
  await loadSave();
  buildMenu();
  requestAnimationFrame(loop);
}
init();
