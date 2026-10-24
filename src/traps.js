import * as THREE from 'three';
import { box } from './models.js';
import { makeCarcass } from './catalog.js';

// Fælder: sæt en fælde med T. Næste morgen er der måske fanget en hare i den.
export function createTraps(game) {
  const { config, scene, shop, input, hud, sound, state } = game;
  const cfg = config.traps;
  const placed = [];   // { x, z, caught, mesh, catchMesh }

  function makeTrap() {
    const g = new THREE.Group();
    g.add(
      box(0.9, 0.06, 0.6, 0x5a5a5a),
      box(0.06, 0.45, 0.6, 0x777777, -0.42, 0.22, 0),
      box(0.06, 0.45, 0.6, 0x777777, 0.42, 0.22, 0),
      box(0.9, 0.05, 0.05, 0x777777, 0, 0.45, -0.28),
      box(0.9, 0.05, 0.05, 0x777777, 0, 0.45, 0.28),
    );
    return g;
  }

  function place(x, z, caught = null) {
    const mesh = makeTrap();
    mesh.position.set(x, game.groundHeight(x, z), z);
    scene.add(mesh);
    const trap = { x, z, caught: null, mesh, catchMesh: null };
    placed.push(trap);
    if (caught) setCatch(trap, caught);
    return trap;
  }

  function setCatch(trap, type) {
    trap.caught = type;
    trap.catchMesh = makeCarcass(type);
    trap.catchMesh.scale.setScalar(0.7);
    trap.catchMesh.position.y = 0.2;
    trap.mesh.add(trap.catchMesh);
  }

  game.on('morning', () => {
    let caught = 0;
    for (const t of placed) {
      if (!t.caught && Math.random() < cfg.chance) {
        setCatch(t, Math.random() < 0.8 ? 'hare' : 'pheasant');
        caught++;
      }
    }
    if (caught) setTimeout(() => game.message(`🪤 Der er fanget noget i ${caught} ${caught === 1 ? 'fælde' : 'fælder'}!`), 4000);
  });

  shop.addItem({
    id: 'trap',
    category: 'udstyr',
    emoji: '🪤',
    name: 'Fælde',
    consumable: true,
    price: config.prices.trap,
    text: 'Sæt den med T. Næste morgen er der måske en hare i',
    current: () => `Du har ${state.traps ?? 0} i tasken, og ${placed.length} er sat ud`,
    onBuy() {
      state.traps = (state.traps ?? 0) + 1;
    },
  });

  game.remember('traps', {
    save: () => placed.map((t) => ({ x: t.x, z: t.z, caught: t.caught })),
    load(data) {
      for (const t of data) place(t.x, t.z, t.caught);
    },
  });

  return {
    update() {
      const p = game.player.position;
      if (input.wasPressed('KeyT') && !game.player.vehicle) {
        if ((state.traps ?? 0) <= 0) {
          game.message('🪤 Du har ingen fælder. Køb dem i butikken');
        } else if (placed.length >= cfg.max) {
          game.message(`🪤 Du kan højst have ${cfg.max} fælder ude`);
        } else if (game.isInWater(p.x, p.z)) {
          game.message('🪤 Fælden kan ikke stå i vand');
        } else {
          state.traps--;
          place(p.x + Math.sin(game.player.yaw) * -1.2, p.z + Math.cos(game.player.yaw) * -1.2);
          sound.reload();
          game.message('🪤 Fælden er sat. Kom tilbage i morgen!');
        }
      }
      const trap = placed.find((t) => Math.hypot(t.x - p.x, t.z - p.z) < 1.6);
      if (!trap || game.player.vehicle) return;
      if (trap.caught) {
        hud.setPrompt(`Tryk <b>E</b> for at tage ${game.foodName(trap.caught)} 🪤`);
        if (input.consume('KeyE')) {
          game.addToBag(trap.caught);
          game.message(`🪤 +1 ${game.config.foods[trap.caught].name}!`);
          game.emit('pickedUp', { type: trap.caught });
          trap.mesh.remove(trap.catchMesh);
          trap.caught = null;
          sound.pickup();
        }
      } else {
        hud.setPrompt('Tryk <b>E</b> for at tage fælden med 🪤');
        if (input.consume('KeyE')) {
          scene.remove(trap.mesh);
          placed.splice(placed.indexOf(trap), 1);
          state.traps = (state.traps ?? 0) + 1;
        }
      }
    },
  };
}
