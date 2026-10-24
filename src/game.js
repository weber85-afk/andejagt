import * as THREE from 'three';

// "game" er det fælles objekt, som alle dele af spillet kan se.
// Hver del (figuren, ænderne, bålet, ...) bliver lagt ind med game.add(),
// og så bliver dens update(dt) kaldt hver eneste frame.
export function createGame(config) {
  const listeners = {};

  const game = {
    config,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(config.camera.fov, innerWidth / innerHeight, 0.05, 700),
    paused: true,
    time: 0,

    // Det spilleren har samlet
    state: {
      bag: {},          // råt vildt i tasken, fx { duck: 2, fish: 1 }
      cooked: 0,        // stegt mad i tasken
      dishes: 0,        // retter fra gryden i tasken
      burnt: 0,
      points: 0,
      trophies: {},     // fx { bears: 1, goldenDucks: 2, biggestFish: 3.4 }
    },

    // Ting man kan skyde: { findHits(ray, range, radius), hit(target, gunId) }
    targets: [],
    // Ting der ligger på jorden og kan samles op: { grounded(), take(item) }
    pickups: [],

    addToBag(type, n = 1) {
      game.state.bag[type] = (game.state.bag[type] || 0) + n;
    },
    // Tager én ting af typen (eller den første der kan steges) ud af tasken
    takeFromBag(type) {
      const bag = game.state.bag;
      const t = type ?? Object.keys(bag).find((k) => bag[k] > 0 && !config.foods[k]?.ingredient);
      if (!t || !bag[t]) return null;
      bag[t]--;
      return t;
    },
    // Antal af en type, eller (uden type) alt i tasken der kan steges
    bagCount(type) {
      const bag = game.state.bag;
      if (type) return bag[type] || 0;
      return Object.entries(bag).filter(([k]) => !config.foods[k]?.ingredient).reduce((a, [, n]) => a + n, 0);
    },
    // "1 and", "3 ænder"
    foodName(type, n = 1) {
      const f = config.foods[type];
      return `${n} ${n === 1 ? f.name : f.plural}`;
    },

    // Ting man ikke kan gå igennem.
    // Runde (træstammer, sten): { x, z, r }
    // Firkantede (vægge): { x, z, minX, maxX, minZ, maxZ }
    colliders: [],

    systems: [],

    // Dele af spillet der skal huskes, når man gemmer (se save.js)
    saveables: {},
    remember(key, handlers) {
      game.saveables[key] = handlers;
    },

    add(name, system) {
      game[name] = system;
      game.systems.push(system);
      return system;
    },

    // Events: én del af spillet siger at noget skete, andre dele kan reagere.
    // fx game.emit('duckHit', { duck })  og  game.on('duckHit', ({ duck }) => ...)
    on(name, fn) {
      (listeners[name] ||= []).push(fn);
    },
    emit(name, data = {}) {
      for (const fn of listeners[name] || []) fn(data);
    },

    message(text) {
      game.emit('message', { text });
    },

    // Er spilleren tæt på et sted?
    isPlayerNear(pos, distance) {
      const p = game.player.position;
      return Math.hypot(p.x - pos.x, p.z - pos.z) < distance;
    },

    // Skubber en figur ud af træer, sten og vægge
    pushOut(position, radius) {
      for (const c of game.colliders) {
        if (c.r !== undefined) {
          const dx = position.x - c.x;
          const dz = position.z - c.z;
          const min = c.r + radius;
          const d = Math.hypot(dx, dz);
          if (d < min && d > 0.0001) {
            position.x = c.x + (dx / d) * min;
            position.z = c.z + (dz / d) * min;
          }
        } else if (
          position.x > c.minX - radius && position.x < c.maxX + radius &&
          position.z > c.minZ - radius && position.z < c.maxZ + radius
        ) {
          const left = position.x - (c.minX - radius);
          const right = c.maxX + radius - position.x;
          const back = position.z - (c.minZ - radius);
          const front = c.maxZ + radius - position.z;
          const min = Math.min(left, right, back, front);
          if (min === left) position.x -= left;
          else if (min === right) position.x += right;
          else if (min === back) position.z -= back;
          else position.z += front;
        }
      }
    },

    // groundHeight, isInWater, areaAt m.fl. kommer fra areas.js

    waterLevel: 0.06,
  };

  game.scene.add(game.camera);
  return game;
}
