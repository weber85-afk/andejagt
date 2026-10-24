import * as THREE from 'three';
import { box, pivot } from './models.js';

// Ænderne: de flyver rundt, falder ned når de bliver ramt, og kan samles op.

export function makeDuckModel(golden = false) {
  const duck = new THREE.Group();
  duck.rotation.order = 'YXZ';

  const brown = golden ? 0xf2c22b : 0x8a5a2b;
  const wingColor = golden ? 0xe0a800 : 0x6b4423;

  duck.add(
    box(0.6, 0.45, 0.9, brown),                            // krop
    box(0.5, 0.3, 0.3, golden ? 0xd89a00 : 0x5a3a1e, 0, 0.1, -0.5),   // hale
    box(0.36, 0.06, 0.36, 0xffffff, 0, 0.2, 0.42),         // hvid ring om halsen
    box(0.34, 0.34, 0.34, golden ? 0xffd84a : 0x2e7d32, 0, 0.38, 0.45),   // hoved
    box(0.18, 0.08, 0.26, 0xf2a01b, 0, 0.34, 0.72),        // næb
    box(0.06, 0.06, 0.06, 0x111111, -0.17, 0.44, 0.52),    // øje
    box(0.06, 0.06, 0.06, 0x111111, 0.17, 0.44, 0.52),     // øje
  );

  const feet = new THREE.Group();
  feet.add(box(0.12, 0.2, 0.08, 0xf2801b, -0.15, -0.3, 0), box(0.12, 0.2, 0.08, 0xf2801b, 0.15, -0.3, 0));
  feet.visible = false;
  duck.add(feet);

  const wingL = pivot(-0.3, 0.12, 0, box(0.7, 0.08, 0.5, wingColor, -0.35, 0, 0), box(0.25, 0.09, 0.18, 0x2a5bd7, -0.3, 0, -0.1));
  const wingR = pivot(0.3, 0.12, 0, box(0.7, 0.08, 0.5, wingColor, 0.35, 0, 0), box(0.25, 0.09, 0.18, 0x2a5bd7, 0.3, 0, -0.1));
  duck.add(wingL, wingR);

  return { mesh: duck, wingL, wingR, feet };
}

// Gul pil der viser hvor noget ligger og kan samles op
export function makeMarker() {
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.6, 4),
    new THREE.MeshBasicMaterial({ color: 0xffe14d }),
  );
  marker.rotation.x = Math.PI;
  return marker;
}

export function createDucks(game) {
  const { config, scene, player, sound, effects, state } = game;
  const cfg = config.ducks;
  const half = config.world.size / 2;
  const lake = config.world.lakePosition;

  const ducks = [];
  let spawnTimer = 0;
  const desired = new THREE.Vector3();
  const toPoint = new THREE.Vector3();

  // Ting der ændrer hvordan ænderne flyver (sættes af fløjten, lokkeænderne og jagtskjulet)
  const mods = {
    extraFlying: 0,      // flere ænder på én gang
    lakeChance: 0.5,     // hvor tit de flyver hen over søen
    lureUntil: 0,        // fløjten: lokket indtil dette tidspunkt
    lurePosition: null,
    hidden: false,       // spilleren står i jagtskjulet
  };

  function randomTarget() {
    if (game.time < mods.lureUntil) {
      // Fløjten lokker dem lavt ned omkring spilleren
      const p = mods.lurePosition;
      return new THREE.Vector3(
        p.x + (Math.random() - 0.5) * 24,
        cfg.lowHeight + Math.random() * 3,
        p.z + (Math.random() - 0.5) * 24,
      );
    }
    const nearLake = Math.random() < mods.lakeChance;
    const spread = nearLake ? config.world.lakeRadius * 1.5 : half * 0.85;
    const cx = nearLake ? lake.x : 0;
    const cz = nearLake ? lake.z : 0;
    const low = nearLake && mods.hidden;
    const minY = low ? cfg.lowHeight : cfg.minHeight;
    const maxY = low ? cfg.minHeight + 1 : cfg.maxHeight;
    return new THREE.Vector3(
      cx + (Math.random() - 0.5) * 2 * spread,
      minY + Math.random() * (maxY - minY),
      cz + (Math.random() - 0.5) * 2 * spread,
    );
  }

  function spawn(inside = false) {
    const golden = Math.random() < cfg.goldenChance;
    const model = makeDuckModel(golden);
    if (inside) {
      model.mesh.position.copy(randomTarget());
    } else {
      // Kommer flyvende ind fra kanten af verden
      const angle = Math.random() * Math.PI * 2;
      const r = half + 15;
      model.mesh.position.set(Math.cos(angle) * r, cfg.maxHeight, Math.sin(angle) * r);
    }
    scene.add(model.mesh);

    const target = randomTarget();
    const duck = {
      ...model,
      type: 'duck',
      golden,
      speed: cfg.speed * (golden ? 1.6 : 1),
      state: 'flying',
      target,
      velocity: target.clone().sub(model.mesh.position).setLength(cfg.speed),
      flapPhase: Math.random() * 10,
      marker: null,
    };
    ducks.push(duck);
    return duck;
  }

  // Om natten flyver ænderne væk fra verden
  function leave(duck) {
    duck.leaving = true;
    const angle = Math.atan2(duck.mesh.position.z, duck.mesh.position.x);
    duck.target = new THREE.Vector3(Math.cos(angle) * (half + 40), cfg.maxHeight, Math.sin(angle) * (half + 40));
  }
  game.on('nightfall', () => ducks.filter((d) => d.state === 'flying').forEach(leave));

  // Andetræk: en stor flok flyver lavt hen over søen og videre
  let flockAt = -1;
  let dayClock = 0;
  game.on('morning', () => {
    dayClock = 0;
    flockAt = Math.random() < cfg.flockChance ? 20 + Math.random() * (config.dayNight.dayLength - 60) : -1;
  });

  function spawnFlock() {
    const angle = Math.random() * Math.PI * 2;
    const from = new THREE.Vector3(lake.x + Math.cos(angle) * (half - 5), cfg.minHeight + 1, lake.z + Math.sin(angle) * (half - 5));
    const to = new THREE.Vector3(lake.x - Math.cos(angle) * (half + 60), cfg.minHeight + 2, lake.z - Math.sin(angle) * (half + 60));
    const dir = to.clone().sub(from).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (let i = 0; i < cfg.flockSize; i++) {
      const duck = spawn();
      const row = Math.ceil(i / 2);
      duck.mesh.position.copy(from).addScaledVector(dir, -row * 1.8).addScaledVector(side, (i % 2 ? 1 : -1) * row * 1.4);
      duck.mesh.position.y += Math.random() * 2;
      duck.leaving = true;
      duck.target = to.clone().addScaledVector(side, (Math.random() - 0.5) * 10);
      duck.velocity.copy(dir).multiplyScalar(cfg.speed);
    }
    sound.quack(0.6);
    game.message('🦆🦆🦆 Andetræk! En stor flok ænder kommer!');
  }

  function remove(duck) {
    scene.remove(duck.mesh);
    if (duck.marker) scene.remove(duck.marker);
    ducks.splice(ducks.indexOf(duck), 1);
  }

  function restHeight(x, z) {
    return game.isInLake(x, z) ? game.waterLevel + 0.12 : game.groundHeight(x, z) + 0.26;
  }

  function land(duck) {
    const p = duck.mesh.position;
    duck.state = 'ground';
    p.y = restHeight(p.x, p.z);
    duck.mesh.rotation.set(0, Math.random() * Math.PI * 2, Math.PI);   // på ryggen!
    duck.wingL.rotation.z = 0.3;
    duck.wingR.rotation.z = -0.3;
    duck.feet.visible = true;
    duck.marker = makeMarker();
    scene.add(duck.marker);
    if (game.isInLake(p.x, p.z)) effects.splash(p);
    else effects.burst(p, { count: 6, colors: [0xffffff, 0x8a5a2b], size: 0.12, gravity: 3, life: 1 });
  }

  for (let i = 0; i < cfg.maxFlying; i++) spawn(true);

  // Ænderne kan skydes og samles op (se game.targets og game.pickups)
  game.targets.push({
    findHits(ray, range, radius = cfg.hitRadius) {
      const hits = [];
      for (const duck of ducks) {
        if (duck.state !== 'flying') continue;
        const p = duck.mesh.position;
        const along = toPoint.copy(p).sub(ray.origin).dot(ray.direction);
        if (along > 0 && along < range && ray.distanceSqToPoint(p) < radius * radius) hits.push({ target: duck, along });
      }
      return hits;
    },
    hit: (duck) => hitDuck(duck),
    owns: (d) => ducks.includes(d),
  });
  game.pickups.push({
    grounded: () => ducks.filter((d) => d.state === 'ground'),
    take: (duck) => remove(duck),
  });

  function hitDuck(duck) {
    duck.state = 'falling';
    duck.velocity.multiplyScalar(0.3);
    duck.velocity.y = 2;
    effects.feathers(duck.mesh.position);
    sound.hitQuack();
    if (duck.golden) {
      state.trophies.goldenDucks = (state.trophies.goldenDucks || 0) + 1;
      game.message(`🌟 DEN GYLDNE AND! +${cfg.goldenPoints}`);
    } else {
      game.message('🎯 Ramt!');
    }
    game.emit('animalHit', { type: 'duck', golden: duck.golden });
  }

  return {
    list: ducks,
    spawn,
    mods,

    // Giv alle flyvende ænder et nyt mål (fx når fløjten bruges)
    retarget() {
      for (const d of ducks) if (d.state === 'flying' && !d.leaving) d.target = randomTarget();
    },

    spawnFlock,

    update(dt) {
      dayClock += dt;
      if (flockAt >= 0 && dayClock >= flockAt && game.area === game.areas.home && !game.dayNight.isNight) {
        flockAt = -1;
        spawnFlock();
      }
      const flying = ducks.filter((d) => d.state === 'flying' && !d.leaving).length;
      const winterless = game.seasons?.isWinter ? 3 : 0;   // færre ænder om vinteren
      if (flying < cfg.maxFlying + mods.extraFlying - winterless && !game.dayNight.isNight) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawn();
          spawnTimer = cfg.spawnDelay;
        }
      }

      for (const duck of [...ducks]) {
        const p = duck.mesh.position;

        if (duck.state === 'flying') {
          desired.copy(duck.target).sub(p);
          if (duck.leaving) {
            if (Math.hypot(p.x, p.z) > half + 30) {
              remove(duck);
              continue;
            }
          } else if (desired.length() < 2) duck.target = randomTarget();
          desired.setLength(duck.speed);
          duck.velocity.lerp(desired, Math.min(1, dt * 1.2)).setLength(duck.speed);
          p.addScaledVector(duck.velocity, dt);

          const v = duck.velocity;
          duck.mesh.rotation.y = Math.atan2(v.x, v.z);
          duck.mesh.rotation.x = -Math.atan2(v.y, Math.hypot(v.x, v.z));
          duck.flapPhase += dt * 14;
          const flap = Math.sin(duck.flapPhase) * 0.8;
          duck.wingL.rotation.z = flap;
          duck.wingR.rotation.z = -flap;

          if (Math.random() < cfg.quackChance * dt) {
            const distance = p.distanceTo(player.position);
            sound.quack(0.5 * Math.max(0, 1 - distance / 60));
          }
        } else if (duck.state === 'falling') {
          duck.velocity.y -= 15 * dt;
          p.addScaledVector(duck.velocity, dt);
          duck.mesh.rotation.x += dt * 7;
          duck.mesh.rotation.z += dt * 4;
          duck.wingL.rotation.z = 1.2;
          duck.wingR.rotation.z = -1.2;
          if (p.y <= restHeight(p.x, p.z)) land(duck);
        } else if (duck.state === 'ground') {
          if (game.isInLake(p.x, p.z)) p.y = restHeight(p.x, p.z) + Math.sin(game.time * 2 + p.x) * 0.04;
          duck.marker.position.set(p.x, p.y + 1.3 + Math.sin(game.time * 4) * 0.2, p.z);
          duck.marker.rotation.y += dt * 2;

          // Saml anden op, når man går hen til den
          const dx = player.position.x - p.x;
          const dz = player.position.z - p.z;
          if (Math.hypot(dx, dz) < 1.6 && Math.abs(player.position.y - p.y) < 2) {
            remove(duck);
            game.addToBag('duck');
            sound.pickup();
            game.message('🦆 +1 and!');
            game.emit('pickedUp', { type: 'duck' });
          }
        }
      }
    },
  };
}
