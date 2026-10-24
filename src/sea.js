import * as THREE from 'three';
import { box, signPost } from './models.js';

// Havet: en mole ud i vandet og en fiskekutter man kan sejle rundt i (og fiske fra).
export function createSea(game) {
  const { config, scene, shop, input, hud, player } = game;
  const area = game.areas.sea;
  const cfg = config.sea;
  const c = area.center;
  const pier = area.pier;

  // Molen
  const deck = new THREE.Group();
  const length = pier.maxZ - pier.minZ;
  deck.add(box(pier.maxX - pier.minX, 0.2, length, 0x8b6a45, 0, 0.6, 0, 'planks'));
  for (let z = -length / 2 + 2; z < length / 2; z += 4) {
    for (const x of [-1.3, 1.3]) deck.add(box(0.25, 2.6, 0.25, 0x5a3a1e, x, -0.5, z, 'bark'));
  }
  deck.position.set((pier.minX + pier.maxX) / 2, 0, (pier.minZ + pier.maxZ) / 2);
  scene.add(deck);

  // Skilte
  const parkingSign = signPost(['🌊 Havet', 'Gå ud på molen'], { width: 2, height: 0.7 });
  parkingSign.position.set(area.parking.x + 3, game.groundHeight(area.parking.x + 3, area.parking.z + 6), area.parking.z + 6);
  scene.add(parkingSign);
  const mountainSign = signPost(['⛰️ Fjeldet', 'Pas på, det er koldt!'], { width: 2, height: 0.7 });
  const mp = game.areas.mountain.parking;
  mountainSign.position.set(mp.x - 4, game.groundHeight(mp.x - 4, mp.z - 4), mp.z - 4);
  scene.add(mountainSign);

  // Fiskekutteren
  let cutter = null;
  const boatPos = new THREE.Vector3(c.x + cfg.pier.x + 4, game.waterLevel, pier.maxZ - 3);
  let boatYaw = Math.PI;

  function buildCutter() {
    if (cutter) return;
    cutter = new THREE.Group();
    cutter.add(
      box(2.6, 1.0, 6, 0x2f5f9a, 0, 0.3, 0),                // skrog
      box(2.7, 0.15, 6.1, 0xf2f2f2, 0, 0.85, 0),            // ræling
      box(2.4, 0.1, 5.8, 0x8b6a45, 0, 0.8, 0, 'planks'),    // dæk
      box(1.6, 1.4, 1.6, 0xf2f2f2, 0, 1.55, -1.2),          // styrehus
      box(1.65, 0.45, 1.65, 0x2a4a6a, 0, 1.75, -1.2),       // vinduer
      box(1.8, 0.12, 1.8, 0xd8323c, 0, 2.3, -1.2),          // tag
      box(0.12, 3, 0.12, 0x5a3a1e, 0, 2.3, 1.4),            // mast
      box(1.2, 0.8, 0.05, 0xd8323c, 0.6, 3.2, 1.4),         // flag
    );
    scene.add(cutter);
  }

  const vehicle = {
    speed: cfg.cutterSpeed,
    seatHeight: game.waterLevel + 0.85,
    cameraDistance: 8,
    // Kutteren skal blive ude på havet
    constrain(p) {
      game.clampToArea(p, 3);
      for (let i = 0; i < 20 && !game.isDeepWater(p.x, p.z); i++) p.z += 0.5;
    },
  };

  shop.addItem({
    id: 'cutter',
    category: 'skov',
    emoji: '🚢',
    name: 'Fiskekutter',
    basePrice: cfg.cutterPrice,
    requires: () => (shop.has('car') ? null : 'Kræver bilen'),
    levels: [{ text: 'Sejl ud på havet og fang kæmpefisk. Den ligger ved molen' }],
    onBuy(level, { loading }) {
      buildCutter();
      if (!loading) game.message('🚢 Fiskekutteren ligger ved molen ved Havet');
    },
  });

  return {
    update() {
      if (!cutter || game.area !== area) return;
      const inBoat = player.vehicle === vehicle;
      if (inBoat) {
        boatPos.set(player.position.x, game.waterLevel, player.position.z);
        boatYaw += (player.yaw - boatYaw) * 0.05;
        const nearPier = Math.hypot(boatPos.x - (c.x + cfg.pier.x), boatPos.z - pier.maxZ) < 8;
        hud.setPrompt(nearPier ? 'Tryk <b>E</b> for at gå op på molen' : '🚢 Sejl med WASD · fisk med 4');
        if (nearPier && input.consume('KeyE')) {
          player.setVehicle(null);
          player.teleport(c.x + cfg.pier.x, pier.maxZ - 2);
        }
      } else if (!player.vehicle && game.isPlayerNear(boatPos, 4.5)) {
        hud.setPrompt('Tryk <b>E</b> for at sejle med fiskekutteren 🚢');
        if (input.consume('KeyE')) {
          player.teleport(boatPos.x, boatPos.z);
          player.setVehicle(vehicle);
        }
      }
      cutter.position.set(boatPos.x, game.waterLevel - 0.1 + Math.sin(game.time * 1.2) * 0.12, boatPos.z);
      cutter.rotation.y = boatYaw;
      cutter.rotation.z = Math.sin(game.time * 0.9) * 0.04;
      cutter.rotation.x = Math.sin(game.time * 0.7) * 0.03;
    },
  };
}
