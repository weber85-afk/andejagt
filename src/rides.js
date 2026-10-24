import * as THREE from 'three';
import { box, pivot } from './models.js';

// Hest, ATV og snescooter: kald dem frem med J (hvor som helst), og tryk E for at stige på/af.
function makeHorse() {
  const g = new THREE.Group();
  const brown = 0x8a5a2b;
  const dark = 0x3a2a1a;
  const legs = [];
  for (const [x, z] of [[-0.25, 0.65], [0.25, 0.65], [-0.25, -0.65], [0.25, -0.65]]) {
    const leg = pivot(x, 1.0, z, box(0.18, 1.0, 0.2, brown, 0, -0.5, 0), box(0.2, 0.12, 0.22, dark, 0, -0.98, 0));
    legs.push(leg);
    g.add(leg);
  }
  const neck = box(0.35, 0.9, 0.4, brown, 0, 1.75, 0.95);
  neck.rotation.x = 0.5;
  const head = box(0.32, 0.35, 0.75, brown, 0, 2.15, 1.35);
  g.add(
    box(0.75, 0.75, 1.8, brown, 0, 1.35, 0),
    neck,
    head,
    box(0.08, 0.6, 0.5, dark, 0, 2.0, 0.8),              // manke
    box(0.12, 0.7, 0.12, dark, 0, 1.35, -0.98),          // hale
    box(0.8, 0.12, 0.7, 0x8a2a1a, 0, 1.78, 0.05),        // sadel
    box(0.06, 0.06, 0.06, 0x111111, -0.17, 2.22, 1.5),
    box(0.06, 0.06, 0.06, 0x111111, 0.17, 2.22, 1.5),
  );
  return { mesh: g, legs, seat: 1.6 };
}

function makeAtv() {
  const g = new THREE.Group();
  const wheels = [];
  for (const [x, z] of [[-0.65, 0.65], [0.65, 0.65], [-0.65, -0.65], [0.65, -0.65]]) {
    const w = new THREE.Group();
    w.position.set(x, 0.35, z);
    w.add(box(0.35, 0.7, 0.7, 0x222222));
    wheels.push(w);
    g.add(w);
  }
  g.add(
    box(1.0, 0.45, 1.7, 0x3a7a3a, 0, 0.75, 0),
    box(0.6, 0.2, 0.8, 0x222222, 0, 1.05, -0.2),
    box(1.0, 0.06, 0.06, 0x333333, 0, 1.25, 0.6),
    box(0.06, 0.4, 0.06, 0x333333, 0, 1.05, 0.6),
    box(1.2, 0.08, 0.5, 0x2a5a2a, 0, 0.98, 0.75),
    box(1.2, 0.08, 0.5, 0x2a5a2a, 0, 0.98, -0.75),
  );
  return { mesh: g, wheels, seat: 0.85 };
}

function makeSnowmobile() {
  const g = new THREE.Group();
  g.add(
    box(0.9, 0.5, 1.6, 0xf2c22b, 0, 0.55, 0.2),
    box(0.6, 0.25, 0.9, 0x222222, 0, 0.88, -0.25),
    box(0.8, 0.4, 0.06, 0x8ad8ff, 0, 1.0, 0.75),
    box(0.7, 0.35, 1.2, 0x333333, 0, 0.2, -0.5),            // larvebånd
    box(0.15, 0.06, 1.0, 0x555555, -0.4, 0.05, 1.0),        // ski
    box(0.15, 0.06, 1.0, 0x555555, 0.4, 0.05, 1.0),
    box(0.8, 0.06, 0.06, 0x333333, 0, 1.05, 0.55),
  );
  return { mesh: g, seat: 0.75 };
}

const MAKERS = { horse: makeHorse, atv: makeAtv, snowmobile: makeSnowmobile };

export function createRides(game) {
  const { config, scene, shop, input, hud, sound, player } = game;
  const rides = {};   // id -> { model, pos, heading, speed }
  let lastSummoned = null;

  function ensure(id) {
    if (rides[id]) return rides[id];
    const model = MAKERS[id]();
    model.mesh.visible = false;
    scene.add(model.mesh);
    rides[id] = { id, model, pos: new THREE.Vector3(), heading: 0, speed: 0, phase: 0 };
    return rides[id];
  }

  function place(r) {
    r.pos.y = game.groundHeight(r.pos.x, r.pos.z);
    r.model.mesh.position.copy(r.pos);
    r.model.mesh.rotation.y = r.heading;
  }

  function onSnow(p) {
    return game.seasons.isWinter || (game.area.id === 'mountain' && p.y > config.mountain.snowLine - 2);
  }

  function summon() {
    const owned = Object.keys(config.rides).filter((id) => shop.has(id));
    if (!owned.length) {
      game.message('Du har ikke noget at ride eller køre på endnu. Se i butikken!');
      return;
    }
    const id = owned[(owned.indexOf(lastSummoned) + 1) % owned.length];
    lastSummoned = id;
    const r = ensure(id);
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    r.pos.copy(player.position).addScaledVector(right, 2.5);
    game.pushOut(r.pos, 1);
    r.heading = player.yaw + Math.PI;
    r.speed = 0;
    r.model.mesh.visible = true;
    place(r);
    if (id === 'horse') sound.happy();
    game.message(`${config.rides[id].emoji} ${config.rides[id].name} er her! Tryk E for at stige på`);
  }

  function vehicleFor(r) {
    const cfg = config.rides[r.id];
    return {
      showRider: true,
      cameraDistance: 6,
      drive(dt) {
        const gas = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
        const steer = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
        let top = cfg.speed;
        if (r.id === 'snowmobile' && !onSnow(r.pos)) top = cfg.slowSpeed;
        if (gas > 0) r.speed = Math.min(top, r.speed + 10 * dt);
        else if (gas < 0) r.speed = Math.max(-4, r.speed - 12 * dt);
        else r.speed *= 1 - Math.min(1, dt * 2);
        if (Math.abs(r.speed) > top) r.speed = Math.sign(r.speed) * top;
        const turn = steer * 2.2 * dt * Math.min(1, Math.abs(r.speed) / 3 + (r.id === 'horse' ? 0.4 : 0));
        r.heading += turn;
        player.addYaw(turn);

        const old = r.pos.clone();
        r.pos.x += Math.sin(r.heading) * r.speed * dt;
        r.pos.z += Math.cos(r.heading) * r.speed * dt;
        const before = r.pos.clone();
        game.pushOut(r.pos, 0.9);
        if (r.pos.distanceTo(before) > 0.01) r.speed *= 0.6;
        // Hesten kan gå i lavt vand, maskinerne kan ikke
        if (game.isDeepWater(r.pos.x, r.pos.z) || (r.id !== 'horse' && game.isInWater(r.pos.x, r.pos.z))) {
          r.pos.copy(old);
          r.speed = 0;
        }
        game.clampToArea(r.pos, 2);
        place(r);
        r.phase += dt * Math.abs(r.speed);
        if (r.model.legs) {
          const swing = Math.sin(r.phase * 1.2) * Math.min(0.8, Math.abs(r.speed) / 6);
          r.model.legs.forEach((leg, i) => { leg.rotation.x = i % 3 === 0 ? swing : -swing; });
        }
        r.model.wheels?.forEach((w) => { w.rotation.x += r.speed * dt / 0.35; });
        player.position.set(r.pos.x, r.pos.y + r.model.seat - 0.8, r.pos.z);
      },
    };
  }

  let riding = null;
  function mount(r) {
    riding = r;
    const v = vehicleFor(r);
    player.setVehicle(v);
    player.addYaw(r.heading + Math.PI - player.yaw);
    v.drive(0);
  }
  function dismount() {
    const r = riding;
    riding = null;
    player.setVehicle(null);
    const right = new THREE.Vector3(Math.cos(r.heading), 0, -Math.sin(r.heading));
    player.teleport(r.pos.x + right.x * 1.5, r.pos.z + right.z * 1.5);
    r.speed = 0;
  }

  for (const [id, cfg] of Object.entries(config.rides)) {
    shop.addItem({
      id,
      category: 'skov',
      emoji: cfg.emoji,
      name: cfg.name,
      basePrice: cfg.price,
      minLevel: cfg.minLevel,
      levels: [{ text: `${cfg.text}. Tryk J for at kalde den frem` }],
      onBuy(level, { loading }) {
        if (!loading) {
          lastSummoned = null;
          game.message(`${cfg.emoji} Tryk J for at kalde din ${cfg.name.toLowerCase()} frem`);
        }
      },
    });
  }

  return {
    get riding() { return riding; },

    update() {
      if (input.wasPressed('KeyJ') && !player.vehicle) summon();
      if (riding) {
        if (player.vehicle?.showRider !== true) {
          riding = null;
          return;
        }
        if (Math.abs(riding.speed) < 4 && input.consume('KeyE')) dismount();
        return;
      }
      if (player.vehicle) return;
      const r = Object.values(rides).find((x) => x.model.mesh.visible && game.isPlayerNear(x.pos, 2.6));
      if (r) {
        hud.setPrompt(`Tryk <b>E</b> for at stige på ${config.rides[r.id].emoji}`);
        if (input.consume('KeyE')) mount(r);
      }
    },
  };
}
