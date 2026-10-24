import * as THREE from 'three';
import { box, glow } from './models.js';

// Skattejagt: skjulte kister i alle områder. Med metaldetektoren (6) bipper det hurtigere,
// jo tættere man er. Tryk E for at grave, når den hyler.
const PRIZES = [
  { chance: 0.45, text: 'en pose mønter', points: [20, 60] },
  { chance: 0.25, text: 'en skattekiste', points: [60, 150] },
  { chance: 0.12, text: 'en gammel guldmønt 🪙', points: [100, 100], trophy: 'goldCoins' },
  { chance: 0.1, text: 'en kasse patroner', ammo: 15 },
  { chance: 0.08, text: 'en kæmpeskat! 💎', points: [250, 400], trophy: 'diamonds' },
];

export function createTreasure(game) {
  const { config, shop, input, hud, sound, effects, state } = game;
  const cfg = config.treasure;
  let spots = [];   // { area, x, z }
  let beepTimer = 0;

  function bury() {
    spots = [];
    for (const [id, n] of Object.entries(cfg.perArea)) {
      const area = game.areas[id];
      if (!area) continue;
      for (let i = 0; i < n; i++) {
        for (let tries = 0; tries < 30; tries++) {
          const x = area.center.x + (Math.random() - 0.5) * (area.size - 20);
          const z = area.center.z + (Math.random() - 0.5) * (area.size - 20);
          if (game.isInWater(x, z) || game.isDeepWater(x, z) || game.waterDistance(x, z) < 1) continue;
          spots.push({ area: id, x, z });
          break;
        }
      }
    }
  }
  bury();
  game.on('morning', bury);

  function dig(spot) {
    spots.splice(spots.indexOf(spot), 1);
    const y = game.groundHeight(spot.x, spot.z);
    effects.burst(new THREE.Vector3(spot.x, y + 0.3, spot.z), { count: 18, colors: [0x6b4423, 0x8a6a45], size: 0.18, speed: 3, up: 3, gravity: 10, life: 1 });
    // En lille kiste dukker op og forsvinder igen
    const chest = new THREE.Group();
    chest.add(box(0.7, 0.4, 0.5, 0x7a4b25, 0, 0.2, 0, 'planks'), box(0.72, 0.12, 0.52, 0xf2c22b, 0, 0.42, 0));
    const shine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), glow(0xffe14d, 3));
    shine.position.y = 0.7;
    chest.add(shine);
    chest.position.set(spot.x, y, spot.z);
    game.scene.add(chest);
    setTimeout(() => game.scene.remove(chest), 3000);

    let r = Math.random();
    const prize = PRIZES.find((p) => (r -= p.chance) < 0) ?? PRIZES[0];
    let text = `⛏️ Du fandt ${prize.text}!`;
    if (prize.points) {
      const points = prize.points[0] + Math.floor(Math.random() * (prize.points[1] - prize.points[0] + 1));
      state.points += points;
      text += ` +${points} ⭐`;
    }
    if (prize.ammo) game.weapon.addAmmo(prize.ammo);
    if (prize.trophy) state.trophies[prize.trophy] = (state.trophies[prize.trophy] || 0) + 1;
    sound.medal();
    game.message(text);
    game.emit('treasureFound', { prize: prize.text });
  }

  shop.addItem({
    id: 'metalDetector',
    category: 'udstyr',
    emoji: '🔍',
    name: 'Metaldetektor',
    basePrice: config.prices.metalDetector,
    levels: [{ text: 'Find skjulte skatte i alle områder. Tryk 6, og følg bippene' }],
    onBuy(level, { loading }) {
      if (!loading) game.message('🔍 Tryk 6 for metaldetektoren. Nye skatte hver morgen!');
    },
  });

  return {
    get spots() { return spots; },

    update(dt) {
      if (game.weapon.current !== 'detector' || game.player.vehicle) return;
      const p = game.player.position;
      const here = spots.filter((s) => s.area === game.area.id);
      let nearest = null;
      let distance = Infinity;
      for (const s of here) {
        const d = Math.hypot(s.x - p.x, s.z - p.z);
        if (d < distance) {
          nearest = s;
          distance = d;
        }
      }
      if (!nearest) {
        hud.setPrompt('🔍 Ingen skatte her i dag. Prøv et andet sted!');
        return;
      }
      // Bip: hurtigere og lysere jo tættere man er
      beepTimer -= dt;
      if (beepTimer <= 0 && distance < cfg.range) {
        beepTimer = Math.max(0.12, distance / 25);
        sound.beep(1 - distance / cfg.range);
      }
      if (distance < 1.8) {
        hud.setPrompt('🔍 BIIIP! Tryk <b>E</b> for at grave ⛏️');
        if (input.consume('KeyE')) dig(nearest);
      } else {
        const word = distance < 6 ? '🔥 Meget varm!' : distance < 15 ? '♨️ Varm' : distance < cfg.range ? '🌤️ Lunken' : '❄️ Kold – gå på opdagelse';
        hud.setPrompt(`🔍 ${word}`);
      }
    },
  };
}
