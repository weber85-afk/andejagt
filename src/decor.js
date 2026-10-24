import * as THREE from 'three';
import { box, glow } from './models.js';

// Pynt til lejren: gynge, hængekøje og lyskæder rundt om bålet. Kan tages på og af i butikken.
export function createDecor(game) {
  const { config, scene, shop } = game;
  const cfg = config.farm;
  const at = (p) => new THREE.Vector3(p.x, game.groundHeight(p.x, p.z), p.z);

  // Gynge
  const swing = new THREE.Group();
  swing.position.copy(at(cfg.swing));
  swing.add(box(0.15, 2.6, 0.15, 0x6b4423, -1, 1.3, 0, 'bark'), box(0.15, 2.6, 0.15, 0x6b4423, 1, 1.3, 0, 'bark'), box(2.3, 0.15, 0.15, 0x6b4423, 0, 2.6, 0, 'bark'));
  const seat = new THREE.Group();
  seat.position.y = 2.55;
  seat.add(box(0.03, 2, 0.03, 0xd8c8a0, -0.3, -1, 0), box(0.03, 2, 0.03, 0xd8c8a0, 0.3, -1, 0), box(0.8, 0.08, 0.35, 0x8b5a2b, 0, -2, 0, 'planks'));
  swing.add(seat);
  swing.visible = false;
  scene.add(swing);

  // Hængekøje
  const hammock = new THREE.Group();
  hammock.position.copy(at(cfg.hammock));
  hammock.add(box(0.2, 2, 0.2, 0x6b4423, -1.6, 1, 0, 'bark'), box(0.2, 2, 0.2, 0x6b4423, 1.6, 1, 0, 'bark'));
  const cloth = box(2.6, 0.08, 0.9, 0x3a8ad8, 0, 0.9, 0);
  const cloth2 = box(1.2, 0.08, 0.9, 0x3a8ad8, 0, 0.75, 0);
  hammock.add(cloth, cloth2, box(0.5, 0.15, 0.35, 0xf2f2f2, -0.9, 1.0, 0));
  hammock.visible = false;
  scene.add(hammock);

  // Lyskæder rundt om bålet
  const lights = new THREE.Group();
  const fire = game.campfire.position;
  const posts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    posts.push(new THREE.Vector3(fire.x + Math.cos(a) * 6, 0, fire.z + Math.sin(a) * 6));
  }
  const colors = [0xff5a5a, 0xffe14d, 0x5ad85a, 0x5aa8ff, 0xff8ae8];
  const bulbs = [];
  posts.forEach((p, i) => {
    lights.add(box(0.1, 2.6, 0.1, 0x6b4423, p.x, game.groundHeight(p.x, p.z) + 1.3, p.z));
    const next = posts[(i + 1) % posts.length];
    for (let k = 0; k < 6; k++) {
      const t = k / 6;
      const x = p.x + (next.x - p.x) * t;
      const z = p.z + (next.z - p.z) * t;
      const sag = Math.sin(t * Math.PI) * 0.4;
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), glow(colors[(i * 6 + k) % colors.length], 1));
      bulb.position.set(x, game.groundHeight(x, z) + 2.5 - sag, z);
      bulb.userData.base = bulb.material.color.clone();
      lights.add(bulb);
      bulbs.push(bulb);
    }
  });
  lights.visible = false;
  scene.add(lights);

  for (const [id, emoji, name, group] of [['swing', '🛝', 'Gynge', swing], ['hammock', '🏝️', 'Hængekøje', hammock], ['lights', '💡', 'Lyskæder ved bålet', lights]]) {
    shop.addItem({
      id: `decor-${id}`,
      category: 'lejr',
      emoji,
      name,
      cosmetic: true,
      price: config.prices[id],
      text: 'Pynt til lejren. Kan tages væk igen',
      onEquip: (on) => { group.visible = on; },
    });
  }

  return {
    update() {
      if (swing.visible) seat.rotation.x = Math.sin(game.time * 1.6) * 0.35;
      if (lights.visible) {
        const glowing = 1 + (1 - game.dayNight.light) * 2.5;
        bulbs.forEach((b, i) => b.material.color.copy(b.userData.base).multiplyScalar(glowing * (0.8 + Math.sin(game.time * 2 + i) * 0.2)));
      }
    },
  };
}
