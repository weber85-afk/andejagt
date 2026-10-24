import * as THREE from 'three';
import { box, glow } from './models.js';

// Grotten på Fjeldet: tænd de tre fakler inde i grotten (E), så åbner porten til skatten.
export function createCave(game) {
  const { config, scene, input, hud, sound, effects, state } = game;
  const mc = config.mountain.center;
  const pos = new THREE.Vector3(mc.x + config.mountain.cave.x, 0, mc.z + config.mountain.cave.z);
  pos.y = game.groundHeight(pos.x, pos.z);
  const W = 5;      // bredde indeni
  const L = 26;     // længde
  const H = 3.5;    // højde
  const T = 1.2;    // vægtykkelse

  const cave = new THREE.Group();
  cave.position.copy(pos);
  scene.add(cave);

  function wall(w, h, d, x, y, z) {
    cave.add(box(w, h, d, 0x7a7a76, x, y, z, 'stone'));
    game.colliders.push({ x: pos.x + x, z: pos.z + z, minX: pos.x + x - w / 2, maxX: pos.x + x + w / 2, minZ: pos.z + z - d / 2, maxZ: pos.z + z + d / 2 });
  }

  // Klippen med en gang ind i (indgangen vender mod +Z)
  wall(T, H, L, -W / 2 - T / 2, H / 2, -L / 2);
  wall(T, H, L, W / 2 + T / 2, H / 2, -L / 2);
  wall(W + T * 2, H, T, 0, H / 2, -L - T / 2);
  cave.add(box(W + T * 2 + 1, 1.5, L + 1, 0x6a6a66, 0, H + 0.75, -L / 2, 'stone'));   // loft
  for (let i = 0; i < 6; i++) {
    cave.add(box(3 + Math.random() * 3, 2 + Math.random() * 2, 4, 0x8a8a86, (i % 2 ? 1 : -1) * (W / 2 + T + 1.5), 1 + Math.random(), -i * 4.5 - 2, 'stone'));
  }
  cave.add(box(W + T * 2 + 2, 2, 2, 0x8a8a86, 0, H + 1.5, 0.5, 'stone'));   // over indgangen

  // Fakler
  const torches = [];
  const torchSpots = [[-W / 2 + 0.15, -6], [W / 2 - 0.15, -12], [-W / 2 + 0.15, -18]];
  for (const [x, z] of torchSpots) {
    const stick = box(0.12, 0.6, 0.12, 0x5a3a1e, x, 1.6, z);
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), glow(0xff8a2a, 2.5));
    flame.position.set(x, 2.05, z);
    flame.visible = false;
    const light = new THREE.PointLight(0xff9a4a, 0, 9, 1.5);
    light.position.set(x, 2.1, z);
    cave.add(stick, flame, light);
    torches.push({ x, z, flame, light, lit: false });
  }

  // Porten og skatten
  const gate = box(W, H, 0.4, 0x4a4a4a, 0, H / 2, -L + 3);
  cave.add(gate);
  const gateCollider = { x: pos.x, z: pos.z - L + 3, minX: pos.x - W / 2, maxX: pos.x + W / 2, minZ: pos.z - L + 2.8, maxZ: pos.z - L + 3.2 };
  game.colliders.push(gateCollider);
  const chest = new THREE.Group();
  chest.add(box(1, 0.6, 0.7, 0x7a4b25, 0, 0.3, 0, 'planks'), box(1.04, 0.15, 0.74, 0xf2c22b, 0, 0.65, 0));
  const shine = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), glow(0xffe14d, 3));
  shine.position.y = 1;
  chest.add(shine);
  chest.position.set(0, 0, -L + 1.2);
  cave.add(chest);
  let taken = false;

  // Flagermus
  const bats = [];
  for (let i = 0; i < 6; i++) {
    const bat = new THREE.Group();
    bat.add(box(0.1, 0.08, 0.12, 0x1a1a1a), box(0.4, 0.02, 0.12, 0x222222));
    cave.add(bat);
    bats.push(bat);
  }

  function openGate() {
    cave.remove(gate);
    const i = game.colliders.indexOf(gateCollider);
    if (i >= 0) game.colliders.splice(i, 1);
  }

  game.remember('cave', {
    save: () => ({ lit: torches.map((t) => t.lit), taken }),
    load(data) {
      data.lit?.forEach((lit, i) => {
        if (lit) light(torches[i], true);
      });
      if (torches.every((t) => t.lit)) openGate();
      taken = data.taken;
      if (taken) shine.visible = false;
    },
  });

  function light(t, quiet) {
    t.lit = true;
    t.flame.visible = true;
    t.light.intensity = 3;
    if (quiet) return;
    sound.sizzle();
    const left = torches.filter((x) => !x.lit).length;
    if (left) game.message(`🔥 Faklen er tændt! ${left} tilbage`);
    else {
      openGate();
      sound.medal();
      game.message('🚪 Porten åbnede sig! Find skatten inderst i grotten');
    }
  }

  const inside = (p) => p.x > pos.x - W / 2 - 0.5 && p.x < pos.x + W / 2 + 0.5 && p.z < pos.z && p.z > pos.z - L;

  return {
    get playerInside() { return inside(game.player.position); },

    update(dt) {
      const p = game.player.position;
      game.inCave = game.area.id === 'mountain' && inside(p);
      if (game.area.id !== 'mountain') return;
      bats.forEach((b, i) => {
        const t = game.time * 1.5 + i * 1.1;
        b.position.set(Math.sin(t) * 1.5, H - 0.6 + Math.sin(t * 3) * 0.2, -8 - i * 2.5 + Math.cos(t) * 1.5);
        b.children[1].scale.x = 0.6 + Math.abs(Math.sin(t * 12)) * 0.6;
      });
      if (!game.inCave) {
        if (game.isPlayerNear(pos, 5) && !game.player.vehicle) hud.setPrompt('⛰️ En grotte! Gå ind, hvis du tør 🦇');
        return;
      }
      const local = { x: p.x - pos.x, z: p.z - pos.z };
      const torch = torches.find((t) => !t.lit && Math.hypot(t.x - local.x, t.z - local.z) < 1.8);
      if (torch) {
        hud.setPrompt('Tryk <b>E</b> for at tænde faklen 🔥');
        if (input.consume('KeyE')) light(torch);
        return;
      }
      if (!taken && torches.every((t) => t.lit) && Math.hypot(local.x, local.z - (-L + 1.2)) < 2) {
        hud.setPrompt('Tryk <b>E</b> for at åbne skattekisten 💎');
        if (input.consume('KeyE')) {
          taken = true;
          shine.visible = false;
          state.points += config.mountain.caveTreasure;
          state.trophies.caveTreasure = 1;
          effects.burst(pos.clone().add(new THREE.Vector3(0, 1, -L + 1.2)), { count: 30, colors: [0xffe14d, 0xf2c22b, 0x6ad8ff], size: 0.15, speed: 4, up: 4, gravity: 6, life: 1.5 });
          sound.medal();
          game.message(`💎 Grottens skat! +${config.mountain.caveTreasure} ⭐`);
          game.emit('treasureFound', { prize: 'cave' });
        }
        return;
      }
      if (!torches.every((t) => t.lit)) hud.setPrompt('🕯️ Her er mørkt... find de tre fakler');
    },
  };
}
