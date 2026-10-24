import * as THREE from 'three';
import { box, pivot } from './models.js';

// Kæledyr:
//  ugle  - sidder på skulderen og siger til, når der er dyr i nærheden om natten
//  falk  - tryk Y, så fanger den en flyvende fugl for dig
//  hvalp - vokser op og bliver hund nummer 3
const DIRECTIONS = ['nord', 'nordøst', 'øst', 'sydøst', 'syd', 'sydvest', 'vest', 'nordvest'];

function makeOwl() {
  const g = new THREE.Group();
  g.add(
    box(0.22, 0.28, 0.2, 0x8a6a45, 0, 0.14, 0),
    box(0.2, 0.18, 0.18, 0x9a7a55, 0, 0.36, 0.01),
    box(0.06, 0.06, 0.02, 0xffd23a, -0.05, 0.38, 0.1),
    box(0.06, 0.06, 0.02, 0xffd23a, 0.05, 0.38, 0.1),
    box(0.03, 0.04, 0.03, 0x333333, 0, 0.33, 0.11),
    box(0.04, 0.06, 0.03, 0x5a4a35, -0.07, 0.47, 0),
    box(0.04, 0.06, 0.03, 0x5a4a35, 0.07, 0.47, 0),
  );
  return g;
}

function makeFalcon() {
  const g = new THREE.Group();
  const wingL = pivot(-0.1, 0.18, 0, box(0.45, 0.03, 0.2, 0x5a4a3a, -0.22, 0, 0));
  const wingR = pivot(0.1, 0.18, 0, box(0.45, 0.03, 0.2, 0x5a4a3a, 0.22, 0, 0));
  g.add(
    box(0.18, 0.18, 0.36, 0x6a5a4a, 0, 0.18, 0),
    box(0.14, 0.14, 0.14, 0xe8e0d0, 0, 0.3, 0.17),
    box(0.04, 0.04, 0.06, 0xf2c22b, 0, 0.28, 0.26),
    box(0.12, 0.04, 0.2, 0x5a4a3a, 0, 0.16, -0.24),
    wingL,
    wingR,
  );
  g.userData.wings = [wingL, wingR];
  return g;
}

export function createPets(game) {
  const { config, scene, shop, input, sound, player } = game;

  // --- Ugle ---
  let owl = null;
  let owlTimer = 5;

  function nearestAnimal() {
    const p = player.position;
    const list = [];
    for (const a of game.wildlife.list) if (a.area === game.area && a.state !== 'ground' && a.state !== 'soar') list.push({ name: config.foods[a.type]?.name, pos: a.mesh.position });
    if (game.bear.bear && game.area.id === 'forest') list.push({ name: 'bjørn', pos: game.bear.bear.mesh.position });
    if (game.fox.fox) list.push({ name: 'ræv', pos: game.fox.fox.mesh.position });
    let best = null;
    let bestD = 80;
    for (const a of list) {
      const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z);
      if (d < bestD && d > 8) {
        best = a;
        bestD = d;
      }
    }
    if (!best) return null;
    const bearing = Math.atan2(best.pos.x - p.x, -(best.pos.z - p.z));
    const dir = DIRECTIONS[(Math.round(bearing / (Math.PI / 4)) + 8) % 8];
    return `${best.name} mod ${dir} (${Math.round(bestD)} m)`;
  }

  // --- Falk ---
  let falcon = null;
  let hunt = null;     // { target, from, t }
  let falconReady = 0;
  const shoulder = new THREE.Vector3();

  function flyingBirds() {
    const birds = [];
    for (const d of game.ducks.list) if (d.state === 'flying') birds.push(d);
    for (const a of game.wildlife.list) if (a.area === game.area && a.state === 'fly') birds.push(a);
    return birds;
  }

  function sendFalcon() {
    if (game.time < falconReady) {
      game.message(`🦅 Falken hviler sig. Klar om ${Math.ceil(falconReady - game.time)} sekunder`);
      return;
    }
    const look = new THREE.Vector3();
    game.camera.getWorldDirection(look);
    let target = null;
    let best = -Infinity;
    for (const b of flyingBirds()) {
      const to = b.mesh.position.clone().sub(player.position);
      if (to.length() > 70) continue;
      const score = to.normalize().dot(look);
      if (score > best) {
        best = score;
        target = b;
      }
    }
    if (!target) {
      game.message('🦅 Der er ingen flyvende fugle i nærheden');
      return;
    }
    falcon.getWorldPosition(shoulder);
    scene.attach(falcon);
    hunt = { target, from: shoulder.clone(), t: 0, back: false };
    sound.screech();
    game.message('🦅 Falken letter!');
  }

  // --- Hvalp ---
  let puppy = null;
  let puppyAge = 0;
  let grown = false;
  const puppyPos = new THREE.Vector3();

  function makePuppy() {
    const g = new THREE.Group();
    const fur = 0xe8d0a0;
    g.add(
      box(0.42, 0.38, 0.8, fur, 0, 0.55, 0),
      box(0.4, 0.38, 0.4, fur, 0, 0.85, 0.45),
      box(0.12, 0.24, 0.16, 0xb59060, -0.22, 0.8, 0.42),
      box(0.12, 0.24, 0.16, 0xb59060, 0.22, 0.8, 0.42),
      box(0.1, 0.08, 0.06, 0x222222, 0, 0.8, 0.68),
      box(0.14, 0.4, 0.14, fur, -0.15, 0.2, 0.28),
      box(0.14, 0.4, 0.14, fur, 0.15, 0.2, 0.28),
      box(0.14, 0.4, 0.14, fur, -0.15, 0.2, -0.28),
      box(0.14, 0.4, 0.14, fur, 0.15, 0.2, -0.28),
      box(0.08, 0.08, 0.3, fur, 0, 0.7, -0.5),
    );
    return g;
  }
  const PUPPY_COLORS = [0xe8d0a0, 0xb59060, 0xf2e0c0];

  function growUp() {
    grown = true;
    if (puppy) scene.remove(puppy);
    puppy = null;
    game.dogs.addDog(config.dog.puppyName, PUPPY_COLORS);
  }

  game.on('morning', () => {
    if (!puppy) return;
    puppyAge++;
    puppy.scale.setScalar(0.55 + puppyAge * 0.15);
    if (puppyAge >= 3) {
      growUp();
      setTimeout(() => game.message(`🐕 ${config.dog.puppyName} er blevet stor og kan nu hente vildt!`), 3000);
    }
  });

  const items = [
    ['owl', '🦉', 'Ugle', config.prices.owl, 3, 'Sidder på din skulder og siger til, når der er dyr i nærheden om natten', () => {
      owl = makeOwl();
      owl.position.set(0.42, 1.48, 0.05);
      player.figure.add(owl);
    }],
    ['falcon', '🦅', 'Falk', config.prices.falcon, 5, 'Tryk Y, så fanger falken den flyvende fugl, du kigger efter', () => {
      falcon = makeFalcon();
      falcon.position.set(-0.42, 1.48, 0.05);
      player.figure.add(falcon);
    }],
    ['puppy', '🐶', `Hvalpen ${config.dog.puppyName}`, config.prices.puppy, 2, 'En lille hvalp, der vokser op på 3 dage og bliver din tredje hund', () => {
      puppy = makePuppy();
      puppy.scale.setScalar(0.55);
      puppyPos.copy(player.position);
      scene.add(puppy);
    }],
  ];
  for (const [id, emoji, name, price, minLevel, text, build] of items) {
    shop.addItem({
      id,
      category: 'hund',
      emoji,
      name,
      basePrice: price,
      minLevel,
      requires: id === 'puppy' ? () => (game.dogs.owned ? null : `Kræver hunden ${config.dog.name}`) : undefined,
      levels: [{ text }],
      onBuy(level, { loading }) {
        build();
        if (!loading) game.message(`${emoji} ${name}: velkommen!`);
      },
    });
  }

  game.remember('pets', {
    save: () => ({ puppyAge, grown }),
    load(data) {
      puppyAge = data.puppyAge ?? 0;
      if (data.grown) growUp();
      else if (puppy) puppy.scale.setScalar(0.55 + puppyAge * 0.15);
    },
  });

  return {
    update(dt) {
      // Uglen tuder om natten, når der er dyr i nærheden
      if (owl) {
        owl.rotation.y = Math.sin(game.time * 0.7) * 0.6;
        owlTimer -= dt;
        if (owlTimer <= 0 && game.dayNight.isNight) {
          owlTimer = 15;
          const found = nearestAnimal();
          if (found) {
            sound.hoot();
            game.message(`🦉 Uhuu! Der er en ${found}`);
          }
        }
      }

      // Falken
      if (falcon) {
        if (input.wasPressed('KeyY') && !hunt) sendFalcon();
        if (hunt) {
          const [wl, wr] = falcon.userData.wings;
          const flap = Math.sin(game.time * 20) * 0.8;
          wl.rotation.z = flap;
          wr.rotation.z = -flap;
          hunt.t += dt / 1.2;
          const goal = hunt.back ? player.position.clone().setY(player.position.y + 1.7) : hunt.target.mesh.position;
          falcon.position.lerpVectors(hunt.from, goal, Math.min(1, hunt.t));
          falcon.lookAt(goal);
          if (hunt.t >= 1) {
            if (!hunt.back) {
              // Fang fuglen
              if (hunt.target.state === 'flying' || hunt.target.state === 'fly') {
                game.hitTarget(hunt.target, 'falcon');
                if (hunt.target.health > 0) game.hitTarget(hunt.target, 'falcon');   // gæs skal rammes to gange
                game.message('🦅 Falken fangede fuglen!');
              }
              hunt.back = true;
              hunt.from = falcon.position.clone();
              hunt.t = 0;
            } else {
              player.figure.attach(falcon);
              falcon.position.set(-0.42, 1.48, 0.05);
              falcon.rotation.set(0, 0, 0);
              wl.rotation.z = wr.rotation.z = 0;
              hunt = null;
              falconReady = game.time + 20;
            }
          }
        }
      }

      // Hvalpen tumler efter dig
      if (puppy && !grown) {
        const p = player.position;
        const d = Math.hypot(p.x - puppyPos.x, p.z - puppyPos.z);
        if (d > 30) puppyPos.set(p.x + 2, 0, p.z + 2);
        else if (d > 2) {
          const speed = d > 6 ? 9 : 5;
          puppyPos.x += ((p.x - puppyPos.x) / d) * speed * dt;
          puppyPos.z += ((p.z - puppyPos.z) / d) * speed * dt;
          puppy.rotation.y = Math.atan2(p.x - puppyPos.x, p.z - puppyPos.z);
        }
        puppyPos.y = game.groundHeight(puppyPos.x, puppyPos.z) + Math.abs(Math.sin(game.time * 10)) * (d > 2 ? 0.12 : 0);
        puppy.position.copy(puppyPos);
      }
    },
  };
}
