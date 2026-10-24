import * as THREE from 'three';
import { box } from './models.js';

// Kano på åen i Storskoven og speedbåd ved molen ved Havet.
export function createBoats(game) {
  const { config, scene, shop, input, hud, player } = game;

  function makeCanoe() {
    const g = new THREE.Group();
    g.add(
      box(0.9, 0.3, 3.6, 0xd8692b, 0, 0.15, 0),
      box(0.1, 0.25, 3.4, 0xb5541f, -0.45, 0.35, 0),
      box(0.1, 0.25, 3.4, 0xb5541f, 0.45, 0.35, 0),
      box(0.8, 0.06, 0.3, 0x8b5a2b, 0, 0.35, -0.6),
      box(0.06, 0.06, 1.6, 0x8b5a2b, 0.4, 0.5, 0.2),   // paddel
    );
    return g;
  }
  function makeSpeedboat() {
    const g = new THREE.Group();
    g.add(
      box(1.8, 0.7, 4.5, 0xf2f2f2, 0, 0.2, 0),
      box(1.82, 0.2, 4.52, 0xd8323c, 0, 0.0, 0),
      box(1.2, 0.5, 1.2, 0xf2f2f2, 0, 0.5, 2.6),
      box(1.6, 0.5, 0.06, 0x8ad8ff, 0, 0.8, 0.6),
      box(1.4, 0.3, 1.2, 0x2a2a2a, 0, 0.65, -0.6),
      box(0.4, 0.6, 0.4, 0x333333, 0, 0.3, -2.4),       // motor
    );
    return g;
  }

  // Hvor bådene ligger
  const forest = game.areas.forest;
  const riverPoint = forest.water[0].points[3];
  const sea = game.areas.sea;

  const boats = [
    {
      id: 'canoe',
      make: makeCanoe,
      home: new THREE.Vector3(riverPoint.x, game.waterLevel, riverPoint.z),
      area: forest,
      seat: 0.3,
      // Kanoen skal blive i åen
      inWater: (p) => game.isInWater(p.x, p.z),
    },
    {
      id: 'speedboat',
      make: makeSpeedboat,
      home: new THREE.Vector3(sea.center.x + config.sea.pier.x - 5, game.waterLevel, sea.pier.maxZ - 4),
      area: sea,
      seat: 0.6,
      inWater: (p) => game.isDeepWater(p.x, p.z),
    },
  ];

  for (const b of boats) {
    const cfg = config.boats[b.id];
    b.cfg = cfg;
    b.pos = b.home.clone();
    b.yaw = 0;
    b.vehicle = {
      speed: cfg.speed,
      seatHeight: game.waterLevel + b.seat,
      cameraDistance: 7,
      constrain(p, old) {
        if (!b.inWater(p)) p.copy(old);
      },
    };
    shop.addItem({
      id: b.id,
      category: 'skov',
      emoji: cfg.emoji,
      name: cfg.name,
      basePrice: cfg.price,
      minLevel: cfg.minLevel,
      requires: () => (shop.has('car') ? null : 'Kræver bilen'),
      levels: [{ text: cfg.text }],
      onBuy(level, { loading }) {
        if (!b.mesh) {
          b.mesh = b.make();
          scene.add(b.mesh);
        }
        if (!loading) game.message(`${cfg.emoji} ${cfg.name} ligger klar!`);
      },
    });
  }

  // Find land lige ved siden af båden
  function shore(p) {
    for (let r = 1; r < 12; r += 0.5) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const x = p.x + Math.cos(a) * r;
        const z = p.z + Math.sin(a) * r;
        if (!game.isInWater(x, z) && !game.isDeepWater(x, z)) return { x, z };
      }
    }
    return null;
  }

  return {
    update() {
      for (const b of boats) {
        if (!b.mesh || game.area !== b.area) continue;
        const inBoat = player.vehicle === b.vehicle;
        if (inBoat) {
          b.pos.set(player.position.x, game.waterLevel, player.position.z);
          b.yaw += (player.yaw - b.yaw) * 0.08;
          const land = shore(b.pos);
          const nearLand = land && Math.hypot(land.x - b.pos.x, land.z - b.pos.z) < 3;
          hud.setPrompt(nearLand ? 'Tryk <b>E</b> for at gå i land' : `${b.cfg.emoji} Sejl med WASD`);
          if (nearLand && input.consume('KeyE')) {
            player.setVehicle(null);
            player.teleport(land.x, land.z);
          }
        } else if (!player.vehicle && game.isPlayerNear(b.pos, 6)) {
          if (b.id === 'canoe' && game.frozen) {
            hud.setPrompt('❄️ Åen er frosset');
          } else {
            hud.setPrompt(`Tryk <b>E</b> for at sejle i ${b.cfg.name.toLowerCase()}en ${b.cfg.emoji}`);
            if (input.consume('KeyE')) {
              player.teleport(b.pos.x, b.pos.z);
              player.setVehicle(b.vehicle);
            }
          }
        }
        b.mesh.position.set(b.pos.x, game.waterLevel - 0.05 + Math.sin(game.time * 1.4) * (b.id === 'speedboat' ? 0.08 : 0.03), b.pos.z);
        b.mesh.rotation.y = b.yaw;
      }
    },
  };
}
