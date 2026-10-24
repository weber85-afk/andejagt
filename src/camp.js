import * as THREE from 'three';
import { box } from './models.js';

// Ting til lejren: jagtskjul ved søen, båd og flagstang.
export function createCamp(game) {
  const { config, scene, shop, hud, input, player, ducks } = game;
  const lake = config.world.lakePosition;
  const lakeRadius = config.world.lakeRadius;

  // --- Jagtskjul ---
  const hidePos = new THREE.Vector3(config.hide.position.x, 0, config.hide.position.z);
  let hideBuilt = false;

  function buildHide() {
    if (hideBuilt) return;
    hideBuilt = true;
    const hide = new THREE.Group();
    hide.position.copy(hidePos);
    hide.rotation.y = Math.atan2(lake.x - hidePos.x, lake.z - hidePos.z);   // åbningen vender mod søen (+Z)
    const reed = 0x9a9a4a;
    for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) hide.add(box(0.12, 2.4, 0.12, 0x6b4423, x, 1.2, z));
    hide.add(
      box(2.3, 1.6, 0.12, reed, 0, 0.8, -1.1),       // bagvæg
      box(0.12, 1.6, 2.3, reed, -1.1, 0.8, 0),       // sider
      box(0.12, 1.6, 2.3, reed, 1.1, 0.8, 0),
      box(2.3, 1.0, 0.12, reed, 0, 0.5, 1.1),        // lav forvæg man kan skyde hen over
      box(2.6, 0.12, 2.6, 0x6b7a3a, 0, 2.45, 0),     // tag
    );
    for (let i = 0; i < 9; i++) {
      const tuft = box(0.15, 0.6 + (i % 3) * 0.2, 0.15, 0x7a8a3a, -1 + i * 0.25, 1.1, 1.18);
      tuft.rotation.z = (i % 2 ? 1 : -1) * 0.2;
      hide.add(tuft);
    }
    scene.add(hide);
  }

  shop.addItem({
    id: 'hide',
    category: 'lejr',
    emoji: '🌿',
    name: 'Jagtskjul ved søen',
    basePrice: config.prices.hide,
    levels: [{ text: 'Når du står i skjulet, flyver ænderne lavere over søen' }],
    onBuy(level, { loading }) {
      buildHide();
      if (!loading) game.message('🌿 Jagtskjulet står ved søen');
    },
  });

  // --- Båd ---
  let boat = null;
  const boatPos = new THREE.Vector3(config.boat.position.x, game.waterLevel, config.boat.position.z);
  let boatYaw = 0;

  function buildBoat() {
    if (boat) return;
    boat = new THREE.Group();
    const wood = 0x9b6a3b;
    boat.add(
      box(1.3, 0.2, 2.6, 0x7a4b25, 0, 0.1, 0),       // bund
      box(0.12, 0.45, 2.6, wood, -0.65, 0.3, 0),     // sider
      box(0.12, 0.45, 2.6, wood, 0.65, 0.3, 0),
      box(1.3, 0.45, 0.12, wood, 0, 0.3, 1.3),
      box(0.9, 0.4, 0.5, wood, 0, 0.3, -1.45),       // spids
      box(1.2, 0.08, 0.35, 0x5a3a1e, 0, 0.4, 0.3),   // bænk
    );
    boat.position.copy(boatPos);
    scene.add(boat);
  }

  shop.addItem({
    id: 'boat',
    category: 'lejr',
    emoji: '⛵',
    name: 'Båd',
    basePrice: config.prices.boat,
    levels: [{ text: 'Sejl ud på søen. Gå hen til båden og tryk E' }],
    onBuy(level, { loading }) {
      buildBoat();
      if (!loading) game.message('⛵ Båden ligger ved søen');
    },
  });

  const boatVehicle = {
    speed: config.boat.speed,
    seatHeight: game.waterLevel + 0.15,
    // Hold båden inde på søen
    constrain(p) {
      const dx = p.x - lake.x;
      const dz = p.z - lake.z;
      const d = Math.hypot(dx, dz);
      const max = lakeRadius - 1.3;
      if (d > max) {
        p.x = lake.x + (dx / d) * max;
        p.z = lake.z + (dz / d) * max;
      }
    },
  };

  function distanceFromLakeCenter(p) {
    return Math.hypot(p.x - lake.x, p.z - lake.z);
  }

  function updateBoat() {
    if (!boat) return;
    let inBoat = player.vehicle === boatVehicle;
    if (inBoat && game.frozen) {
      // Søen frøs til, mens man sejlede
      player.setVehicle(null);
      inBoat = false;
    }
    if (inBoat) {
      boatPos.set(player.position.x, game.waterLevel, player.position.z);
      boatYaw += (player.yaw - boatYaw) * 0.1;
      const nearShore = distanceFromLakeCenter(player.position) > lakeRadius - 2.5;
      hud.setPrompt(nearShore ? 'Tryk <b>E</b> for at gå i land' : '⛵ Sejl med WASD');
      if (nearShore && input.consume('KeyE')) {
        // Gå i land lige ud for båden
        const dx = player.position.x - lake.x;
        const dz = player.position.z - lake.z;
        const d = Math.hypot(dx, dz);
        player.setVehicle(null);
        player.teleport(lake.x + (dx / d) * (lakeRadius + 1.2), lake.z + (dz / d) * (lakeRadius + 1.2));
      }
    } else if (game.isPlayerNear(boatPos, 2.8) && !player.vehicle && game.frozen) {
      hud.setPrompt('❄️ Søen er frosset. Båden må vente til foråret');
    } else if (game.isPlayerNear(boatPos, 2.8) && !player.vehicle) {
      hud.setPrompt('Tryk <b>E</b> for at sejle ⛵');
      if (input.consume('KeyE')) {
        player.teleport(boatPos.x, boatPos.z);
        player.setVehicle(boatVehicle);
        boatYaw = player.yaw;
      }
    }
    boat.position.set(boatPos.x, game.waterLevel - 0.05 + Math.sin(game.time * 1.5) * 0.04, boatPos.z);
    boat.rotation.y = boatYaw;
    boat.rotation.z = Math.sin(game.time * 1.1) * 0.03;
  }

  // --- Flagstang ---
  let flag = null;
  const flagPos = config.flag.position;

  function buildFlag() {
    if (flag) return;
    const pole = new THREE.Group();
    pole.position.set(flagPos.x, 0, flagPos.z);
    pole.add(box(0.12, 6, 0.12, 0xeeeeee, 0, 3, 0), box(0.22, 0.22, 0.22, 0xf2c22b, 0, 6.1, 0));
    game.colliders.push({ x: flagPos.x, z: flagPos.z, r: 0.2 });

    const canvas = document.createElement('canvas');
    canvas.width = 222;
    canvas.height = 168;
    const ctx = canvas.getContext('2d');
    const [bg, fg] = config.flag.colors;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (config.flag.cross) {
      ctx.fillStyle = fg;
      ctx.fillRect(66, 0, 24, canvas.height);
      ctx.fillRect(0, 72, canvas.width, 24);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.PlaneGeometry(1.9, 1.4, 12, 4);
    geometry.translate(0.95, 0, 0);
    flag = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide }));
    flag.position.set(0.06, 5.2, 0);
    flag.userData.base = geometry.attributes.position.array.slice();
    pole.add(flag);
    scene.add(pole);
  }

  shop.addItem({
    id: 'flag',
    category: 'lejr',
    emoji: '🚩',
    name: 'Flagstang',
    basePrice: config.prices.flag,
    levels: [{ text: 'Dit eget flag ved bålet (farverne står i config.js)' }],
    onBuy(level, { loading }) {
      buildFlag();
      if (!loading) game.message('🚩 Flaget er hejst!');
    },
  });

  return {
    update() {
      // Står spilleren i jagtskjulet?
      const hidden = hideBuilt && game.isPlayerNear(hidePos, 1.3);
      if (hidden !== ducks.mods.hidden) {
        ducks.mods.hidden = hidden;
        if (hidden) ducks.retarget();
      }
      if (hidden) hud.setPrompt('🌿 Du er skjult. Ænderne flyver lavere over søen');

      updateBoat();

      // Flaget vajer i vinden
      if (flag) {
        const pos = flag.geometry.attributes.position;
        const base = flag.userData.base;
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3];
          pos.array[i * 3 + 2] = Math.sin(x * 2.5 - game.time * 5) * 0.12 * x;
        }
        pos.needsUpdate = true;
      }
    },
  };
}
