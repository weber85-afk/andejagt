import * as THREE from 'three';
import { box, pivot } from './models.js';
import { makeMarker } from './ducks.js';

// Vilde dyr i Storskoven og på Fjeldet:
//  fasan  - letter når man kommer tæt på
//  hare   - løber i zigzag
//  gås    - flyver i flok højt oppe og skal rammes to gange
//  hjort  - stor og sky, kun riflen kan nedlægge den
//  vildsvin - løber efter én, hvis man kommer for tæt på
//  stenbuk - lever på Fjeldet
//  ørn    - svæver over Fjeldet (fredet, kan ikke skydes)

// Hvor mange af hvert dyr der er i hvert område
const POPULATION = {
  forest: { pheasant: 7, hare: 5, deer: 3, boar: 2 },
  mountain: { ibex: 6, hare: 2, eagle: 2 },
  sea: { gull: 6, hare: 2 },
};
const HIT_RADIUS = { pheasant: 1.1, hare: 1.0, goose: 1.5, deer: 1.6, boar: 1.3, ibex: 1.3 };
const TALL = { pheasant: 0.4, hare: 0.4, deer: 1.3, boar: 0.6, ibex: 0.9, goose: 0 };

function makePheasant() {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  const wingL = pivot(-0.2, 0.42, 0, box(0.5, 0.06, 0.4, 0x8a5a2b, -0.25, 0, 0));
  const wingR = pivot(0.2, 0.42, 0, box(0.5, 0.06, 0.4, 0x8a5a2b, 0.25, 0, 0));
  g.add(
    box(0.4, 0.35, 0.65, 0xa0522d, 0, 0.45, 0),
    box(0.22, 0.24, 0.22, 0x2e7d32, 0, 0.68, 0.36),
    box(0.12, 0.1, 0.06, 0xd8323c, 0, 0.66, 0.48),
    box(0.06, 0.05, 0.1, 0xf2c94c, 0, 0.62, 0.52),
    box(0.08, 0.06, 0.75, 0x7a4b25, 0, 0.55, -0.65),
    box(0.06, 0.28, 0.06, 0x8a6a45, -0.1, 0.14, 0),
    box(0.06, 0.28, 0.06, 0x8a6a45, 0.1, 0.14, 0),
    wingL,
    wingR,
  );
  return { mesh: g, wingL, wingR };
}

function makeHare() {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  const body = new THREE.Group();
  body.add(
    box(0.38, 0.36, 0.65, 0x9b7a55, 0, 0.32, 0),
    box(0.28, 0.28, 0.3, 0x9b7a55, 0, 0.5, 0.36),
    box(0.08, 0.38, 0.12, 0x8a6a45, -0.08, 0.8, 0.32),
    box(0.08, 0.38, 0.12, 0x8a6a45, 0.08, 0.8, 0.32),
    box(0.05, 0.05, 0.02, 0x111111, -0.12, 0.55, 0.5),
    box(0.05, 0.05, 0.02, 0x111111, 0.12, 0.55, 0.5),
    box(0.14, 0.14, 0.12, 0xffffff, 0, 0.38, -0.35),
    box(0.12, 0.16, 0.3, 0x8a6a45, -0.14, 0.12, -0.15),
    box(0.12, 0.16, 0.3, 0x8a6a45, 0.14, 0.12, -0.15),
  );
  g.add(body);
  return { mesh: g, body };
}

function makeBird(colors, size = 1) {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  const wingL = pivot(-0.3 * size, 0.1, 0, box(0.9 * size, 0.08, 0.55 * size, colors.wing, -0.45 * size, 0, 0));
  const wingR = pivot(0.3 * size, 0.1, 0, box(0.9 * size, 0.08, 0.55 * size, colors.wing, 0.45 * size, 0, 0));
  g.add(
    box(0.6 * size, 0.48 * size, 0.95 * size, colors.body),
    box(0.15 * size, 0.15 * size, 0.55 * size, colors.neck, 0, 0.1, 0.7 * size),
    box(0.22 * size, 0.2 * size, 0.25 * size, colors.head, 0, 0.12, 1.05 * size),
    box(0.1 * size, 0.06 * size, 0.15 * size, colors.beak, 0, 0.08, 1.22 * size),
    box(0.4 * size, 0.2 * size, 0.3 * size, colors.tail, 0, -0.05, -0.55 * size),
    wingL,
    wingR,
  );
  return { mesh: g, wingL, wingR };
}

// Firbenede dyr: hjort, vildsvin og stenbuk
function makeQuadruped(type) {
  const s = {
    deer: { body: [0.55, 0.65, 1.4], color: 0xa0703a, dark: 0x6b4a28, leg: 0.95, neck: true },
    boar: { body: [0.7, 0.65, 1.15], color: 0x4a3a30, dark: 0x2e241e, leg: 0.4, neck: false },
    ibex: { body: [0.5, 0.55, 1.0], color: 0x8a7a68, dark: 0x5a4e42, leg: 0.6, neck: true },
  }[type];
  const [w, h, d] = s.body;
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  const legs = [];
  for (const [x, z] of [[-w / 3, d / 2.8], [w / 3, d / 2.8], [-w / 3, -d / 2.8], [w / 3, -d / 2.8]]) {
    const leg = pivot(x, s.leg, z, box(0.14, s.leg, 0.16, s.dark, 0, -s.leg / 2, 0));
    legs.push(leg);
    g.add(leg);
  }
  const bodyY = s.leg + h / 2;
  g.add(box(w, h, d, s.color, 0, bodyY, 0));
  const head = new THREE.Group();
  if (s.neck) {
    g.add(box(0.22, 0.6, 0.25, s.color, 0, bodyY + 0.4, d / 2 - 0.05));
    head.position.set(0, bodyY + 0.7, d / 2 + 0.15);
  } else {
    head.position.set(0, bodyY - 0.05, d / 2 + 0.2);
  }
  head.add(box(0.3, 0.3, 0.45, s.color), box(0.04, 0.04, 0.02, 0x111111, -0.1, 0.06, 0.12), box(0.04, 0.04, 0.02, 0x111111, 0.1, 0.06, 0.12));
  if (type === 'deer') {
    for (const side of [-1, 1]) {
      head.add(box(0.06, 0.45, 0.06, 0xd8c8a0, side * 0.12, 0.38, -0.05));
      head.add(box(0.25, 0.06, 0.06, 0xd8c8a0, side * 0.22, 0.5, -0.05));
      head.add(box(0.06, 0.25, 0.06, 0xd8c8a0, side * 0.32, 0.62, -0.05));
    }
    g.add(box(0.2, 0.2, 0.08, 0xffffff, 0, bodyY + 0.1, -d / 2));
  } else if (type === 'boar') {
    head.add(box(0.2, 0.16, 0.12, 0x6a5a50, 0, -0.04, 0.27), box(0.04, 0.12, 0.04, 0xf2ead2, -0.1, 0.05, 0.22), box(0.04, 0.12, 0.04, 0xf2ead2, 0.1, 0.05, 0.22));
    g.add(box(0.12, 0.2, 0.9, 0x2e241e, 0, bodyY + h / 2 + 0.05, 0));   // børster på ryggen
  } else {
    for (const side of [-1, 1]) {
      const horn = box(0.07, 0.07, 0.5, 0x5a4e42, side * 0.08, 0.28, -0.15);
      horn.rotation.x = -0.6;
      head.add(horn);
    }
    head.add(box(0.12, 0.15, 0.08, 0xd8d0c0, 0, -0.18, 0.18));   // skæg
  }
  g.add(head);
  return { mesh: g, legs, head };
}

function makeModel(type) {
  if (type === 'pheasant') return makePheasant();
  if (type === 'hare') return makeHare();
  if (type === 'goose') return makeBird({ body: 0x9a9a9a, wing: 0x8a8a8a, neck: 0x222222, head: 0x222222, beak: 0x333333, tail: 0xeeeeee });
  if (type === 'eagle') return makeBird({ body: 0x5a3a22, wing: 0x4a2e1a, neck: 0x5a3a22, head: 0xf2f2f2, beak: 0xf2c22b, tail: 0xf2f2f2 }, 1.6);
  if (type === 'gull') return makeBird({ body: 0xf2f2f2, wing: 0xb8c0c8, neck: 0xf2f2f2, head: 0xf2f2f2, beak: 0xf2c22b, tail: 0x333333 }, 0.7);
  return makeQuadruped(type);
}

export function createWildlife(game) {
  const { config, scene, sound, effects, state, hud } = game;
  const animals = [];
  let gooseTimer = 10;
  let knockedDown = false;
  const toPoint = new THREE.Vector3();

  function randomGroundSpot(area, awayFrom, minDistance = 30) {
    const half = area.size / 2 - 8;
    for (let i = 0; i < 40; i++) {
      const x = area.center.x + (Math.random() - 0.5) * half * 2;
      const z = area.center.z + (Math.random() - 0.5) * half * 2;
      if (game.isInWater(x, z)) continue;
      if (awayFrom && Math.hypot(x - awayFrom.x, z - awayFrom.z) < minDistance) continue;
      return new THREE.Vector3(x, game.groundHeight(x, z), z);
    }
    return new THREE.Vector3(area.center.x, 0, area.center.z);
  }

  function spawn(type, area) {
    const model = makeModel(type);
    const pos = randomGroundSpot(area, game.player?.position);
    if (type === 'eagle') pos.y += 25 + Math.random() * 10;
    if (type === 'gull') pos.set(area.center.x + (Math.random() - 0.5) * 80, 8 + Math.random() * 6, area.center.z + 15 + Math.random() * 30);
    model.mesh.position.copy(pos);
    scene.add(model.mesh);
    animals.push({
      type, area, ...model,
      state: type === 'eagle' || type === 'gull' ? 'soar' : 'walk',
      health: type === 'boar' ? 2 : 1,
      heading: Math.random() * 6.3,
      timer: 0,
      velocity: new THREE.Vector3(),
      phase: Math.random() * 10,
      circle: pos.clone(),
      lastTrack: pos.clone(),
    });
  }

  // En flok gæs der flyver tværs over Storskoven
  function spawnGeese() {
    const forest = game.areas.forest;
    const c = forest.center;
    const half = forest.size / 2;
    const angle = Math.random() * Math.PI * 2;
    const start = new THREE.Vector3(c.x + Math.cos(angle) * (half + 30), 16 + Math.random() * 6, c.z + Math.sin(angle) * (half + 30));
    const dir = new THREE.Vector3(c.x - start.x + (Math.random() - 0.5) * 60, 0, c.z - start.z + (Math.random() - 0.5) * 60).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const model = makeModel('goose');
      const row = Math.ceil(i / 2);
      model.mesh.position.copy(start).addScaledVector(dir, -row * 2.2).addScaledVector(side, (i % 2 ? 1 : -1) * row * 1.8);
      model.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      scene.add(model.mesh);
      animals.push({ type: 'goose', area: forest, ...model, state: 'fly', health: 2, velocity: dir.clone().multiplyScalar(7), phase: Math.random() * 10, timer: 0 });
    }
    sound.honk();
  }

  function remove(a) {
    scene.remove(a.mesh);
    if (a.marker) scene.remove(a.marker);
    animals.splice(animals.indexOf(a), 1);
  }

  function kill(a) {
    a.state = 'falling';
    a.velocity.multiplyScalar(0.3);
    if (a.wingL) a.velocity.y = 1;
    if (a.wingL) effects.feathers(a.mesh.position);
    game.message(`🎯 Du ramte en ${config.foods[a.type].name}!`);
    game.emit('animalHit', { type: a.type });
  }

  function hit(a, gun) {
    if (a.type === 'deer' && gun !== 'bigRifle') {
      game.message('🦌 Hjorten er for stor! Du skal bruge riflen');
      flee(a);
      return;
    }
    a.health--;
    if (a.health > 0) {
      if (a.type === 'goose') effects.feathers(a.mesh.position);
      game.message(a.type === 'goose' ? '🪿 Gåsen er sej! Skyd igen!' : '🐗 Vildsvinet bliver vredt! Skyd igen!');
      if (a.type === 'boar') a.state = 'charge';
      return;
    }
    kill(a);
  }

  function flee(a) {
    a.state = 'flee';
    a.timer = 6;
  }

  // Vildsvinet væltede spilleren: man mister én ting fra tasken
  function knockDown() {
    if (knockedDown) return;
    knockedDown = true;
    game.sleeping = true;
    hud.fade(true);
    const lost = game.takeFromBag();
    setTimeout(() => {
      const p = game.player.position;
      game.player.teleport(p.x + 6, p.z + 6);
      hud.fade(false);
      game.sleeping = false;
      knockedDown = false;
      game.message(lost ? `🐗 Vildsvinet væltede dig og tog en ${config.foods[lost].name}!` : '🐗 Vildsvinet væltede dig!');
    }, 1200);
  }

  game.targets.push({
    findHits(ray, range, radius) {
      const hits = [];
      for (const a of animals) {
        if (a.state === 'falling' || a.state === 'ground' || a.state === 'soar') continue;
        const p = toPoint.copy(a.mesh.position);
        p.y += TALL[a.type] ?? 0;
        const along = p.clone().sub(ray.origin).dot(ray.direction);
        const r = Math.max(radius ?? 0, HIT_RADIUS[a.type]);
        if (along > 0 && along < range && ray.distanceSqToPoint(p) < r * r) hits.push({ target: a, along });
      }
      return hits;
    },
    hit: (a, gun) => hit(a, gun),
  });

  game.pickups.push({
    grounded: () => animals.filter((a) => a.state === 'ground'),
    take: (a) => remove(a),
  });

  // Skud (ikke buen) skræmmer dyrene i nærheden
  game.on('shot', ({ loud }) => {
    if (!loud) return;
    const p = game.player.position;
    for (const a of animals) {
      if (a.area !== game.area || a.state !== 'walk') continue;
      if (Math.hypot(a.mesh.position.x - p.x, a.mesh.position.z - p.z) > 45) continue;
      if (a.type === 'pheasant') {
        a.state = 'fly';
        a.timer = 4;
        a.velocity.set(Math.sin(a.heading) * 8, 5, Math.cos(a.heading) * 8);
      } else if (a.type !== 'boar') {
        flee(a);
      }
    }
  });
  let lureUntil = 0;

  // Fyld områderne med dyr
  for (const [areaId, counts] of Object.entries(POPULATION)) {
    const area = game.areas[areaId];
    if (!area) continue;
    for (const [type, n] of Object.entries(counts)) for (let i = 0; i < n; i++) spawn(type, area);
  }

  function land(a) {
    a.state = 'ground';
    const p = a.mesh.position;
    p.y = game.isInWater(p.x, p.z) ? game.waterLevel + 0.1 : game.groundHeight(p.x, p.z) + (a.type === 'goose' ? 0.3 : 0);
    a.mesh.rotation.set(0, a.mesh.rotation.y, Math.PI / 2);
    if (a.legs) p.y += 0.3;
    if (a.wingL) {
      a.wingL.rotation.z = 0.3;
      a.wingR.rotation.z = -0.3;
    }
    a.marker = makeMarker();
    scene.add(a.marker);
  }

  function walk(a, spd, dt) {
    const p = a.mesh.position;
    const nx = p.x + Math.sin(a.heading) * spd * dt;
    const nz = p.z + Math.cos(a.heading) * spd * dt;
    if (game.isInWater(nx, nz)) {
      a.heading += Math.PI;
    } else {
      p.x = nx;
      p.z = nz;
    }
    game.pushOut(p, 0.3);
    game.clampToArea(p, 8);
    p.y = game.groundHeight(p.x, p.z);
    a.mesh.rotation.y = a.heading;
    if (a.legs) {
      const swing = spd > 0.1 ? Math.sin(a.phase * spd * 2.5) * 0.6 : 0;
      a.legs.forEach((leg, i) => { leg.rotation.x = i % 3 === 0 ? swing : -swing; });
    }
    // Store dyr sætter spor
    if ((a.type === 'deer' || a.type === 'boar') && p.distanceTo(a.lastTrack) > 1.3) {
      game.tracks?.add(p.x, p.z, a.heading, a.type);
      a.lastTrack.copy(p);
    }
  }

  return {
    list: animals,

    // Hjortekaldet: hjorte og vildsvin går hen mod spilleren
    lure(seconds) {
      lureUntil = game.time + seconds;
    },

    update(dt) {
      const here = game.area;
      const stealth = game.stealth ? 0.5 : 1;   // kamuflage: dyrene opdager én senere
      const player = game.player.position;
      const hidden = game.tower?.isOnTop;          // på jagttårnet bliver dyrene ikke bange
      const safe = hidden || game.car?.inCar;

      // Hold bestanden oppe i området man er i
      const counts = POPULATION[here.id];
      if (counts) {
        for (const [type, n] of Object.entries(counts)) {
          const alive = animals.filter((a) => a.type === type && a.area === here && a.state !== 'ground').length;
          if (alive < n && Math.random() < dt * 0.05) spawn(type, here);
        }
      }
      if (here === game.areas.forest) {
        gooseTimer -= dt;
        if (gooseTimer <= 0 && !game.dayNight.isNight) {
          gooseTimer = 45 + Math.random() * 40;
          spawnGeese();
        }
      }

      for (const a of [...animals]) {
        if (a.area !== here) continue;
        const p = a.mesh.position;
        const distance = Math.hypot(p.x - player.x, p.z - player.z);
        a.phase += dt;

        if (a.state === 'falling') {
          a.velocity.y -= 15 * dt;
          p.addScaledVector(a.velocity, dt);
          if (a.wingL) a.mesh.rotation.x += dt * 6;
          if (p.y <= game.groundHeight(p.x, p.z) + 0.2 || !a.wingL) land(a);
          continue;
        }

        if (a.state === 'ground') {
          a.marker.position.set(p.x, p.y + 1.3 + (a.legs ? 0.8 : 0) + Math.sin(game.time * 4) * 0.2, p.z);
          a.marker.rotation.y += dt * 2;
          if (distance < (a.legs ? 2.4 : 1.6) && !game.player.vehicle) {
            remove(a);
            game.addToBag(a.type);
            sound.pickup();
            game.message(`${config.foods[a.type].emoji} +1 ${config.foods[a.type].name}!`);
            game.emit('pickedUp', { type: a.type });
          }
          continue;
        }

        if (a.type === 'goose') {
          p.addScaledVector(a.velocity, dt);
          const flap = Math.sin(a.phase * 8) * 0.7;
          a.wingL.rotation.z = flap;
          a.wingR.rotation.z = -flap;
          if (Math.hypot(p.x - here.center.x, p.z - here.center.z) > here.size / 2 + 60) remove(a);
          continue;
        }

        if (a.state === 'soar') {
          // Ørne og måger svæver i store cirkler (de er fredede)
          const radius = a.type === 'gull' ? 15 : 30;
          const angle = a.phase * (a.type === 'gull' ? 0.35 : 0.15);
          p.set(a.circle.x + Math.cos(angle) * radius, p.y, a.circle.z + Math.sin(angle) * radius);
          a.mesh.rotation.y = -angle;
          a.mesh.rotation.z = 0.3;
          a.wingL.rotation.z = Math.sin(a.phase * 0.8) * 0.15;
          a.wingR.rotation.z = -a.wingL.rotation.z;
          continue;
        }

        if (a.type === 'pheasant') {
          if (a.state === 'walk' && distance < 12 * stealth && !hidden) {
            // Fasanen letter!
            a.state = 'fly';
            a.timer = 4 + Math.random() * 3;
            const away = new THREE.Vector3(p.x - player.x, 0, p.z - player.z).normalize();
            a.velocity.set(away.x * 8, 5, away.z * 8);
            sound.flutter();
          }
          if (a.state === 'fly') {
            a.timer -= dt;
            a.velocity.y = a.timer > 2.5 ? 3 : a.timer > 0 ? 0 : -3;
            p.addScaledVector(a.velocity, dt);
            a.mesh.rotation.y = Math.atan2(a.velocity.x, a.velocity.z);
            const flap = Math.sin(a.phase * 25) * 0.9;
            a.wingL.rotation.z = flap;
            a.wingR.rotation.z = -flap;
            const ground = game.groundHeight(p.x, p.z);
            if (a.timer <= 0 && p.y <= ground + 0.05) {
              p.y = ground;
              a.state = 'walk';
              a.wingL.rotation.z = a.wingR.rotation.z = 0;
            }
            game.clampToArea(p, 8);
            continue;
          }
        }

        // Dyr der går rundt på jorden
        let spd = { hare: 1.5, pheasant: 0.8, deer: 1.2, boar: 1.5, ibex: 1 }[a.type];
        const awayFromPlayer = Math.atan2(p.x - player.x, p.z - player.z);

        if (a.type === 'boar') {
          if (a.state === 'walk' && distance < 14 * stealth && !safe && game.time > (a.calmUntil ?? 0)) {
            a.state = 'charge';
            a.timer = 8;
            sound.roar(0.3);
            game.message('🐗 Et vildsvin løber efter dig!');
          }
          if (a.state === 'charge') {
            a.timer -= dt;
            spd = 8.5;
            a.heading = Math.atan2(player.x - p.x, player.z - p.z);
            if (distance < 1.8 && !game.player.vehicle) {
              knockDown();
              a.state = 'walk';
              a.heading = awayFromPlayer;
              a.calmUntil = game.time + 15;   // giver dig en chance for at komme væk
            }
            if (a.timer <= 0 || safe) a.state = 'walk';
          }
        } else if (a.type !== 'pheasant') {
          const scare = { hare: 15, deer: 25, ibex: 20 }[a.type];
          const lured = a.type === 'deer' && game.time < lureUntil;
          if (distance < scare * stealth * (lured ? 0.4 : 1) && !hidden && a.state === 'walk') flee(a);
          if (a.state === 'flee') {
            a.timer -= dt;
            spd = { hare: 9, deer: 10, ibex: 7 }[a.type];
            a.heading = awayFromPlayer + (a.type === 'hare' ? Math.sin(a.phase * 4) * 0.8 : 0);
            if (a.timer <= 0) a.state = 'walk';
          }
        }
        if (a.type === 'hare') {
          a.body.position.y = Math.abs(Math.sin(a.phase * (spd > 2 ? 12 : 5))) * (spd > 2 ? 0.35 : 0.12);
        }
        if (game.time < lureUntil && (a.type === 'deer' || a.type === 'boar') && a.state === 'walk') {
          // Lokket af hjortekaldet
          a.heading = Math.atan2(player.x - p.x, player.z - p.z);
          spd = distance > 12 ? 2.5 : 0;
        } else if (a.state === 'walk' && Math.random() < dt * 0.4) {
          a.heading += (Math.random() - 0.5) * 2;
        }
        walk(a, spd, dt);
      }
    },
  };
}
