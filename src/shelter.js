import * as THREE from 'three';
import { box, glow, signPost } from './models.js';

// Shelteret: en lille hytte man kan købe og sove i om natten.
export function createShelter(game) {
  const { config, scene, hud, effects, sound } = game;
  const cfg = config.shelter;
  const pos = new THREE.Vector3(cfg.position.x, 0, cfg.position.z);

  // Indtil man har købt shelteret, står der et skilt
  const sign = signPost(['🏠 Her kan dit', 'shelter stå'], { width: 2, height: 0.8 });
  sign.position.copy(pos);
  sign.rotation.y = Math.atan2(-pos.x, -pos.z);
  scene.add(sign);

  let built = false;
  let sleeping = false;
  let hut = null;
  const bedPos = new THREE.Vector3();
  const basketPosition = new THREE.Vector3(pos.x - 1.3, 0, pos.z + 1.1);
  let lampLight = null;

  function wall(w, h, d, x, y, z) {
    game.colliders.push({
      x: pos.x + x, z: pos.z + z,
      minX: pos.x + x - w / 2, maxX: pos.x + x + w / 2,
      minZ: pos.z + z - d / 2, maxZ: pos.z + z + d / 2,
    });
    return box(w, h, d, 0x8b5a2b, x, y, z, 'planks');
  }

  function build({ loading }) {
    if (built) return;
    built = true;
    scene.remove(sign);

    // Hytten er 4 x 4 meter med døren mod syd (+Z)
    const W = 4, D = 4, H = 2.4, T = 0.2, door = 1.4;
    hut = new THREE.Group();
    hut.position.copy(pos);
    scene.add(hut);

    const side = (W - door) / 2;
    hut.add(
      box(W, 0.1, D, 0xc49a6c, 0, 0.05, 0, 'planks'),                         // gulv
      wall(W, H, T, 0, H / 2, -D / 2 + T / 2),                                 // bagvæg
      wall(T, H, D, -W / 2 + T / 2, H / 2, 0),                                 // venstre væg
      wall(T, H, D, W / 2 - T / 2, H / 2, 0),                                  // højre væg
      wall(side, H, T, -(door / 2 + side / 2), H / 2, D / 2 - T / 2),          // forvæg
      wall(side, H, T, door / 2 + side / 2, H / 2, D / 2 - T / 2),             // forvæg
      box(door, 0.5, T, 0x8b5a2b, 0, H - 0.25, D / 2 - T / 2),                 // over døren
    );

    // Taget
    const slope = 0.6;
    const halfSpan = W / 2 + 0.3;
    for (const s of [-1, 1]) {
      const roof = box(halfSpan / Math.cos(slope) + 0.1, 0.15, D + 0.6, 0x5a3a1e, s * -halfSpan / 2, H + (halfSpan / 2) * Math.tan(slope), 0);
      roof.rotation.z = s * slope;
      hut.add(roof);
    }
    // Gavle (trappeformede trekanter for og bag)
    for (const z of [-D / 2 + T / 2, D / 2 - T / 2]) {
      for (let k = 0; k < 5; k++) {
        hut.add(box(W * (1 - k / 5), 0.3, T, 0x7a4b25, 0, H + 0.15 + k * 0.3, z));
      }
    }

    // Seng og lygte
    hut.add(
      box(1.1, 0.35, 2.1, 0x8b5a2b, -1.2, 0.27, -0.75),
      box(1, 0.15, 1.5, 0xc0392b, -1.2, 0.5, -0.45),
      box(0.8, 0.15, 0.45, 0xffffff, -1.2, 0.52, -1.5),
    );
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), glow(0xffd36b, 2.5));
    lamp.position.set(1.5, 1.7, -1.65);
    const lampLight = new THREE.PointLight(0xffc46b, 1.5, 6, 1.5);
    lampLight.position.copy(lamp.position);
    hut.add(lamp, lampLight);

    bedPos.set(pos.x - 1.2, 0, pos.z - 0.75);

    if (!loading) {
      effects.burst(new THREE.Vector3(pos.x, 1.5, pos.z), { count: 30, colors: [0xc49a6c, 0x8b5a2b], size: 0.2, speed: 6, up: 4, gravity: 10, life: 1.5, spread: 3 });
      game.message('🏠 Dit shelter er bygget!');
    }
  }

  game.shop.addItem({
    id: 'shelter',
    category: 'lejr',
    emoji: '🏠',
    name: 'Shelter',
    basePrice: cfg.price,
    levels: [{ text: 'En hytte hvor du kan sove om natten' }],
    current: () => (built ? 'Dit shelter står klar' : 'Om natten er det mørkt, og ænderne sover'),
    onBuy: (level, options) => build(options),
  });

  // --- Ekstra ting til shelteret ---
  function addBasket() {
    hut.add(
      box(1.1, 0.25, 0.8, 0xc49a6c, -1.3, 0.17, 1.1),
      box(0.9, 0.08, 0.6, 0x5a7fbf, -1.3, 0.28, 1.1),   // pude
    );
  }

  function addLamp() {
    hut.add(box(0.1, 2.2, 0.1, 0x5a3a1e, 1.3, 1.1, 2.6), box(0.5, 0.08, 0.08, 0x5a3a1e, 1.1, 2.2, 2.6));
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), glow(0xffd36b, 3));
    lantern.position.set(0.9, 1.98, 2.6);
    lampLight = new THREE.PointLight(0xffc46b, 0, 12, 1.2);
    lampLight.position.copy(lantern.position);
    hut.add(lantern, lampLight);
  }

  function addChest() {
    hut.add(
      box(0.9, 0.5, 0.55, 0x7a4b25, 1.3, 0.3, -1.4),
      box(0.92, 0.12, 0.57, 0x5a3a1e, 1.3, 0.6, -1.4),
      box(0.12, 0.14, 0.04, 0xf2c22b, 1.3, 0.48, -1.12),
    );
  }

  // Et ekstra værelse ved siden af med sin egen dør
  function addRoom() {
    const W = 3, D = 4, H = 2.2, T = 0.2, door = 1.2;
    const x0 = 2 + W / 2;   // midten af værelset
    const side = (W - door) / 2;
    hut.add(
      box(W, 0.1, D, 0xc49a6c, x0, 0.05, 0),
      wall(W, H, T, x0, H / 2, -D / 2 + T / 2),
      wall(T, H, D, 2 + W - T / 2, H / 2, 0),
      wall(side, H, T, 2 + side / 2, H / 2, D / 2 - T / 2),
      wall(side, H, T, 2 + W - side / 2, H / 2, D / 2 - T / 2),
      box(door, 0.4, T, 0x8b5a2b, x0, H - 0.2, D / 2 - T / 2),
      box(1, 0.08, 0.8, 0x8b5a2b, x0, 0.75, -0.8),          // bord
      box(0.1, 0.7, 0.1, 0x6b4423, x0 - 0.4, 0.37, -1.1),
      box(0.1, 0.7, 0.1, 0x6b4423, x0 + 0.4, 0.37, -1.1),
      box(0.1, 0.7, 0.1, 0x6b4423, x0 - 0.4, 0.37, -0.5),
      box(0.1, 0.7, 0.1, 0x6b4423, x0 + 0.4, 0.37, -0.5),
      box(0.4, 0.4, 0.4, 0x8b5a2b, x0, 0.2, 0.1),            // skammel
      box(1.6, 0.03, 1.2, 0xc0392b, x0, 0.11, 0.6),          // tæppe
    );
    const roof = box(W + 0.5, 0.15, D + 0.6, 0x5a3a1e, x0, H + 0.25, 0);
    roof.rotation.z = -0.15;
    hut.add(roof);
  }

  const needsShelter = () => (built ? null : 'Kræver shelteret');
  for (const [id, emoji, name, text, add] of [
    ['shelterLamp', '🏮', 'Lampe på shelteret', 'Lyser ved døren, så du kan finde hjem om natten', addLamp],
    ['chest', '🧰', 'Kiste', 'Din stegte mad bliver ikke dårlig om natten', addChest],
    ['biggerShelter', '🏡', 'Større shelter', 'Et værelse mere, og du vågner udhvilet og løber hurtigere', addRoom],
  ]) {
    game.shop.addItem({
      id,
      category: 'lejr',
      emoji,
      name,
      basePrice: config.prices[id],
      requires: needsShelter,
      levels: [{ text }],
      onBuy(level, { loading }) {
        add();
        if (!loading) game.message(`${emoji} ${name}: købt!`);
      },
    });
  }

  // Stegte ænder bliver dårlige om natten, hvis man ikke har en kiste
  game.on('morning', () => {
    const cooked = game.state.cooked;
    if (cooked === 0 || game.shop.has('chest')) return;
    const spoiled = Math.ceil(cooked / 2);
    game.state.cooked -= spoiled;
    setTimeout(() => game.message(`🤢 ${spoiled} stykker stegt mad blev dårlige i nat`), 2500);
  });

  function sleep() {
    sleeping = true;
    game.sleeping = true;
    hud.fade(true);
    game.message('💤 Zzz...');
    setTimeout(() => {
      game.dayNight.skipToMorning();
      game.player.teleport(pos.x, pos.z + 0.5, Math.PI);   // vågner og kigger ud ad døren
      hud.fade(false);
      if (game.shop.has('biggerShelter')) {
        game.player.boost(cfg.restedBoost, cfg.restedSeconds);
        game.message('⚡ Du er udhvilet og løber hurtigere!');
      }
      sleeping = false;
      game.sleeping = false;
    }, 2500);
  }

  game.on('nightfall', () => {
    if (!built) setTimeout(() => game.message('🏠 Køb et shelter, så du kan sove!'), 2500);
  });

  return {
    position: pos,
    basketPosition,
    addBasket,
    // Selve hytten (til ting der skal stå inde i den, fx trofæer)
    get hut() { return hut; },
    get built() { return built; },

    update() {
      if (lampLight) lampLight.intensity = 4 * (1 - game.dayNight.light);
      if (!built || sleeping || !game.isPlayerNear(bedPos, 1.8)) return;
      if (game.dayNight.isNight) {
        hud.setPrompt('Tryk <b>E</b> for at sove til i morgen 😴');
        if (game.input.consume('KeyE')) sleep();
      } else {
        hud.setPrompt('Du kan sove, når det bliver nat 🌙');
      }
    },
  };
}
