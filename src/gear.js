import * as THREE from 'three';
import { makeDuckModel } from './ducks.js';

// Udstyr: andefløjte (Q), lokkeænder på søen og lommelygte (L).
export function createGear(game) {
  const { config, scene, shop, input, sound, ducks, camera } = game;
  const lake = config.world.lakePosition;

  // --- Andefløjte ---
  let whistleReady = 0;   // tidspunkt hvor fløjten kan bruges igen

  shop.addItem({
    id: 'whistle',
    category: 'udstyr',
    emoji: '🎵',
    name: 'Andefløjte',
    basePrice: config.prices.whistle,
    levels: [{ text: `Tryk Q, så kommer ænderne lavt ned til dig i ${config.whistle.duration} sekunder` }],
    onBuy(level, { loading }) {
      if (!loading) game.message('🎵 Tryk Q for at fløjte');
    },
  });

  function blowWhistle() {
    if (game.time < whistleReady) {
      game.message(`🎵 Fløjten er klar om ${Math.ceil(whistleReady - game.time)} sekunder`);
      return;
    }
    whistleReady = game.time + config.whistle.cooldown;
    ducks.mods.lureUntil = game.time + config.whistle.duration;
    ducks.mods.lurePosition = game.player.position.clone();
    ducks.retarget();
    sound.whistle();
    game.message('🎵 Ænderne kommer!');
  }

  // --- Hjortekald (C): lokker hjorte og vildsvin hen til én ---
  let callReady = 0;
  shop.addItem({
    id: 'deerCall',
    category: 'udstyr',
    emoji: '🎺',
    name: 'Hjortekald',
    basePrice: config.prices.deerCall,
    levels: [{ text: 'Tryk C, så kommer hjorte (og vildsvin!) hen mod dig' }],
    onBuy(level, { loading }) {
      if (!loading) game.message('🎺 Tryk C for hjortekaldet');
    },
  });

  // --- Lokkeænder ---
  const decoys = [];

  function placeDecoys() {
    if (decoys.length) return;
    ducks.mods.extraFlying += config.decoys.extraDucks;
    ducks.mods.lakeChance = 0.75;
    for (let i = 0; i < 4; i++) {
      const { mesh } = makeDuckModel();
      const a = 1.2 + i * 0.45;
      const r = config.world.lakeRadius - 3 - (i % 2) * 1.5;
      mesh.position.set(lake.x + Math.cos(a) * r, game.waterLevel + 0.15, lake.z + Math.sin(a) * r);
      mesh.rotation.y = i * 1.3;
      scene.add(mesh);
      decoys.push(mesh);
    }
  }

  shop.addItem({
    id: 'decoys',
    category: 'udstyr',
    emoji: '🪿',
    name: 'Lokkeænder',
    basePrice: config.prices.decoys,
    levels: [{ text: `Lokkeænder på søen, så der kommer ${config.decoys.extraDucks} ænder mere` }],
    onBuy(level, { loading }) {
      placeDecoys();
      if (!loading) game.message('🪿 Lokkeænderne svømmer på søen');
    },
  });

  // --- Lommelygte ---
  // Lygten sidder ved figurens hoved (ikke ved kameraet), så den ikke lyser figuren op bagfra
  const torch = new THREE.SpotLight(0xfff4d6, 0, 40, 0.45, 0.5, 1.2);
  scene.add(torch, torch.target);
  const lookDir = new THREE.Vector3();
  let torchOn = true;

  shop.addItem({
    id: 'flashlight',
    category: 'udstyr',
    emoji: '🔦',
    name: 'Lommelygte',
    basePrice: config.prices.flashlight,
    levels: [{ text: 'Lyser om natten. Tænd og sluk med L' }],
    onBuy(level, { loading }) {
      if (!loading) game.message('🔦 Lommelygten tænder selv om natten (L)');
    },
  });

  game.remember('gear', {
    save: () => ({ torchOn }),
    load(data) {
      torchOn = data.torchOn ?? true;
    },
  });

  return {
    update() {
      if (shop.has('whistle') && input.wasPressed('KeyQ')) blowWhistle();
      if (shop.has('deerCall') && input.wasPressed('KeyC')) {
        if (game.time < callReady) {
          game.message(`🎺 Kaldet er klar om ${Math.ceil(callReady - game.time)} sekunder`);
        } else {
          callReady = game.time + 60;
          sound.call();
          game.wildlife.lure(30);
          game.message('🎺 Hjortene kommer! Pas på vildsvinene...');
        }
      }

      for (const [i, d] of decoys.entries()) d.position.y = game.waterLevel + 0.15 + Math.sin(game.time * 1.5 + i) * 0.04;

      if (shop.has('flashlight') && input.wasPressed('KeyL')) {
        torchOn = !torchOn;
        game.message(torchOn ? '🔦 Lygten er tændt' : '🔦 Lygten er slukket');
      }
      const dark = 1 - game.dayNight.light;
      torch.intensity = shop.has('flashlight') && torchOn ? 14 * dark : 0;
      if (torch.intensity > 0) {
        const { player } = game;
        lookDir.set(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch));
        torch.position.copy(player.position).setY(player.position.y + config.player.eyeHeight - 0.2).addScaledVector(lookDir, 0.6);
        torch.target.position.copy(torch.position).addScaledVector(lookDir, 10);
      }
    },
  };
}
