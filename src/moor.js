import * as THREE from 'three';
import { box, pivot } from './models.js';

// Mosen: små søer med mudder (man skal have gummistøvler for at gå i dem),
// frøer man kan fange og slippe fri, hejrer (fredede) og myg (køb myggebalsam!).
export function createMoor(game) {
  const { config, scene, shop, sound, effects } = game;
  const area = game.areas.moor;
  const cfg = config.moor;
  let warnTimer = 0;
  let mosquitoTimer = 0;

  // --- Frøer ---
  const frogs = [];
  function makeFrog() {
    const g = new THREE.Group();
    g.add(
      box(0.3, 0.16, 0.34, 0x4a9a3a, 0, 0.1, 0),
      box(0.08, 0.08, 0.08, 0xf2f2a0, -0.09, 0.2, 0.12),
      box(0.08, 0.08, 0.08, 0xf2f2a0, 0.09, 0.2, 0.12),
      box(0.1, 0.06, 0.16, 0x3a8a2a, -0.18, 0.04, -0.08),
      box(0.1, 0.06, 0.16, 0x3a8a2a, 0.18, 0.04, -0.08),
    );
    return g;
  }
  function placeFrog(frog) {
    const pond = area.water[Math.floor(Math.random() * area.water.length)];
    const a = Math.random() * Math.PI * 2;
    const r = pond.r + 0.8 + Math.random() * 2;
    frog.pos.set(pond.x + Math.cos(a) * r, 0, pond.z + Math.sin(a) * r);
  }
  for (let i = 0; i < cfg.frogs; i++) {
    const frog = { mesh: makeFrog(), pos: new THREE.Vector3(), hop: Math.random() * 3, heading: Math.random() * 6.3, jump: 0 };
    placeFrog(frog);
    scene.add(frog.mesh);
    frogs.push(frog);
  }

  // --- Hejrer ---
  const herons = [];
  function makeHeron() {
    const g = new THREE.Group();
    const wingL = pivot(-0.2, 1.1, 0, box(0.8, 0.05, 0.4, 0x8a8a90, -0.4, 0, 0));
    const wingR = pivot(0.2, 1.1, 0, box(0.8, 0.05, 0.4, 0x8a8a90, 0.4, 0, 0));
    g.add(
      box(0.05, 0.8, 0.05, 0xc8b070, -0.08, 0.4, 0),
      box(0.05, 0.8, 0.05, 0xc8b070, 0.08, 0.4, 0),
      box(0.35, 0.35, 0.7, 0x9a9aa0, 0, 1.05, 0),
      box(0.1, 0.6, 0.1, 0xe8e8e8, 0, 1.45, 0.3),
      box(0.16, 0.14, 0.2, 0xe8e8e8, 0, 1.78, 0.36),
      box(0.04, 0.04, 0.35, 0xe8c040, 0, 1.76, 0.6),
      box(0.17, 0.04, 0.12, 0x222222, 0, 1.86, 0.32),
      wingL,
      wingR,
    );
    return { mesh: g, wingL, wingR };
  }
  function heronSpot() {
    const pond = area.water[Math.floor(Math.random() * area.water.length)];
    const a = Math.random() * Math.PI * 2;
    return new THREE.Vector3(pond.x + Math.cos(a) * pond.r * 0.6, 0, pond.z + Math.sin(a) * pond.r * 0.6);
  }
  for (let i = 0; i < cfg.herons; i++) {
    const h = { ...makeHeron(), pos: heronSpot(), state: 'stand', target: null, phase: Math.random() * 5 };
    scene.add(h.mesh);
    herons.push(h);
  }

  // --- Myg ---
  const mosquitoGeo = new THREE.BufferGeometry();
  const mosquitoPos = new Float32Array(40 * 3);
  mosquitoGeo.setAttribute('position', new THREE.BufferAttribute(mosquitoPos, 3));
  const mosquitoes = new THREE.Points(mosquitoGeo, new THREE.PointsMaterial({ color: 0x222222, size: 0.06 }));
  mosquitoes.frustumCulled = false;
  scene.add(mosquitoes);

  const isMud = (x, z) => game.areaAt(x, z) === area && game.isInWater(x, z);

  shop.addItem({
    id: 'boots',
    category: 'udstyr',
    emoji: '🥾',
    name: 'Gummistøvler',
    basePrice: config.prices.boots,
    levels: [{ text: 'Så kan du gå ud i søerne og mudderet i Mosen' }],
    onBuy() {},
  });
  shop.addItem({
    id: 'mosquitoSpray',
    category: 'udstyr',
    emoji: '🧴',
    name: 'Myggebalsam',
    basePrice: config.prices.mosquitoSpray,
    levels: [{ text: 'Myggene i Mosen lader dig være i fred' }],
    onBuy() {},
  });

  return {
    // Uden gummistøvler kan man ikke gå ud i mudderet
    blocks(x, z) {
      if (!isMud(x, z) || shop.has('boots')) return false;
      if (game.time > warnTimer) {
        warnTimer = game.time + 4;
        game.message('🥾 Du synker i mudderet! Køb gummistøvler i butikken');
      }
      return true;
    },

    update(dt) {
      if (game.area !== area) {
        mosquitoes.visible = false;
        return;
      }
      const p = game.player.position;

      // Frøerne hopper rundt, og man kan fange dem
      for (const f of frogs) {
        f.hop -= dt;
        if (f.hop <= 0) {
          f.hop = 1 + Math.random() * 3;
          f.jump = 0.5;
          f.heading += (Math.random() - 0.5) * 2;
          if (Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < 4) f.heading = Math.atan2(f.pos.x - p.x, f.pos.z - p.z);
        }
        if (f.jump > 0) {
          f.jump -= dt;
          f.pos.x += Math.sin(f.heading) * dt * 2.5;
          f.pos.z += Math.cos(f.heading) * dt * 2.5;
        }
        f.pos.y = Math.max(game.groundHeight(f.pos.x, f.pos.z), game.waterLevel) + Math.max(0, Math.sin((f.jump / 0.5) * Math.PI)) * 0.4;
        f.mesh.position.copy(f.pos);
        f.mesh.rotation.y = f.heading;
        if (Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < 0.9 && !game.player.vehicle) {
          game.state.points += 3;
          sound.happy();
          game.message('🐸 Du fangede en frø og slap den fri igen! +3 ⭐');
          game.emit('frogCaught');
          placeFrog(f);
        }
      }

      // Hejrerne står stille i vandet og letter, når man kommer for tæt på
      for (const h of herons) {
        h.phase += dt;
        const d = Math.hypot(h.pos.x - p.x, h.pos.z - p.z);
        if (h.state === 'stand' && d < 12 * (game.stealth ? 0.5 : 1)) {
          h.state = 'fly';
          h.target = heronSpot();
          sound.flutter();
        }
        if (h.state === 'fly') {
          const to = h.target.clone().sub(h.pos);
          const dist = Math.hypot(to.x, to.z);
          h.pos.x += (to.x / dist) * dt * 7;
          h.pos.z += (to.z / dist) * dt * 7;
          h.mesh.rotation.y = Math.atan2(to.x, to.z);
          const flap = Math.sin(h.phase * 6) * 0.8;
          h.wingL.rotation.z = flap;
          h.wingR.rotation.z = -flap;
          h.mesh.position.set(h.pos.x, game.waterLevel + Math.min(8, dist * 0.4), h.pos.z);
          if (dist < 0.5) {
            h.state = 'stand';
            h.wingL.rotation.z = h.wingR.rotation.z = 0;
          }
        } else {
          h.mesh.position.set(h.pos.x, Math.max(game.groundHeight(h.pos.x, h.pos.z), game.waterLevel - 0.3), h.pos.z);
          h.mesh.rotation.x = Math.sin(h.phase * 0.5) > 0.9 ? 0.4 : 0;   // fisker en gang imellem
        }
      }

      // Myg om sommeren (ikke med myggebalsam)
      const summer = game.seasons.id === 'summer' || game.seasons.id === 'spring';
      mosquitoes.visible = summer && !shop.has('mosquitoSpray');
      if (mosquitoes.visible) {
        for (let i = 0; i < 40; i++) {
          const t = game.time * 3 + i * 1.7;
          mosquitoPos[i * 3] = p.x + Math.sin(t) * (0.6 + (i % 5) * 0.2);
          mosquitoPos[i * 3 + 1] = p.y + 1.3 + Math.sin(t * 1.3) * 0.5;
          mosquitoPos[i * 3 + 2] = p.z + Math.cos(t * 0.9) * (0.6 + (i % 4) * 0.2);
        }
        mosquitoGeo.attributes.position.needsUpdate = true;
        mosquitoTimer -= dt;
        if (mosquitoTimer <= 0) {
          mosquitoTimer = 25;
          sound.cricket(0.04);
          game.message('🦟 Bzzz! Myggene stikker! Køb myggebalsam');
        }
      }
    },
  };
}
