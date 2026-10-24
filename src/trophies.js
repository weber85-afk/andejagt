import * as THREE from 'three';
import { box, textSign } from './models.js';
import { makeDuckModel } from './ducks.js';

// Trofævæggen i shelteret: bjørneskind på gulvet, gyldne ænder på en hylde og den største fisk.
export function createTrophies(game) {
  const { config, shop, state } = game;
  let display = null;

  function rebuild() {
    const hut = game.shelter.hut;
    if (!hut || !shop.has('trophyWall')) return;
    if (display) hut.remove(display);
    display = new THREE.Group();
    const t = state.trophies;

    // Brædt på den højre væg (indefra)
    const board = box(0.08, 1.3, 2.4, 0x6b4423, 1.85, 1.55, 0.2, 'planks');
    display.add(board);
    const title = textSign(['🏆 Trofæer'], { width: 1.4, height: 0.35 });
    title.position.set(1.8, 2.35, 0.2);
    title.rotation.y = -Math.PI / 2;
    display.add(title);

    // Gyldne ænder på en hylde
    display.add(box(0.3, 0.06, 2.2, 0x8b5a2b, 1.7, 1.15, 0.2, 'planks'));
    for (let i = 0; i < Math.min(t.goldenDucks || 0, 5); i++) {
      const { mesh } = makeDuckModel(true);
      mesh.scale.setScalar(0.35);
      mesh.position.set(1.7, 1.3, -0.6 + i * 0.4);
      mesh.rotation.y = -Math.PI / 2;
      display.add(mesh);
    }

    // Den største fisk
    if (t.biggestFish) {
      const fish = new THREE.Group();
      fish.add(box(0.05, 0.4, 0.9, 0x5a3a1e), box(0.12, 0.25, 0.7, 0x9fb8c8, -0.08, 0, 0), box(0.1, 0.3, 0.15, 0x7f98a8, -0.08, 0, -0.42));
      fish.position.set(1.78, 1.75, 0.6);
      display.add(fish);
      const label = textSign([`🐟 ${String(t.biggestFish).replace('.', ',')} kg`], { width: 0.8, height: 0.25 });
      label.position.set(1.78, 1.4, 0.6);
      label.rotation.y = -Math.PI / 2;
      display.add(label);
    }

    // Bjørneskind på gulvet
    for (let i = 0; i < Math.min(t.bears || 0, 3); i++) {
      const rug = new THREE.Group();
      rug.add(
        box(1.2, 0.04, 1.6, 0x5a3a22, 0, 0, 0),
        box(0.5, 0.15, 0.45, 0x5a3a22, 0, 0.06, 0.95),
        box(0.25, 0.04, 0.4, 0x5a3a22, -0.7, 0, 0.5),
        box(0.25, 0.04, 0.4, 0x5a3a22, 0.7, 0, 0.5),
        box(0.25, 0.04, 0.4, 0x5a3a22, -0.7, 0, -0.5),
        box(0.25, 0.04, 0.4, 0x5a3a22, 0.7, 0, -0.5),
      );
      rug.position.set(0.3 - i * 0.2, 0.12 + i * 0.01, 0.4 - i * 0.3);
      rug.rotation.y = 0.3 + i * 0.6;
      display.add(rug);
    }
    hut.add(display);
  }

  shop.addItem({
    id: 'trophyWall',
    category: 'lejr',
    emoji: '🏆',
    name: 'Trofævæg',
    basePrice: config.prices.trophyWall,
    requires: () => (game.shelter.built ? null : 'Kræver shelteret'),
    levels: [{ text: 'Vis dine bjørneskind, gyldne ænder og din største fisk i shelteret' }],
    onBuy(level, { loading }) {
      rebuild();
      if (!loading) game.message('🏆 Trofævæggen hænger i shelteret');
    },
  });

  game.on('animalHit', ({ type, golden }) => {
    if (type === 'bear' || golden) rebuild();
  });
  game.on('fishCaught', rebuild);

  return {};
}
