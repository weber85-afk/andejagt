import * as THREE from 'three';
import { box } from './models.js';

// Jagttårnet i Storskoven: klatr op med E. Deroppe kan dyrene ikke se én, og man kan se langt.
export function createTower(game) {
  const { config, scene, shop, input, hud, player } = game;
  const fc = config.forest.center;
  const t = config.forest.tower;
  const pos = new THREE.Vector3(fc.x + t.x, 0, fc.z + t.z);
  const height = 5;
  const ladder = new THREE.Vector3(pos.x, 0, pos.z + 1.9);
  let built = false;

  // Når man står på tårnet, "kører" man på det, så man ikke falder ned
  const platform = {
    speed: 2,
    seatHeight: height + 0.25,
    constrain(p) {
      p.x = Math.max(pos.x - 1, Math.min(pos.x + 1, p.x));
      p.z = Math.max(pos.z - 1, Math.min(pos.z + 1, p.z));
    },
  };

  function build() {
    if (built) return;
    built = true;
    const g = new THREE.Group();
    g.position.copy(pos);
    for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) g.add(box(0.2, height + 2.4, 0.2, 0x6b4423, x, (height + 2.4) / 2, z, 'bark'));
    g.add(
      box(2.8, 0.2, 2.8, 0x8b5a2b, 0, height, 0, 'planks'),
      box(2.8, 0.7, 0.1, 0x8b5a2b, 0, height + 0.45, -1.35, 'planks'),
      box(0.1, 0.7, 2.8, 0x8b5a2b, -1.35, height + 0.45, 0, 'planks'),
      box(0.1, 0.7, 2.8, 0x8b5a2b, 1.35, height + 0.45, 0, 'planks'),
      box(3.3, 0.15, 3.3, 0x3d6b2a, 0, height + 2.4, 0),
    );
    // Stige
    for (const x of [-0.35, 0.35]) g.add(box(0.08, height + 0.8, 0.08, 0x5a3a1e, x, (height + 0.8) / 2, 1.5));
    for (let y = 0.4; y < height; y += 0.45) g.add(box(0.7, 0.06, 0.06, 0x5a3a1e, 0, y, 1.5));
    scene.add(g);
    for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) game.colliders.push({ x: pos.x + x, z: pos.z + z, r: 0.2 });
  }

  shop.addItem({
    id: 'tower',
    category: 'skov',
    emoji: '🗼',
    name: 'Jagttårn i Storskoven',
    basePrice: config.prices.tower,
    requires: () => (shop.has('car') ? null : 'Kræver bilen'),
    levels: [{ text: 'Klatr op og se langt. Deroppe bliver dyrene ikke bange' }],
    onBuy(level, { loading }) {
      build();
      if (!loading) game.message('🗼 Jagttårnet står i Storskoven');
    },
  });

  return {
    position: pos,
    get isOnTop() { return player.vehicle === platform; },

    update() {
      if (!built) return;
      if (player.vehicle === platform) {
        hud.setPrompt('Tryk <b>E</b> for at klatre ned');
        if (input.consume('KeyE')) {
          player.setVehicle(null);
          player.teleport(ladder.x, ladder.z + 0.6);
        }
      } else if (!player.vehicle && game.isPlayerNear(ladder, 1.8)) {
        hud.setPrompt('Tryk <b>E</b> for at klatre op i tårnet 🗼');
        if (input.consume('KeyE')) {
          player.teleport(pos.x, pos.z);
          player.setVehicle(platform);
          game.message('🗼 Her oppe kan dyrene ikke se dig');
        }
      }
    },
  };
}
