import * as THREE from 'three';
import { box, pivot } from './models.js';

// Gården i lejren: hønsehus (æg), køkkenhave (gulerødder og kartofler), bistade (honning)
// og en andedam med ællinger (så kommer der flere ænder).
function makeChicken() {
  const g = new THREE.Group();
  const legs = [pivot(-0.06, 0.18, 0, box(0.04, 0.18, 0.04, 0xf2a01b, 0, -0.09, 0)), pivot(0.06, 0.18, 0, box(0.04, 0.18, 0.04, 0xf2a01b, 0, -0.09, 0))];
  g.add(
    ...legs,
    box(0.3, 0.25, 0.4, 0xf8f8f0, 0, 0.32, 0),
    box(0.18, 0.2, 0.18, 0xf8f8f0, 0, 0.5, 0.18),
    box(0.06, 0.08, 0.1, 0xd8323c, 0, 0.62, 0.18),
    box(0.06, 0.05, 0.08, 0xf2a01b, 0, 0.48, 0.3),
    box(0.15, 0.15, 0.1, 0xf0f0e0, 0, 0.42, -0.22),
  );
  return { mesh: g, legs };
}

function makeDuckling(scale = 0.35, color = 0xffe14d) {
  const g = new THREE.Group();
  g.add(box(0.6, 0.45, 0.9, color), box(0.34, 0.34, 0.34, color, 0, 0.38, 0.45), box(0.18, 0.08, 0.26, 0xf2801b, 0, 0.34, 0.72));
  g.scale.setScalar(scale);
  return g;
}

export function createFarm(game) {
  const { config, scene, shop, input, hud, sound, effects } = game;
  const cfg = config.farm;
  const at = (p, y = 0) => new THREE.Vector3(p.x, game.groundHeight(p.x, p.z) + y, p.z);

  // --- Hønsehus ---
  let coop = null;
  let eggs = 0;
  const chickens = [];
  let eggMeshes = null;

  function buildCoop() {
    if (coop) return;
    coop = new THREE.Group();
    coop.position.copy(at(cfg.coop));
    coop.add(
      box(2, 1.4, 1.6, 0xb5643a, 0, 0.7, -1.4, 'planks'),
      box(2.3, 0.15, 1.9, 0x5a3a1e, 0, 1.5, -1.4),
      box(0.5, 0.6, 0.05, 0x3a2a14, 0, 0.3, -0.59),
    );
    // Hegn
    for (let i = -2; i <= 2; i += 0.5) {
      coop.add(box(0.06, 0.6, 0.06, 0xd8c8a0, i, 0.3, 2), box(0.06, 0.6, 0.06, 0xd8c8a0, -2, 0.3, i), box(0.06, 0.6, 0.06, 0xd8c8a0, 2, 0.3, i));
    }
    coop.add(box(4, 0.06, 0.06, 0xd8c8a0, 0, 0.5, 2), box(0.06, 0.06, 4, 0xd8c8a0, -2, 0.5, 0), box(0.06, 0.06, 4, 0xd8c8a0, 2, 0.5, 0));
    eggMeshes = new THREE.Group();
    eggMeshes.position.set(0.6, 0, -0.4);
    coop.add(eggMeshes);
    scene.add(coop);
    for (let i = 0; i < 4; i++) {
      const c = makeChicken();
      c.mesh.position.set((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 2 + 0.5);
      coop.add(c.mesh);
      chickens.push({ ...c, heading: Math.random() * 6.3, phase: Math.random() * 10 });
    }
    showEggs();
  }

  function showEggs() {
    if (!eggMeshes) return;
    eggMeshes.clear();
    for (let i = 0; i < eggs; i++) eggMeshes.add(box(0.12, 0.16, 0.12, 0xf8f0e0, (i % 3) * 0.18, 0.08, Math.floor(i / 3) * 0.18));
  }

  // --- Køkkenhave ---
  let garden = null;
  const plots = [];   // { mesh, crop, day } crop = null | 'carrot' | 'potato'

  function buildGarden() {
    if (garden) return;
    garden = new THREE.Group();
    garden.position.copy(at(cfg.garden));
    for (let i = 0; i < 6; i++) {
      const x = (i % 3 - 1) * 1.8;
      const z = Math.floor(i / 3) * 2 - 1;
      const plot = new THREE.Group();
      plot.position.set(x, 0, z);
      plot.add(box(1.4, 0.15, 1.6, 0x5a3a22, 0, 0.07, 0));
      const plants = new THREE.Group();
      plot.add(plants);
      garden.add(plot);
      plots.push({ plot, plants, crop: null, day: 0, index: i });
    }
    scene.add(garden);
  }

  function drawPlot(p) {
    p.plants.clear();
    if (!p.crop) return;
    const ready = game.dayNight.day > p.day;
    for (let k = 0; k < 4; k++) {
      const x = (k % 2 - 0.5) * 0.6;
      const z = (Math.floor(k / 2) - 0.5) * 0.7;
      if (ready) {
        p.plants.add(box(0.25, 0.4, 0.25, 0x3a9a3a, x, 0.35, z, 'leaves'));
        p.plants.add(box(0.15, 0.1, 0.15, p.crop === 'carrot' ? 0xf28a2b : 0xb5925a, x, 0.17, z));
      } else {
        p.plants.add(box(0.1, 0.18, 0.1, 0x5ab84a, x, 0.24, z));
      }
    }
  }

  // --- Bistade ---
  let hive = null;
  let honey = 0;
  let bees = null;

  function buildHive() {
    if (hive) return;
    hive = new THREE.Group();
    hive.position.copy(at(cfg.hive));
    hive.add(
      box(0.9, 0.3, 0.9, 0x6b4423, 0, 0.15, 0),
      box(0.8, 0.35, 0.8, 0xf2c94c, 0, 0.47, 0, 'planks'),
      box(0.8, 0.35, 0.8, 0xe8b83a, 0, 0.82, 0, 'planks'),
      box(1, 0.1, 1, 0x8b5a2b, 0, 1.05, 0),
    );
    bees = new THREE.Group();
    for (let i = 0; i < 8; i++) bees.add(box(0.06, 0.05, 0.08, 0x222222, 0, 0, 0));
    hive.add(bees);
    scene.add(hive);
  }

  // --- Andedam ---
  let pond = null;
  const ducklings = [];

  function buildPond() {
    if (pond) return;
    pond = new THREE.Group();
    pond.position.copy(at(cfg.pond));
    const water = new THREE.Mesh(new THREE.CircleGeometry(4, 24).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x3a9ad9, shininess: 80 }));
    water.position.y = 0.06;
    pond.add(water);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      pond.add(box(0.08, 0.6 + Math.random() * 0.4, 0.08, 0x7a8a3a, Math.cos(a) * 4.1, 0.35, Math.sin(a) * 4.1));
    }
    const mother = makeDuckling(1, 0x8a5a2b);
    mother.children[1].material = mother.children[1].material.clone();
    mother.children[1].material.color.set(0x8a6a45);
    pond.add(mother);
    ducklings.push(mother);
    for (let i = 0; i < 4; i++) {
      const d = makeDuckling();
      pond.add(d);
      ducklings.push(d);
    }
    scene.add(pond);
    game.ducks.mods.extraFlying += cfg.pondExtraDucks;
  }

  const items = [
    ['coop', '🐔', 'Hønsehus', cfg.coopPrice, `Høns der lægger ${cfg.eggsPerDay} æg hver morgen`, buildCoop],
    ['garden', '🥕', 'Køkkenhave', cfg.gardenPrice, 'Så gulerødder og kartofler (E), og høst dem næste dag', buildGarden],
    ['hive', '🐝', 'Bistade', cfg.hivePrice, 'Bierne laver honning hver dag', buildHive],
    ['duckPond', '🦆', 'Andedam', cfg.pondPrice, `En andemor med ællinger. Så kommer der ${cfg.pondExtraDucks} ænder mere`, buildPond],
  ];
  for (const [id, emoji, name, price, text, build] of items) {
    shop.addItem({
      id,
      category: 'lejr',
      emoji,
      name,
      basePrice: price,
      levels: [{ text }],
      onBuy(level, { loading }) {
        build();
        if (!loading) game.message(`${emoji} ${name} er klar!`);
      },
    });
  }

  game.on('morning', () => {
    if (coop) {
      eggs = Math.min(6, eggs + cfg.eggsPerDay);
      showEggs();
    }
    if (hive) honey = Math.min(3, honey + 1);
    plots.forEach(drawPlot);
  });

  game.remember('farm', {
    save: () => ({ eggs, honey, plots: plots.map((p) => ({ crop: p.crop, day: p.day })) }),
    load(data) {
      eggs = data.eggs ?? 0;
      honey = data.honey ?? 0;
      showEggs();
      data.plots?.forEach((saved, i) => {
        if (!plots[i]) return;
        plots[i].crop = saved.crop;
        plots[i].day = saved.day;
        drawPlot(plots[i]);
      });
    },
  });

  return {
    update(dt) {
      const p = game.player.position;
      const t = game.time;

      // Hønsene går rundt og pikker
      for (const c of chickens) {
        c.phase += dt;
        if (Math.random() < dt * 0.5) c.heading += (Math.random() - 0.5) * 2;
        const pos = c.mesh.position;
        pos.x = Math.max(-1.8, Math.min(1.8, pos.x + Math.sin(c.heading) * dt * 0.5));
        pos.z = Math.max(-0.4, Math.min(1.8, pos.z + Math.cos(c.heading) * dt * 0.5));
        c.mesh.rotation.y = c.heading;
        c.mesh.rotation.x = Math.sin(c.phase * 3) > 0.7 ? 0.4 : 0;
        const swing = Math.sin(c.phase * 10) * 0.5;
        c.legs[0].rotation.x = swing;
        c.legs[1].rotation.x = -swing;
      }
      // Bierne summer
      if (bees) {
        bees.children.forEach((b, i) => {
          const a = t * 2 + i;
          b.position.set(Math.cos(a) * (0.8 + i * 0.1), 1 + Math.sin(a * 1.7) * 0.4, Math.sin(a) * (0.8 + i * 0.1));
        });
      }
      // Ællingerne svømmer efter mor
      ducklings.forEach((d, i) => {
        const a = t * 0.3 - i * 0.35;
        d.position.set(Math.cos(a) * 2.2, 0.1 + Math.sin(t * 2 + i) * 0.02, Math.sin(a) * 2.2);
        d.rotation.y = -a;
      });

      if (game.player.vehicle) return;

      if (coop && game.isPlayerNear(coop.position, 3)) {
        hud.setPrompt(eggs ? `Tryk <b>E</b> for at samle ${eggs} æg 🥚` : '🐔 Ingen æg endnu. Kom igen i morgen');
        if (eggs && input.consume('KeyE')) {
          game.addToBag('egg', eggs);
          game.message(`🥚 +${eggs} æg!`);
          sound.pickup();
          eggs = 0;
          showEggs();
        }
      }
      if (hive && game.isPlayerNear(hive.position, 2.2)) {
        hud.setPrompt(honey ? 'Tryk <b>E</b> for at tage honning 🍯' : '🐝 Bierne laver honning. Kom igen i morgen');
        if (honey && input.consume('KeyE')) {
          game.addToBag('honey', honey);
          game.message(`🍯 +${honey} honning!`);
          sound.pickup();
          honey = 0;
        }
      }
      if (garden) {
        const plot = plots.find((pl) => pl.plot.getWorldPosition(new THREE.Vector3()).distanceTo(p) < 1.3);
        if (plot) {
          const ready = plot.crop && game.dayNight.day > plot.day;
          const crop = plot.index % 2 ? 'potato' : 'carrot';
          if (!plot.crop) hud.setPrompt(`Tryk <b>E</b> for at så ${crop === 'carrot' ? 'gulerødder 🥕' : 'kartofler 🥔'}`);
          else if (ready) hud.setPrompt(`Tryk <b>E</b> for at høste ${game.config.foods[plot.crop].plural} ${game.config.foods[plot.crop].emoji}`);
          else hud.setPrompt('🌱 Det vokser... klar i morgen');
          if (input.consume('KeyE')) {
            if (!plot.crop) {
              plot.crop = crop;
              plot.day = game.dayNight.day;
              effects.burst(at({ x: p.x, z: p.z }, 0.2), { count: 6, colors: [0x5a3a22], size: 0.1, speed: 1, up: 1, gravity: 6, life: 0.6 });
              game.message('🌱 Sået! Kom tilbage i morgen');
            } else if (ready) {
              game.addToBag(plot.crop, 2);
              game.message(`${game.config.foods[plot.crop].emoji} +2 ${game.config.foods[plot.crop].plural}!`);
              sound.pickup();
              plot.crop = null;
            }
            drawPlot(plot);
          }
        }
      }
    },
  };
}
