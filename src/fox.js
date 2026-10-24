import * as THREE from 'three';
import { box } from './models.js';
import { makeCarcass } from './catalog.js';

// Ræven: lister ind i lejren og stjæler fra bunken ved bålet. Skyd den, før den slipper væk!
function makeFox() {
  const g = new THREE.Group();
  const orange = 0xd8692b;
  const legs = [];
  for (const [x, z] of [[-0.1, 0.25], [0.1, 0.25], [-0.1, -0.25], [0.1, -0.25]]) {
    const leg = box(0.08, 0.3, 0.08, 0x2a1a10, x, 0.15, z);
    legs.push(leg);
    g.add(leg);
  }
  g.add(
    box(0.3, 0.28, 0.75, orange, 0, 0.42, 0),
    box(0.26, 0.24, 0.26, orange, 0, 0.55, 0.45),
    box(0.12, 0.1, 0.16, 0xf2f2f2, 0, 0.48, 0.62),
    box(0.06, 0.06, 0.04, 0x111111, 0, 0.5, 0.71),
    box(0.07, 0.14, 0.05, orange, -0.08, 0.72, 0.42),
    box(0.07, 0.14, 0.05, orange, 0.08, 0.72, 0.42),
    box(0.16, 0.16, 0.55, orange, 0, 0.45, -0.6),
    box(0.17, 0.17, 0.15, 0xf2f2f2, 0, 0.45, -0.9),
  );
  return { mesh: g, legs };
}

export function createFox(game) {
  const { config, scene, sound, campfire } = game;
  const cfg = config.fox;
  const home = game.areas.home;
  let fox = null;
  let timer = cfg.minTime;
  const toPoint = new THREE.Vector3();

  function edgePoint() {
    const a = Math.random() * Math.PI * 2;
    const r = home.size / 2 - 3;
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  }

  function spawn() {
    const model = makeFox();
    const start = edgePoint();
    model.mesh.position.copy(start);
    scene.add(model.mesh);
    fox = { ...model, state: 'sneak', carrying: null, phase: 0, exit: edgePoint() };
    game.message('🦊 En ræv lister ind i lejren...');
    if (game.dogs.owned) setTimeout(() => sound.bark(0.5), 800);
  }

  function remove() {
    scene.remove(fox.mesh);
    fox = null;
    timer = cfg.minTime + Math.random() * (cfg.maxTime - cfg.minTime);
  }

  game.targets.push({
    findHits(ray, range, radius) {
      if (!fox || fox.state === 'dead') return [];
      const p = toPoint.copy(fox.mesh.position);
      p.y += 0.4;
      const along = p.clone().sub(ray.origin).dot(ray.direction);
      const r = Math.max(radius ?? 0, 0.9);
      if (along > 0 && along < range && ray.distanceSqToPoint(p) < r * r) return [{ target: fox, along }];
      return [];
    },
    hit() {
      fox.state = 'dead';
      fox.phase = 0;
      fox.mesh.rotation.z = Math.PI / 2;
      fox.mesh.position.y += 0.15;
      if (fox.carrying) {
        campfire.addToPile([fox.carrying]);
        game.message(`🦊 Ramt! Du reddede ${game.foodName(fox.carrying)}`);
      } else {
        game.message('🦊 Du ramte ræven!');
      }
      game.emit('animalHit', { type: 'fox' });
    },
  });

  return {
    get fox() { return fox; },
    spawn,

    update(dt) {
      if (!fox) {
        if (game.area === home && campfire.pile.length > 0) {
          timer -= dt;
          if (timer <= 0) spawn();
        }
        return;
      }
      fox.phase += dt;
      const p = fox.mesh.position;

      if (fox.state === 'dead') {
        if (fox.phase > 6) remove();
        return;
      }

      let goal;
      if (fox.state === 'sneak') {
        goal = campfire.pilePosition;
        if (Math.hypot(p.x - goal.x, p.z - goal.z) < 1) {
          const type = campfire.takeFromPile();
          if (type) {
            fox.carrying = type;
            const carcass = makeCarcass(type);
            carcass.scale.setScalar(0.45);
            carcass.position.set(0, 0.45, 0.75);
            fox.mesh.add(carcass);
            game.message(`🦊 Ræven stjal ${game.foodName(type)}! Skyd den!`);
          }
          fox.state = 'escape';
        }
      } else {
        goal = fox.exit;
        if (Math.hypot(p.x - goal.x, p.z - goal.z) < 2) {
          if (fox.carrying) game.message('🦊 Ræven slap væk...');
          remove();
          return;
        }
      }
      const speed = fox.state === 'sneak' ? cfg.speed * 0.5 : cfg.speed;
      const heading = Math.atan2(goal.x - p.x, goal.z - p.z);
      p.x += Math.sin(heading) * speed * dt;
      p.z += Math.cos(heading) * speed * dt;
      game.pushOut(p, 0.3);
      p.y = game.groundHeight(p.x, p.z);
      fox.mesh.rotation.y = heading;
      const swing = Math.sin(fox.phase * speed * 3) * 0.5;
      fox.legs.forEach((leg, i) => { leg.rotation.x = i % 3 === 0 ? swing : -swing; });
    },
  };
}
