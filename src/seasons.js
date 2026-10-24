import * as THREE from 'three';
import { materialsWithPattern } from './models.js';

// Årstider: sommer, efterår, vinter og forår skifter efter et par dage.
// Om efteråret bliver bladene orange, om vinteren kommer der sne, og søen og åen fryser til.
const SEASONS = [
  { id: 'summer', name: '☀️ Sommer', message: '☀️ Nu er det sommer!' },
  { id: 'autumn', name: '🍂 Efterår', message: '🍂 Nu er det efterår! Bladene bliver orange' },
  { id: 'winter', name: '❄️ Vinter', message: '❄️ Nu er det vinter! Søen er frosset til' },
  { id: 'spring', name: '🌸 Forår', message: '🌸 Nu er det forår!' },
];
const SPRUCE = [0x1f5f3a, 0x24693f, 0x1a5233];

export function createSeasons(game) {
  const { config, world } = game;
  let current = null;
  const ICE = new THREE.Color(0xdfefff);
  const WATER = new THREE.Color(0x2f8fd6);

  function seasonFor(day) {
    return SEASONS[Math.floor((day - 1) / config.seasons.daysPerSeason) % SEASONS.length];
  }

  function apply(season) {
    const id = season.id;
    // Bladene (hentes her, så også blade der er lavet senere kommer med)
    for (const { color, material } of materialsWithPattern('leaves')) {
      const spruce = SPRUCE.includes(color);
      material.color.set(color);
      if (id === 'autumn') material.color.lerp(new THREE.Color(spruce ? 0x2a5a30 : 0xd9822b), spruce ? 0.15 : 0.7);
      if (id === 'winter') material.color.lerp(new THREE.Color(0xf2f6fa), spruce ? 0.35 : 0.6);
      if (id === 'spring') material.color.lerp(new THREE.Color(0x9fe07a), spruce ? 0.1 : 0.35);
    }
    // Jorden
    for (const ground of world.grounds) {
      const m = ground.material;
      m.vertexColors = id !== 'winter';
      m.color.set({ autumn: 0xe8d8a0, winter: 0xf4f7fb, spring: 0xf0fff0 }[id] ?? 0xffffff);
      m.needsUpdate = true;
    }
    // Græs og blomster
    for (const d of world.decorations) {
      d.userData.seasonHidden = id === 'winter' || (id === 'autumn' && d.userData.kind === 'flower');
    }
    world.refreshDecorations();
    // Is på søen og åen (ikke havet)
    game.frozen = id === 'winter';
    for (const w of world.water) {
      if (w.userData.area === 'sea') continue;
      w.userData.frozen = game.frozen;
      w.material.color.copy(game.frozen ? ICE : WATER);
      w.material.opacity = game.frozen ? 0.97 : 0.86;
      if (game.frozen) {
        w.geometry.attributes.position.array.set(w.userData.base);
        w.geometry.attributes.position.needsUpdate = true;
        w.geometry.computeVertexNormals();
      }
    }
  }

  return {
    get id() { return current?.id; },
    get name() { return current?.name ?? ''; },
    get isWinter() { return current?.id === 'winter'; },
    get isFrozen() { return !!game.frozen; },

    update() {
      const season = seasonFor(game.dayNight.day);
      if (season === current) return;
      const first = current === null;
      current = season;
      apply(season);
      if (!first) game.message(season.message);
      game.emit('season', { id: season.id });
    },
  };
}
