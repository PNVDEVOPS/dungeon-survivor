"use strict";
// ===== SPRITE LOADING SYSTEM =====
// Loads all game sprites from assets/ folder.
// If a sprite file is missing, the game falls back to pixel art.
// Supports: single images AND spritesheets (with frame data).

const SPR = {}; // loaded Image objects: SPR['enemy_slime'] = Image
const SHEET = {}; // spritesheet frame data: SHEET['enemy_slime'] = { fw, fh, cols, rows, speed }

// ===== SPRITE MANIFEST =====
// Edit paths/sizes here. Add your own files to assets/ and update this list.
// Supported formats: PNG, WEBP, JPG, SVG
// For spritesheets: set sheet: { fw, fh, speed } where fw/fh = frame size, speed = frames per animation tick

const SPRITE_MANIFEST = {
  // ---- PLAYER CHARACTERS ----
  // Each character can have idle + walk spritesheet
  char_knight:      { src: 'assets/char_knight.png', sheet: { fw: 32, fh: 32, speed: 0.1 } },
  char_mage:        { src: 'assets/char_mage.png', sheet: { fw: 32, fh: 32, speed: 0.1 } },
  char_ranger:      { src: 'assets/char_ranger.png', sheet: { fw: 32, fh: 32, speed: 0.1 } },
  char_necro:       { src: 'assets/char_necro.png', sheet: { fw: 32, fh: 32, speed: 0.1 } },
  char_cyborg:      { src: 'assets/char_cyborg.png', sheet: { fw: 32, fh: 32, speed: 0.1 } },
  char_paladin:     { src: 'assets/char_paladin.png', sheet: { fw: 32, fh: 32, speed: 0.1 } },
  char_berserker:   { src: 'assets/char_berserker.png', sheet: { fw: 32, fh: 32, speed: 0.1 } },

  // ---- ENEMIES ----
  enemy_slime:      { src: 'assets/enemy_slime.png', sheet: { fw: 32, fh: 32, speed: 0.08 } },
  enemy_bat:        { src: 'assets/enemy_bat.png', sheet: { fw: 24, fh: 24, speed: 0.15 } },
  enemy_skeleton:   { src: 'assets/enemy_skeleton.png', sheet: { fw: 24, fh: 24, speed: 0.08 } },
  enemy_spider:     { src: 'assets/enemy_spider.png', sheet: { fw: 24, fh: 24, speed: 0.1 } },
  enemy_orc:        { src: 'assets/enemy_orc.png', sheet: { fw: 32, fh: 32, speed: 0.07 } },
  enemy_mage_e:     { src: 'assets/enemy_mage.png', sheet: { fw: 24, fh: 24, speed: 0.08 } },
  enemy_ghost:      { src: 'assets/enemy_ghost.png', sheet: { fw: 24, fh: 24, speed: 0.1 } },
  enemy_demon:      { src: 'assets/enemy_demon.png', sheet: { fw: 28, fh: 28, speed: 0.08 } },
  enemy_golem:      { src: 'assets/enemy_golem.png', sheet: { fw: 40, fh: 40, speed: 0.06 } },
  enemy_dragon:     { src: 'assets/enemy_dragon.png', sheet: { fw: 32, fh: 32, speed: 0.08 } },
  enemy_bomber:     { src: 'assets/enemy_bomber.png', sheet: { fw: 24, fh: 24, speed: 0.1 } },
  enemy_shielder:   { src: 'assets/enemy_shielder.png', sheet: { fw: 28, fh: 28, speed: 0.07 } },
  enemy_healer:     { src: 'assets/enemy_healer.png', sheet: { fw: 24, fh: 24, speed: 0.08 } },
  enemy_assassin:   { src: 'assets/enemy_assassin.png', sheet: { fw: 24, fh: 24, speed: 0.12 } },
  enemy_necro_e:    { src: 'assets/enemy_necro.png', sheet: { fw: 28, fh: 28, speed: 0.08 } },
  enemy_worm:       { src: 'assets/enemy_worm.png', sheet: { fw: 20, fh: 20, speed: 0.12 } },
  enemy_harpy:      { src: 'assets/enemy_harpy.png', sheet: { fw: 24, fh: 24, speed: 0.15 } },
  enemy_giant:      { src: 'assets/enemy_giant.png', sheet: { fw: 64, fh: 64, speed: 0.05 } },

  // ---- BOSSES ----
  boss_goblin:      { src: 'assets/boss_goblin.png', sheet: { fw: 64, fh: 64, speed: 0.06 } },
  boss_sorcerer:    { src: 'assets/boss_sorcerer.png', sheet: { fw: 72, fh: 72, speed: 0.05 } },
  boss_dragon:      { src: 'assets/boss_dragon.png', sheet: { fw: 96, fh: 96, speed: 0.05 } },
  boss_lich:        { src: 'assets/boss_lich.png', sheet: { fw: 80, fh: 80, speed: 0.04 } },

  // ---- GUNS (icons for HUD/menu) ----
  gun_plasma_pistol:    { src: 'assets/gun_plasma_pistol.png' },
  gun_arcane_rifle:     { src: 'assets/gun_arcane_rifle.png' },
  gun_thunder_shotgun:  { src: 'assets/gun_thunder_shotgun.png' },
  gun_frost_smg:        { src: 'assets/gun_frost_smg.png' },
  gun_fire_launcher:    { src: 'assets/gun_fire_launcher.png' },
  gun_railgun:          { src: 'assets/gun_railgun.png' },
  gun_void_cannon:      { src: 'assets/gun_void_cannon.png' },
  gun_minigun:          { src: 'assets/gun_minigun.png' },

  // ---- PROJECTILES ----
  proj_plasma:      { src: 'assets/proj_plasma.png' },
  proj_arcane:      { src: 'assets/proj_arcane.png' },
  proj_frost:       { src: 'assets/proj_frost.png' },
  proj_fire:        { src: 'assets/proj_fire.png' },
  proj_rail:        { src: 'assets/proj_rail.png' },
  proj_void:        { src: 'assets/proj_void.png' },
  proj_thunder:     { src: 'assets/proj_thunder.png' },
  proj_minigun:     { src: 'assets/proj_minigun.png' },
  proj_enemy:       { src: 'assets/proj_enemy.png' },
  proj_boss:        { src: 'assets/proj_boss.png' },

  // ---- SKILL / UPGRADE ICONS ----
  // Used in level-up menu and skill HUD
  skill_damage:     { src: 'assets/skill_damage.png' },
  skill_speed:      { src: 'assets/skill_speed.png' },
  skill_health:     { src: 'assets/skill_health.png' },
  skill_regen:      { src: 'assets/skill_regen.png' },
  skill_armor:      { src: 'assets/skill_armor.png' },
  skill_crit:       { src: 'assets/skill_crit.png' },
  skill_magnet:     { src: 'assets/skill_magnet.png' },
  skill_firerate:   { src: 'assets/skill_firerate.png' },
  skill_pierce:     { src: 'assets/skill_pierce.png' },
  skill_dodge:      { src: 'assets/skill_dodge.png' },
  skill_gold:       { src: 'assets/skill_gold.png' },
  skill_xp:         { src: 'assets/skill_xp.png' },
  skill_potion:     { src: 'assets/skill_potion.png' },
  skill_orbital:    { src: 'assets/skill_orbital.png' },
  skill_spears:     { src: 'assets/skill_spears.png' },
  skill_aura:       { src: 'assets/skill_aura.png' },
  skill_lightning:  { src: 'assets/skill_lightning.png' },
  skill_shield:     { src: 'assets/skill_shield.png' },
  skill_poison:     { src: 'assets/skill_poison.png' },
  skill_explosive:  { src: 'assets/skill_explosive.png' },
  skill_multishot:  { src: 'assets/skill_multishot.png' },
  skill_thorns:     { src: 'assets/skill_thorns.png' },
  skill_vamp:       { src: 'assets/skill_vamp.png' },
  skill_chain:      { src: 'assets/skill_chain.png' },
  skill_freeze:     { src: 'assets/skill_freeze.png' },
  skill_execute:    { src: 'assets/skill_execute.png' },
  skill_shockwave:  { src: 'assets/skill_shockwave.png' },

  // ---- WORLD / ENVIRONMENT ----
  tile_grass:       { src: 'assets/tile_grass.png' },        // 64x64 repeating tile
  tile_grass2:      { src: 'assets/tile_grass2.png' },       // alternate grass
  obj_tree:         { src: 'assets/obj_tree.png', sheet: { fw: 64, fh: 64, speed: 0 } }, // tree variants
  obj_rock:         { src: 'assets/obj_rock.png' },           // rock sprite
  obj_boundary:     { src: 'assets/obj_boundary.png' },       // wall/boundary tile

  // ---- PICKUPS ----
  orb_xp_small:     { src: 'assets/orb_xp_small.png' },
  orb_xp_med:       { src: 'assets/orb_xp_med.png' },
  orb_xp_big:       { src: 'assets/orb_xp_big.png' },
  orb_coin:         { src: 'assets/orb_coin.png', sheet: { fw: 12, fh: 12, speed: 0.15 } },
  orb_gold:         { src: 'assets/orb_gold.png', sheet: { fw: 12, fh: 12, speed: 0.15 } },
  crate_weapon:     { src: 'assets/crate_weapon.png' },
  crate_bonus:      { src: 'assets/crate_bonus.png' },

  // ---- UI ELEMENTS ----
  ui_hp_bar:        { src: 'assets/ui_hp_bar.png' },          // HP bar frame
  ui_hp_fill:       { src: 'assets/ui_hp_fill.png' },         // HP bar fill (9-slice or stretch)
  ui_xp_bar:        { src: 'assets/ui_xp_bar.png' },          // XP bar frame
  ui_xp_fill:       { src: 'assets/ui_xp_fill.png' },         // XP bar fill
  ui_ammo_bar:      { src: 'assets/ui_ammo_bar.png' },
  ui_boss_bar:      { src: 'assets/ui_boss_bar.png' },
  ui_logo:          { src: 'assets/ui_logo.png' },            // Main menu logo
  ui_btn_play:      { src: 'assets/ui_btn_play.png' },
  ui_btn_menu:      { src: 'assets/ui_btn_menu.png' },
  ui_panel:         { src: 'assets/ui_panel.png' },           // Menu panel background
  ui_card:          { src: 'assets/ui_card.png' },            // Upgrade card background
  ui_crosshair:     { src: 'assets/ui_crosshair.png' },

  // ---- EFFECTS ----
  fx_explosion:     { src: 'assets/fx_explosion.png', sheet: { fw: 32, fh: 32, speed: 0.2 } },
  fx_hit:           { src: 'assets/fx_hit.png', sheet: { fw: 16, fh: 16, speed: 0.25 } },
  fx_levelup:       { src: 'assets/fx_levelup.png', sheet: { fw: 48, fh: 48, speed: 0.1 } },
  fx_heal:          { src: 'assets/fx_heal.png', sheet: { fw: 24, fh: 24, speed: 0.15 } },

  // ---- BACKGROUND ----
  bg_menu:          { src: 'assets/bg_menu.png' },            // Main menu background
  bg_gameover:      { src: 'assets/bg_gameover.png' },
};

// ===== LOADER =====

let spriteLoadCount = 0;
let spriteLoadTotal = 0;
let spritesReady = false;

function loadAllSprites() {
  const entries = Object.entries(SPRITE_MANIFEST);
  spriteLoadTotal = entries.length;
  spriteLoadCount = 0;

  const promises = entries.map(([id, cfg]) => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        SPR[id] = img;
        // Calculate spritesheet metadata
        if (cfg.sheet) {
          // Auto-detect frame size from image dimensions if sheet is defined
          // Piskel exports: all frames in a row, frame size = image height
          // If fw/fh are wrong, auto-correct from image
          let fw = cfg.sheet.fw;
          let fh = cfg.sheet.fh;
          // If specified fw doesn't divide evenly, use image height as frame size (Piskel style)
          if (img.width % fw !== 0 || img.height % fh !== 0) {
            // Assume square frames, frame size = image height (Piskel horizontal strip)
            fh = img.height;
            fw = fh; // square frames
            // If still doesn't divide, just use full image as single frame
            if (img.width % fw !== 0) { fw = img.width; fh = img.height; }
          }
          const cols = Math.floor(img.width / fw) || 1;
          const rows = Math.floor(img.height / fh) || 1;
          SHEET[id] = { ...cfg.sheet, fw, fh, cols, rows, total: cols * rows };
        }
        spriteLoadCount++;
        resolve();
      };
      img.onerror = () => {
        // Missing file — skip, game will use fallback pixel art
        spriteLoadCount++;
        resolve();
      };
      img.src = cfg.src;
    });
  });

  return Promise.all(promises).then(() => { spritesReady = true });
}

// ===== DRAW HELPERS =====

// Draw a single sprite (no animation)
// x,y = center position, w,h = draw size
function drawSprite(id, x, y, w, h, flipX) {
  const img = SPR[id];
  if (!img) return false;
  const ctx = X; // global canvas context from game.js
  ctx.save();
  if (flipX) { ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(img, -w / 2, -h / 2, w, h) }
  else { ctx.drawImage(img, x - w / 2, y - h / 2, w, h) }
  ctx.restore();
  return true;
}

// Draw an animated spritesheet frame
// animTick = continuously incrementing counter (e.g. e.an or P.anim)
// row = optional row index for multi-row sheets (0=idle, 1=walk, 2=attack, etc.)
function drawSpriteAnim(id, x, y, w, h, animTick, flipX, row) {
  const img = SPR[id];
  const sd = SHEET[id];
  if (!img || !sd) return false;
  let useRow = row || 0;
  if (useRow >= sd.rows) useRow = 0; // fallback if row doesn't exist
  const frame = Math.floor(animTick * sd.speed) % sd.cols;
  const ctx = X;
  ctx.save();
  if (flipX) { ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(img, frame * sd.fw, useRow * sd.fh, sd.fw, sd.fh, -w / 2, -h / 2, w, h) }
  else { ctx.drawImage(img, frame * sd.fw, useRow * sd.fh, sd.fw, sd.fh, x - w / 2, y - h / 2, w, h) }
  ctx.restore();
  return true;
}

// Draw with white flash overlay (for damage flash)
function drawSpriteFlash(id, x, y, w, h, animTick, flipX) {
  // Draw white silhouette
  const ctx = X;
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.globalCompositeOperation = 'source-over';
  return true;
}

// Convenience: draw enemy/boss with sprite or fallback
// Returns true if sprite was drawn (skip pixel art), false if no sprite (use fallback)
// animRow: 0=idle, 1=walk, 2=attack (optional, for multi-row spritesheets)
function drawEntitySprite(spriteId, x, y, size, animTick, flash, flipX, animRow) {
  if (!SPR[spriteId]) return false;
  const ctx = X;
  if (flash) {
    // Draw sprite then overlay white
    const sd = SHEET[spriteId];
    if (sd) drawSpriteAnim(spriteId, x, y, size, size, animTick, flipX, animRow);
    else drawSprite(spriteId, x, y, size, size, flipX);
    // White flash overlay
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.restore();
  } else {
    const sd = SHEET[spriteId];
    if (sd) drawSpriteAnim(spriteId, x, y, size, size, animTick, flipX, animRow);
    else drawSprite(spriteId, x, y, size, size, flipX);
  }
  return true;
}

// Get sprite as <img> element for HTML (menus, skill HUD)
// Returns img element or null if sprite not loaded
function getSpriteImg(id, w, h) {
  const img = SPR[id];
  if (!img) return null;
  const el = document.createElement('img');
  el.src = img.src;
  el.width = w || 24;
  el.height = h || 24;
  el.style.imageRendering = 'pixelated';
  return el;
}

// Get sprite src URL (for CSS backgrounds or <img> tags)
function getSpriteSrc(id) {
  const img = SPR[id];
  return img ? img.src : null;
}

// ===== SPRITE-ID MAPS =====
// Maps game object IDs to sprite manifest IDs

const ENEMY_SPRITE_MAP = {
  slime: 'enemy_slime', bat: 'enemy_bat', skeleton: 'enemy_skeleton',
  spider: 'enemy_spider', orc: 'enemy_orc', mage_e: 'enemy_mage_e',
  ghost: 'enemy_ghost', demon: 'enemy_demon', golem: 'enemy_golem',
  dragon: 'enemy_dragon', bomber: 'enemy_bomber', shielder: 'enemy_shielder',
  healer: 'enemy_healer', assassin: 'enemy_assassin', necro_e: 'enemy_necro_e',
  worm: 'enemy_worm', harpy: 'enemy_harpy', giant: 'enemy_giant'
};

const ENEMY_DRAW_SIZE = {
  slime: 24, bat: 22, skeleton: 28, spider: 22, orc: 36,
  mage_e: 28, ghost: 28, demon: 32, golem: 44, dragon: 36,
  bomber: 24, shielder: 32, healer: 24, assassin: 22, necro_e: 30, worm: 18,
  harpy: 26, giant: 72
};

const BOSS_SPRITE_MAP = ['boss_goblin', 'boss_sorcerer', 'boss_dragon', 'boss_lich'];
const BOSS_DRAW_SIZE = [64, 72, 96, 80];

const CHAR_SPRITE_MAP = {
  knight: 'char_knight', mage: 'char_mage', ranger: 'char_ranger',
  necro: 'char_necro', cyborg: 'char_cyborg', paladin: 'char_paladin',
  berserker: 'char_berserker'
};

const GUN_SPRITE_MAP = {
  plasma_pistol: 'gun_plasma_pistol', arcane_rifle: 'gun_arcane_rifle',
  thunder_shotgun: 'gun_thunder_shotgun', frost_smg: 'gun_frost_smg',
  fire_launcher: 'gun_fire_launcher', railgun: 'gun_railgun',
  void_cannon: 'gun_void_cannon', minigun: 'gun_minigun'
};

const PROJ_SPRITE_MAP = {
  '#00ff88': 'proj_plasma', '#a060ff': 'proj_arcane', '#ffcc00': 'proj_thunder',
  '#60d0ff': 'proj_frost', '#ff6020': 'proj_fire', '#ff40ff': 'proj_rail',
  '#8020e0': 'proj_void', '#20ffff': 'proj_minigun'
};

const SKILL_SPRITE_MAP = {
  dm: 'skill_damage', sp: 'skill_speed', mh: 'skill_health', rg: 'skill_regen',
  ar: 'skill_armor', cr: 'skill_crit', mg: 'skill_magnet', fr: 'skill_firerate',
  pc: 'skill_pierce', dg: 'skill_dodge', cb: 'skill_gold', xb: 'skill_xp',
  hl: 'skill_potion', ob: 'skill_orbital', sp2: 'skill_spears', au: 'skill_aura',
  lt: 'skill_lightning', sh: 'skill_shield', ps: 'skill_poison', ex: 'skill_explosive',
  ms: 'skill_multishot', th: 'skill_thorns', ls: 'skill_vamp', ch: 'skill_chain',
  pf: 'skill_freeze', pe: 'skill_execute', pw: 'skill_shockwave'
};

// ===== PATCH FUNCTIONS =====
// Call patchDrawFunctions() after sprites and game objects are loaded.
// Wraps ET[].draw and BOSS[].draw to try sprites first, fall back to pixel art.

function patchDrawFunctions() {
  // Patch enemy draw functions
  for (const [tk, et] of Object.entries(ET)) {
    const sprId = ENEMY_SPRITE_MAP[tk];
    const drawSize = ENEMY_DRAW_SIZE[tk] || 24;
    if (!sprId) continue;
    const origDraw = et.draw;
    et.draw = function(x, y, f, a, fac) {
      const flipX = (fac || 1) < 0;
      // Row 1 = walk animation (enemies are always walking)
      if (!drawEntitySprite(sprId, x, y, drawSize, a, f, flipX, 1)) {
        origDraw.call(this, x, y, f, a); // fallback to pixel art
      }
    };
  }

  // Patch boss draw functions
  for (let i = 0; i < BOSS.length; i++) {
    const sprId = BOSS_SPRITE_MAP[i];
    const drawSize = BOSS_DRAW_SIZE[i] || 64;
    if (!sprId) continue;
    const origDraw = BOSS[i].draw;
    BOSS[i].draw = function(x, y, f, a, fac) {
      const flipX = (fac || 1) < 0;
      if (!drawEntitySprite(sprId, x, y, drawSize, a, f, flipX)) {
        origDraw.call(this, x, y, f, a);
      }
    };
  }
}

// ===== SPRITE DRAW WRAPPERS FOR GAME.JS =====
// These are called from game.js draw() to render with sprites

// Draw player character with sprite or fallback
// Returns true if sprite was used
// animRow: auto-detected from movement (0=idle, 1=walk)
function drawPlayerSprite(charId, x, y, animTick, flipX, flash, isMoving) {
  const sprId = CHAR_SPRITE_MAP[charId];
  if (!sprId) return false;
  const animRow = isMoving ? 1 : 0; // row 0 = idle, row 1 = walk
  return drawEntitySprite(sprId, x, y, 32, animTick, flash, flipX, animRow);
}

// Draw projectile with sprite or fallback
function drawProjSprite(x, y, r, col) {
  const sprId = PROJ_SPRITE_MAP[col];
  if (!sprId || !SPR[sprId]) return false;
  drawSprite(sprId, x, y, r * 3, r * 3, false);
  return true;
}

// Draw XP orb with sprite or fallback
function drawOrbSprite(x, y, orbType, animTick) {
  let sprId = null;
  if (orbType === 'coin') sprId = 'orb_coin';
  else if (orbType === 'gold') sprId = 'orb_gold';
  else if (orbType === 'big') sprId = 'orb_xp_big';
  else if (orbType === 'med') sprId = 'orb_xp_med';
  else sprId = 'orb_xp_small';
  if (!SPR[sprId]) return false;
  const s = SHEET[sprId];
  if (s) return drawSpriteAnim(sprId, x, y, 12, 12, animTick, false);
  return drawSprite(sprId, x, y, 12, 12, false);
}

// Draw crate with sprite or fallback
function drawCrateSprite(x, y, crateType) {
  const sprId = crateType === 'weapon' ? 'crate_weapon' : 'crate_bonus';
  if (!SPR[sprId]) return false;
  drawSprite(sprId, x, y, 32, 32, false);
  return true;
}

// Draw world object (tree, rock) with sprite or fallback
// scale = random size multiplier from world gen (default 1)
function drawWorldObjSprite(x, y, objType, scale) {
  let sprId = null;
  if (objType === 'tree') sprId = 'obj_tree';
  else if (objType === 'rock') sprId = 'obj_rock';
  else if (objType === 'bnd') sprId = 'obj_boundary';
  if (!sprId || !SPR[sprId]) return false;
  const s = scale || 1;
  const baseSz = objType === 'tree' ? 28 : objType === 'rock' ? 22 : 36;
  const sz = baseSz * s;
  drawSprite(sprId, x, y, sz, sz, false);
  return true;
}

// Draw background tile with sprite or fallback
// Returns true if sprite was used
function drawTileSprite(x, y, tileSize, variant) {
  const sprId = variant ? 'tile_grass2' : 'tile_grass';
  if (!SPR[sprId]) return false;
  X.drawImage(SPR[sprId], x, y, tileSize, tileSize);
  return true;
}

// Get skill icon as HTML string — sprite <img> or emoji fallback
function getSkillIconHTML(skillId, emojiIcon, size) {
  const sprId = SKILL_SPRITE_MAP[skillId];
  if (sprId && SPR[sprId]) {
    return `<img src="${SPR[sprId].src}" width="${size || 24}" height="${size || 24}" style="image-rendering:pixelated;vertical-align:middle">`;
  }
  return emojiIcon; // fallback to emoji
}

// Get gun icon as HTML string
function getGunIconHTML(gunId, emojiIcon, size) {
  const sprId = GUN_SPRITE_MAP[gunId];
  if (sprId && SPR[sprId]) {
    return `<img src="${SPR[sprId].src}" width="${size || 24}" height="${size || 24}" style="image-rendering:pixelated;vertical-align:middle">`;
  }
  return emojiIcon;
}

// Get character icon as HTML string
function getCharIconHTML(charId, emojiIcon, size) {
  const sprId = CHAR_SPRITE_MAP[charId];
  if (sprId && SPR[sprId]) {
    return `<img src="${SPR[sprId].src}" width="${size || 32}" height="${size || 32}" style="image-rendering:pixelated;vertical-align:middle">`;
  }
  return emojiIcon;
}
