// ===== PLATFORM SDK INTEGRATION =====
// Supports: Yandex Games, Crazy Games, standalone
"use strict";

const SDK = {
  platform: 'standalone', // 'yandex' | 'crazygames' | 'standalone'
  ysdk: null,
  cgsdk: null,
  player: null,
  initialized: false,

  async init() {
    // Detect platform
    if (typeof YaGames !== 'undefined') {
      this.platform = 'yandex';
      try {
        this.ysdk = await YaGames.init();
        console.log('[SDK] Yandex Games initialized');
        try {
          this.player = await this.ysdk.getPlayer({ scopes: false });
        } catch(e) {
          console.log('[SDK] Yandex player not authorized');
        }
        // Signal game ready
        this.ysdk.features.LoadingAPI && this.ysdk.features.LoadingAPI.ready();
      } catch(e) {
        console.error('[SDK] Yandex init error:', e);
      }
    } else if (typeof CrazyGames !== 'undefined' && CrazyGames.SDK) {
      this.platform = 'crazygames';
      try {
        this.cgsdk = CrazyGames.SDK;
        await this.cgsdk.init();
        console.log('[SDK] CrazyGames initialized');
      } catch(e) {
        console.error('[SDK] CrazyGames init error:', e);
      }
    }
    this.initialized = true;
    console.log('[SDK] Platform:', this.platform);
  },

  // ===== ADS =====
  async showRewarded(callback) {
    if (this.platform === 'yandex' && this.ysdk) {
      try {
        await this.ysdk.adv.showRewardedVideo({
          callbacks: {
            onOpen: () => { if (window.Game) Game.pause(); },
            onRewarded: () => { callback && callback(); },
            onClose: () => { if (window.Game) Game.resume(); },
            onError: (e) => { 
              console.error('[SDK] Yandex rewarded error:', e);
              if (window.Game) Game.resume();
            }
          }
        });
        return true;
      } catch(e) {
        console.error('[SDK] Rewarded ad error:', e);
        return false;
      }
    } else if (this.platform === 'crazygames' && this.cgsdk) {
      try {
        const result = await this.cgsdk.ad.requestAd('rewarded');
        if (result === 'reward') { callback && callback(); }
        return true;
      } catch(e) {
        console.error('[SDK] CrazyGames rewarded error:', e);
        return false;
      }
    } else {
      // Standalone - fake ad timer
      return false;
    }
  },

  async showInterstitial() {
    if (this.platform === 'yandex' && this.ysdk) {
      try {
        await this.ysdk.adv.showFullscreenAdv({
          callbacks: {
            onOpen: () => { if (window.Game) Game.pause(); },
            onClose: (wasShown) => { if (window.Game) Game.resume(); },
            onError: (e) => { if (window.Game) Game.resume(); }
          }
        });
      } catch(e) {}
    } else if (this.platform === 'crazygames' && this.cgsdk) {
      try {
        await this.cgsdk.ad.requestAd('midgame');
      } catch(e) {}
    }
  },

  // ===== SAVE/LOAD =====
  async saveData(key, data) {
    const json = JSON.stringify(data);
    // Always save to localStorage as fallback
    try { localStorage.setItem(key, json); } catch(e) {}

    if (this.platform === 'yandex' && this.player) {
      try {
        await this.player.setData({ [key]: json }, true);
      } catch(e) {}
    } else if (this.platform === 'crazygames' && this.cgsdk) {
      try {
        await this.cgsdk.data.save(key, data);
      } catch(e) {}
    }
  },

  async loadData(key, defaults) {
    // Try platform first
    if (this.platform === 'yandex' && this.player) {
      try {
        const data = await this.player.getData([key]);
        if (data && data[key]) return JSON.parse(data[key]);
      } catch(e) {}
    } else if (this.platform === 'crazygames' && this.cgsdk) {
      try {
        const data = await this.cgsdk.data.load(key);
        if (data) return data;
      } catch(e) {}
    }
    // Fallback to localStorage
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return defaults;
  },

  // ===== LEADERBOARD =====
  async submitScore(score) {
    if (this.platform === 'yandex' && this.ysdk) {
      try {
        const lb = await this.ysdk.getLeaderboards();
        await lb.setLeaderboardScore('main', score);
      } catch(e) {}
    }
  },

  // ===== GAME EVENTS =====
  gameplayStart() {
    if (this.platform === 'crazygames' && this.cgsdk) {
      try { this.cgsdk.game.gameplayStart(); } catch(e) {}
    }
  },

  gameplayStop() {
    if (this.platform === 'crazygames' && this.cgsdk) {
      try { this.cgsdk.game.gameplayStop(); } catch(e) {}
    }
  },

  happyTime() {
    if (this.platform === 'crazygames' && this.cgsdk) {
      try { this.cgsdk.game.happyTime(); } catch(e) {}
    }
  }
};
