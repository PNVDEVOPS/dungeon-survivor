"use strict";
// ===== DUNGEON SURVIVOR - BALANCE CONFIG =====
// Edit this file to tweak game balance without touching game code.

const CONFIG = {

  // ===== CAMERA & WORLD =====
  ZOOM: 0.95,           // Camera zoom (lower = see more). Was 1.55
  WORLD_RADIUS: 2800,   // Arena radius in pixels
  PIXEL_SIZE: 3,         // Pixel art scale

  // ===== PLAYER DEFAULTS =====
  PLAYER: {
    BASE_CRIT: 0.05,     // Starting crit chance
    CRIT_MULT: 2,        // Crit damage multiplier
    BASE_MAGNET: 50,     // Starting magnet radius
    INVULN_ON_HIT: 40,   // Invulnerability frames after hit
    REGEN_INTERVAL: 60,  // Frames between regen ticks
  },

  // ===== CHARACTERS =====
  CHARACTERS: {
    knight: { hp: 120, spd: 3.3, arm: 3, dm: 1, block: 0.15, abilityCD: 1420 },
    mage:   { hp: 80, spd: 2.5, arm: 0, dm: 1.2, expBonus: 1.3, abilityCD: 1480 },
    ranger: { hp: 100, spd: 3.1, arm: 1, dm: 1.05, cdBonus: 0.85, abilityCD: 1240 },
    necro:  { hp: 80, spd: 2.3, arm: 0, dm: 1.1, vamp: 0.05, abilityCD: 1360 },
    cyborg: { hp: 100, spd: 2.7, arm: 2, dm: 1.08, shieldMax: 30, shieldCD: 720, abilityCD: 1540 },
  },

  // ===== WEAPONS =====
  // rate = frames between shots, mag = magazine size, rld = reload frames
  // semiAuto: true = must click each shot (pistol behavior)
  WEAPONS: {
    plasma_pistol:  { dm: 15, rate: 80, mag: 6, rld: 100,  spr: 0.05, spd: 7,  semiAuto: false },
    arcane_rifle:   { dm: 10, rate: 50, mag: 8,  rld: 80,  spr: 0.03, spd: 9,  semiAuto: false },
    thunder_shotgun:{ dm: 4,  rate: 65, mag: 5,  rld: 90,  spr: 0.18, spd: 6,  semiAuto: false },
    frost_smg:      { dm: 3,  rate: 14, mag: 35, rld: 70,  spr: 0.12, spd: 7,  semiAuto: false },
    fire_launcher:  { dm: 14, rate: 72, mag: 6,  rld: 100, spr: 0.07, spd: 5,  semiAuto: false },
    railgun:        { dm: 22, rate: 200, mag: 3,  rld: 200, spr: 0,    spd: 20, semiAuto: false },
    void_cannon:    { dm: 25, rate: 100, mag: 3, rld: 120, spr: 0.04, spd: 3.5, semiAuto: false },
    minigun:        { dm: 3,  rate: 6,  mag: 80, rld: 115, spr: 0.19, spd: 8,  semiAuto: false },
  },

  // Weapon upgrade per level
  WEAPON_UPGRADE: {
    magPerLevel: 2,        // +magazine per upgrade level
    reloadPerLevel: 4,     // -reload frames per upgrade level
    maxLevel: 5,
    baseCost: 50,
    costPerLevel: 30,
  },

  // ===== ENEMIES =====
  // hp, spd, xp, dm, shoots (bool), shootCD (frames)
  ENEMIES: {
    slime:      { r: 10, spd: 2.95, hp: 40,  xp: 1, dm: 8 },
    bat:        { r: 8,  spd: 3.65, hp: 25,  xp: 1, dm: 6 },
    skeleton:   { r: 11, spd: 2.05, hp: 65,  xp: 2, dm: 10 },
    spider:     { r: 9,  spd: 3.45, hp: 35,  xp: 1, dm: 7 },
    orc:        { r: 14, spd: 1.72, hp: 140, xp: 3, dm: 14 },
    mage_e:     { r: 11, spd: 1.78, hp: 75,  xp: 3, dm: 10, shoots: true, shootCD: 100 },
    ghost:      { r: 12, spd: 2.2,  hp: 55,  xp: 2, dm: 9, isGhost: true },
    demon:      { r: 13, spd: 0.95, hp: 120, xp: 4, dm: 12, shoots: true, shootCD: 85 },
    golem:      { r: 18, spd: 0.48, hp: 250, xp: 5, dm: 18 },
    dragon:     { r: 15, spd: 1.0,  hp: 170, xp: 5, dm: 16, shoots: true, shootCD: 80 },
    // --- NEW ENEMIES ---
    bomber:     { r: 10, spd: 1.3,  hp: 30,  xp: 2, dm: 15, isBomber: true, explodeRadius: 55, explodeDmg: 25 },
    shielder:   { r: 13, spd: 0.68, hp: 180, xp: 4, dm: 10, hasShield: true, shieldHP: 60 },
    healer:     { r: 10, spd: 0.60, hp: 60,  xp: 4, dm: 7, isHealer: true, healRadius: 100, healAmount: 2, healCD: 90 },
    assassin:   { r: 9,  spd: 2.0,  hp: 40,  xp: 3, dm: 14, isAssassin: true, dashCD: 300, dashDist: 80 },
    necro_e:    { r: 12, spd: 0.65, hp: 90,  xp: 5, dm: 8, isNecromancer: true, summonCD: 180, summonType: 'skeleton', summonCount: 2 },
    worm:       { r: 7,  spd: 1.15, hp: 20,  xp: 1, dm: 5, isWorm: true, splitCount: 2 },
    harpy:      { r: 10, spd: 2.2,  hp: 30,  xp: 2, dm: 8 },
    giant:      { r: 32, spd: 0.35, hp: 800, xp: 10, dm: 25 },
  },

  // Elite enemy multipliers
  ELITE: {
    radiusMult: 1.35,
    hpMult: 2.5,
    dmgMult: 1.8,
    xpMult: 3,
    chance: 0.30,         // Chance per spawn during elite wave
    spdMult: 1.15,        // Elites are slightly faster
  },

  // ===== BOSSES =====
  BOSSES: {
    hpScalePerTier: 0.35,  // HP multiplier per 5-wave tier
    attackCooldownBase: 90,
    attackCooldownPerPhase: 15,
    bosses: [
      { name: 'GOBLIN WARLORD',  hp: 2500, spd: 0.5,  xp: 80,  dm: 15, phases: 2 },
      { name: 'VOID SORCERER',   hp: 4000, spd: 0.35, xp: 120, dm: 18, phases: 2 },
      { name: 'INFERNO DRAGON',  hp: 6000, spd: 0.3,  xp: 180, dm: 22, phases: 3 },
      { name: 'LICH EMPEROR',    hp: 9000, spd: 0.4,  xp: 250, dm: 25, phases: 3 },
    ],
  },

  // ===== WAVE ESCALATION =====
  WAVES: {
    // Which enemy types unlock at which wave
    unlocks: [
      { wave: 1,  types: ['slime'] },
      { wave: 2,  types: ['bat'] },
      { wave: 3,  types: ['spider', 'worm'] },
      { wave: 4,  types: ['skeleton'] },
      { wave: 5,  types: ['bomber'] },
      { wave: 6,  types: ['orc'] },
      { wave: 7,  types: ['shielder'] },
      { wave: 8,  types: ['mage_e', 'healer'] },
      { wave: 9,  types: ['ghost'] },
      { wave: 10, types: ['assassin'] },
      { wave: 11, types: ['demon'] },
      { wave: 13, types: ['necro_e'] },
      { wave: 14, types: ['golem'] },
      { wave: 8,  types: ['giant'] },
      { wave: 6,  types: ['harpy'] },
      { wave: 16, types: ['dragon'] },
    ],

    // Enemy count formula: base + wave * perWave
    countBase: 20,
    countPerWave: 5,
    countBossBase: 8,
    countBossPerWave: 2,

    // Spawn rate (frames between spawns): starts at spawnRateBase, decreases by spawnRateDecay/wave, min spawnRateMin
    spawnRateBase: 35,
    spawnRateDecay: 1.5,
    spawnRateMin: 6,

    // HP scaling: enemies get hpScalePerWave more HP each wave
    hpScalePerWave: 0.12,
    // Speed scaling: enemies get faster each wave
    spdScalePerWave: 0.02,  // +2% speed per wave
    projSpdScalePerWave: 0.03, // +3% projectile speed per wave

    // Boss every N waves
    bossEveryN: 8,

    // Difficulty spikes: at these waves, spawn rate drops and enemy count jumps
    spikes: [
      { wave: 10, countBonus: 15, spawnRateBonus: -5 },
      { wave: 15, countBonus: 25, spawnRateBonus: -5 },
      { wave: 20, countBonus: 40, spawnRateBonus: -3 },
      { wave: 25, countBonus: 60, spawnRateBonus: -2 },
    ],
  },

  // ===== UPGRADES (per-level) =====
  UPGRADES: {
    damage:    { value: 0.10, max: 10 },  // +10% per level
    speed:     { value: 0.06, max: 6 },   // +6% per level
    health:    { value: 20,   max: 5 },    // +20 HP per level
    regen:     { value: 0.2,    max: 5 },    // +0.2 HP/sec per level
    armor:     { value: 1,    max: 5 },    // +1 armor per level
    crit:      { value: 0.06, max: 6 },    // +6% crit per level
    magnet:    { value: 20,   max: 6 },    // +20 radius per level
    fireRate:  { value: 0.92, max: 5 },    // ×0.92 per level (8% reduction)
    pierce:    { value: 1,    max: 4 },    // +1 pierce per level
    dodge:     { value: 0.05, max: 4 },    // +5% dodge per level
    coinFind:  { value: 0.20, max: 3 },    // +20% coins per level
    wisdom:    { value: 0.20, max: 3 },    // +20% XP per level
  },

  // ===== PASSIVE WEAPONS =====
  PASSIVES: {
    orbital:    { damage: 3, hitCD: 30, radius: 52, max: 4 },
    spears:     { damage: 4, hitCD: 25, length: 65, max: 3 },
    aura:       { dmgMult: 0.08, tickRate: 15, baseRadius: 50, radiusPerLvl: 5, max: 4 },
    lightning:  { baseDmg: 8, baseCooldown: 120, cdPerLvl: 8, range: 200, max: 3 },
    shield:     { baseRadius: 35, radiusPerLvl: 10, reflectDmg: 5, max: 2 },
    poison:     { dropRate: 15, baseDuration: 90, durationPerLvl: 20, baseDmg: 1, max: 3 },
    explosive:  { chancePerLvl: 0.08, max: 3 },
    multishot:  { max: 3 },
    thorns:     { dmgPerLvl: 4, max: 4 },
    vampirism:  { percentPerLvl: 0.02, max: 4 },
    chain:      { max: 3 },
  },

  // ===== PERMANENT STAT UPGRADES (menu) =====
  PERM_STATS: {
    hp:   { perLevel: 15,   speedMult: null, max: 5, baseCost: 30, costPerLevel: 20 },
    spd:  { perLevel: 0.1,  max: 8,  baseCost: 25, costPerLevel: 15 },
    arm:  { perLevel: 1,    max: 6,  baseCost: 30, costPerLevel: 20 },
    crit: { perLevel: 0.03, max: 6,  baseCost: 30, costPerLevel: 20 },
    xp:   { perLevel: 0.1,  max: 5,  baseCost: 35, costPerLevel: 25 },
    mag:  { perLevel: 8,    max: 5,  baseCost: 20, costPerLevel: 15 },
  },

  // ===== LEVELING =====
  LEVELING: {
    baseXP: 12,
    xpMultiplier: 1.15,    // XP requirement grows by 15% each level
    xpFlatAdd: 4,          // +4 flat XP added each level
  },

  // ===== EVENTS =====
  EVENTS: {
    triggerInterval: 3400,   // Frames between event checks
    triggerChance: 0.65,     // Chance to trigger
    minWave: 3,              // Minimum wave for events
    goldRushCoinMult: 3,
    goldRushOrbs: 15,
    swarmSlimes: 50,
    swarmBats: 20,
    necroSkeletons: 20,
    necroGhosts: 10,
  },

  // ===== ECONOMY =====
  ECONOMY: {
    startCoins: 100,
    adRewardCoins: 50,
    maxAdsPerDay: 5,
    reviveCoinCost: 30,
    enemyCoinDropChance: 0.06,
    eliteCoinDropChance: 0.30,
    bossCoinsReward: 20,
    bossHealPercent: 0.40,
  },

  // ===== CRATES =====
  CRATES: {
    weaponSpawnInterval: 21600, // frames between weapon crate spawns (~6 min)
    bonusSpawnInterval: 14400,  // frames between bonus crate spawns (~4 min)
    pickupRadius: 25,           // must be within this distance
    pickupTime: 180,            // frames to pickup (3 sec)
    weaponSpawnChance: 0.15,
    bonusSpawnChance: 0.2,
  },

  // ===== CHARACTERS (new) =====
  CHARACTERS_NEW: {
    paladin:   { hp: 140, spd: 2.0, arm: 4, dm: 0.95, holyAura: 0.03, abilityCD: 480 },
    berserker: { hp: 100, spd: 2.8, arm: 1, dm: 1.0,  rageThreshold: 0.4, rageDmgMult: 1.5, abilityCD: 300 },
  },

  // ===== PROC SKILLS =====
  PROCS: {
    freeze:     { chance: 0.02, duration: 120, max: 3 },   // 8% chance to freeze on hit
    execute:    { chance: 0.05, threshold: 0.15, max: 3 },  // 5% chance to instant-kill below 15% HP
    shockwave:  { chance: 0.06, radius: 60, dmgMult: 0.5, max: 3 }, // 6% chance AoE on hit
  },

  // ===== MISC =====
  MOVEMENT_SPEED_MULT: 0.45,  // Global speed multiplier
  MAX_PARTICLES: 300,
  MAX_ENEMIES: 200,
  MAX_PROJECTILES: 150,
  MAX_ENEMY_BULLETS: 200,
  AUTO_AIM_RANGE: 300,        // ~1/3 screen at ZOOM 0.95
  INTERSTITIAL_INTERVAL: 300000,  // ms between interstitial ads
};
