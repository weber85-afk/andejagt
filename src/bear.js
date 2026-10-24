import * as THREE from 'three';
import { box, pivot } from './models.js';
import { makeMarker } from './ducks.js';

// Bjørnen: kommer en gang imellem i Storskoven. Kun riflen kan bide på den.
// Kommer man for tæt på, løber den efter én. Fanger den én, vælter man og mister sit vildt.

function makeBear() {
  const fur = 0x5a3a22;
  const dark = 0x3e2716;
  const g = new THREE.Group();
  const legs = [];
  for (const [x, z] of [[-0.5, 0.75], [0.5, 0.75], [-0.5, -0.75], [0.5, -0.75]]) {
    const leg = pivot(x, 0.9, z, box(0.42, 0.9, 0.45, dark, 0, -0.45, 0));
    legs.push(leg);
    g.add(leg);
  }
  const head = new THREE.Group();
  head.position.set(0, 1.55, 1.25);
  head.add(
    box(0.8, 0.72, 0.7, fur),
    box(0.42, 0.32, 0.36, 0x8a6a45, 0, -0.12, 0.45),
    box(0.16, 0.1, 0.06, 0x111111, 0, -0.02, 0.64),
    box(0.08, 0.08, 0.02, 0x111111, -0.2, 0.12, 0.36),
    box(0.08, 0.08, 0.02, 0x111111, 0.2, 0.12, 0.36),
    box(0.2, 0.2, 0.12, dark, -0.32, 0.42, 0),
    box(0.2, 0.2, 0.12, dark, 0.32, 0.42, 0),
  );
  g.add(box(1.4, 1.15, 2.2, fur, 0, 1.35, 0), box(1.2, 0.5, 0.6, fur, 0, 1.8, 0.6), head);
  return { mesh: g, legs, head };
}

export function createBear(game) {
  const { config, scene, sound, effects, state, hud } = game;
  const cfg = config.bear;
  const forest = game.areas.forest;
  let bear = null;
  let timer = cfg.firstBearAfter;
  const toPoint = new THREE.Vector3();

  function spawn() {
    const model = makeBear();
    const p = game.player.position;
    let x = p.x;
    let z = p.z;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      x = p.x + Math.cos(a) * (55 + Math.random() * 25);
      z = p.z + Math.sin(a) * (55 + Math.random() * 25);
      if (game.areaAt(x, z) === forest && !game.isInWater(x, z)) break;
    }
    model.mesh.position.set(x, game.groundHeight(x, z), z);
    scene.add(model.mesh);
    // En sjælden gang er det kæmpebjørnen: større, stærkere og et særligt trofæ
    const giant = Math.random() < cfg.giantChance;
    if (giant) model.mesh.scale.setScalar(1.6);
    bear = { ...model, giant, state: 'wander', health: giant ? cfg.giantHealth : cfg.health, heading: Math.random() * 6.3, phase: 0, roarTimer: 0 };
    sound.roar(giant ? 1 : 0.4);
    game.message(giant ? '🐻 Jorden ryster... det er KÆMPEBJØRNEN!' : '🐻 Du hører en bjørn brumme i skoven...');
  }

  function remove() {
    scene.remove(bear.mesh);
    if (bear.marker) scene.remove(bear.marker);
    bear = null;
    timer = cfg.minTime + Math.random() * (cfg.maxTime - cfg.minTime);
  }

  let lastWarning = -10;
  function charge() {
    if (bear.state === 'charge') return;
    bear.state = 'charge';
    if (game.time - lastWarning > 5) {
      lastWarning = game.time;
      sound.roar(0.9);
      game.message('🐻 Bjørnen har set dig! Løb!');
    }
  }

  // Bjørnen fangede spilleren
  function knockDown() {
    if (game.sleeping) return;   // allerede væltet
    bear.state = 'wander';
    game.sleeping = true;
    hud.fade(true);
    const lost = game.bagCount();
    setTimeout(() => {
      state.bag = {};
      // Vågn op ved bilen
      const car = game.car.position;
      const where = game.areaAt(car.x, car.z) === forest ? car : forest.parking;
      game.player.teleport(where.x + 2.5, where.z + 2.5);
      // Bjørnen går sin vej
      const p = bear.mesh.position;
      p.x += (p.x - where.x) > 0 ? 50 : -50;
      game.clampToArea(p, 10);
      hud.fade(false);
      game.sleeping = false;
      game.message(lost ? '🐻 Bjørnen væltede dig og tog dit vildt!' : '🐻 Bjørnen væltede dig! Pas på næste gang');
    }, 1500);
  }

  game.targets.push({
    findHits(ray, range) {
      if (!bear || bear.state === 'dead' || bear.state === 'dying') return [];
      const p = toPoint.copy(bear.mesh.position);
      p.y += 1.3;
      const along = p.clone().sub(ray.origin).dot(ray.direction);
      const r = bear.giant ? 2.5 : 1.6;
      if (along > 0 && along < range && ray.distanceSqToPoint(p) < r * r) return [{ target: bear, along }];
      return [];
    },
    hit(target, gun) {
      if (gun !== 'bigRifle') {
        game.message('🐻 Kuglen preller af! Du skal bruge riflen');
        charge();
        return;
      }
      bear.health--;
      effects.burst(bear.mesh.position.clone().setY(bear.mesh.position.y + 1.5), { count: 12, colors: [0x5a3a22, 0x3e2716], size: 0.2, speed: 3, up: 2, gravity: 8, life: 1 });
      if (bear.health > 0) {
        sound.roar(1);
        game.message(`🐻 Ramt! ${bear.health} skud mere`);
        charge();
        return;
      }
      bear.state = 'dying';
      bear.phase = 0;
      sound.roar(0.6);
      state.trophies.bears = (state.trophies.bears || 0) + 1;
      if (bear.giant) {
        state.trophies.giantBears = (state.trophies.giantBears || 0) + 1;
        state.points += cfg.giantBonus;
        setTimeout(() => game.message(`🏆 Du nedlagde KÆMPEBJØRNEN! +${cfg.giantBonus} ekstra ⭐`), 1500);
      }
      game.message(`🐻 Du nedlagde bjørnen! +${config.foods.bear.shotPoints}`);
      game.emit('animalHit', { type: 'bear' });
    },
  });

  return {
    get bear() { return bear; },
    spawn,

    update(dt) {
      const inForest = game.area === forest;
      if (!bear) {
        if (inForest && !game.dayNight.isNight) {
          timer -= dt;
          if (timer <= 0) spawn();
        }
        return;
      }
      if (!inForest) return;

      const p = bear.mesh.position;
      const player = game.player.position;
      const distance = Math.hypot(p.x - player.x, p.z - player.z);
      const safe = game.tower?.isOnTop || game.car.inCar;
      bear.phase += dt;

      if (bear.state === 'dying') {
        bear.mesh.rotation.z = Math.min(Math.PI / 2, bear.phase * 2);
        if (bear.phase > 1) {
          bear.state = 'dead';
          bear.marker = makeMarker();
          bear.marker.scale.setScalar(1.5);
          scene.add(bear.marker);
        }
        return;
      }
      if (bear.state === 'dead') {
        bear.marker.position.set(p.x, p.y + 2.6 + Math.sin(game.time * 4) * 0.2, p.z);
        bear.marker.rotation.y += dt * 2;
        if (distance < 2.8 && !game.player.vehicle) {
          game.addToBag('bear', bear.giant ? 3 : 1);
          game.message('🍖 Du fik bjørnekød og et bjørneskind!');
          game.emit('pickedUp', { type: 'bear' });
          remove();
        } else if (distance < 6) {
          hud.setPrompt('Gå hen til bjørnen for at tage kødet 🍖');
        }
        return;
      }

      const notice = cfg.noticeDistance * (game.stealth ? 0.5 : 1);   // kamuflage hjælper
      if (bear.state === 'wander' && distance < notice && !safe) charge();
      if (bear.state === 'charge' && (distance > cfg.noticeDistance * 1.8 || safe)) {
        bear.state = 'wander';
        game.message('🐻 Bjørnen gav op');
      }

      let spd = cfg.walkSpeed;
      if (bear.state === 'charge') {
        spd = cfg.chargeSpeed;
        bear.heading = Math.atan2(player.x - p.x, player.z - p.z);
        bear.roarTimer -= dt;
        if (bear.roarTimer <= 0) {
          bear.roarTimer = 3;
          sound.roar(0.7);
        }
        if (distance < cfg.attackDistance) knockDown();
      } else if (Math.random() < dt * 0.3) {
        bear.heading += (Math.random() - 0.5) * 2;
      }

      if (p.distanceTo(bear.lastTrack ??= p.clone()) > 1.6) {
        game.tracks.add(p.x, p.z, bear.heading, 'bear');
        bear.lastTrack.copy(p);
      }
      const nx = p.x + Math.sin(bear.heading) * spd * dt;
      const nz = p.z + Math.cos(bear.heading) * spd * dt;
      if (game.isInWater(nx, nz)) {
        bear.heading += Math.PI;
      } else {
        p.x = nx;
        p.z = nz;
      }
      game.pushOut(p, 1);
      game.clampToArea(p, 10);
      p.y = game.groundHeight(p.x, p.z);
      bear.mesh.rotation.y = bear.heading;
      const swing = Math.sin(bear.phase * spd * 1.5) * 0.5;
      bear.legs.forEach((leg, i) => { leg.rotation.x = i % 3 === 0 ? swing : -swing; });
      bear.head.rotation.x = Math.sin(bear.phase * 2) * 0.08;
    },
  };
}
