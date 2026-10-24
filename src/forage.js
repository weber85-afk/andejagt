import * as THREE from 'three';
import { box } from './models.js';

// Ting man kan samle i naturen: bær fra buske i lejren (E) og svampe i Storskoven (gå hen til dem).
// De vokser ud igen hver morgen.
export function createForage(game) {
  const { scene, input, hud, sound } = game;
  const bushes = [];
  const mushrooms = [];

  function spot(area, avoid = 3) {
    for (let i = 0; i < 60; i++) {
      const x = area.center.x + (Math.random() - 0.5) * (area.size - 16);
      const z = area.center.z + (Math.random() - 0.5) * (area.size - 16);
      if (game.waterDistance(x, z) < 3) continue;
      if (area.flat.some((f) => Math.hypot(x - f.x, z - f.z) < f.r + avoid)) continue;
      if (game.colliders.some((c) => c.r !== undefined && Math.hypot(x - c.x, z - c.z) < c.r + 1.2)) continue;
      return new THREE.Vector3(x, game.groundHeight(x, z), z);
    }
    return null;
  }

  // Bærbuske i lejren
  for (let i = 0; i < 12; i++) {
    const p = spot(game.areas.home);
    if (!p) continue;
    const g = new THREE.Group();
    g.add(box(1.3, 0.9, 1.2, 0x3d8a40, 0, 0.45, 0, 'leaves'), box(0.9, 0.6, 0.9, 0x4a9a4a, 0.2, 0.9, 0.1, 'leaves'));
    const berries = new THREE.Group();
    for (let k = 0; k < 9; k++) {
      berries.add(box(0.12, 0.12, 0.12, 0x3a3ad8, (Math.random() - 0.5) * 1.2, 0.3 + Math.random() * 0.8, (k % 2 ? 1 : -1) * 0.61));
    }
    g.add(berries);
    g.position.copy(p);
    scene.add(g);
    bushes.push({ pos: p, berries, full: true });
  }

  // Svampe i Storskoven
  function addMushroom() {
    const p = spot(game.areas.forest, 1);
    if (!p) return;
    const g = new THREE.Group();
    g.add(box(0.14, 0.3, 0.14, 0xf2ead2, 0, 0.15, 0), box(0.45, 0.16, 0.45, 0xb5643a, 0, 0.36, 0), box(0.3, 0.06, 0.3, 0xc9784a, 0, 0.46, 0));
    g.position.copy(p);
    scene.add(g);
    mushrooms.push({ pos: p, mesh: g });
  }
  for (let i = 0; i < 25; i++) addMushroom();

  game.on('morning', () => {
    bushes.forEach((b) => {
      b.full = true;
      b.berries.visible = true;
    });
    while (mushrooms.length < 25) addMushroom();
  });

  return {
    update() {
      const p = game.player.position;
      if (game.area === game.areas.home) {
        const bush = bushes.find((b) => b.full && Math.hypot(b.pos.x - p.x, b.pos.z - p.z) < 2.2);
        if (bush && !game.player.vehicle) {
          hud.setPrompt('Tryk <b>E</b> for at plukke bær 🫐');
          if (input.consume('KeyE')) {
            bush.full = false;
            bush.berries.visible = false;
            game.addToBag('berry', 3);
            sound.pickup();
            game.message('🫐 +3 bær!');
          }
        }
      } else if (game.area === game.areas.forest && !game.player.vehicle) {
        for (let i = mushrooms.length - 1; i >= 0; i--) {
          const m = mushrooms[i];
          if (Math.hypot(m.pos.x - p.x, m.pos.z - p.z) < 1.3) {
            scene.remove(m.mesh);
            mushrooms.splice(i, 1);
            game.addToBag('mushroom');
            sound.pickup();
            game.message('🍄 +1 svamp!');
          }
        }
      }
    },
  };
}
