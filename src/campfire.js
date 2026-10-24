import * as THREE from 'three';
import { box, glow } from './models.js';
import { makeCarcass } from './catalog.js';

// Bålet med grillspyd, hvor man steger sit vildt (ænder, fasaner, fisk, bjørnekød ...).
// Bålet kan opgraderes i butikken, så der er plads til mere på grillen.

const RAW = new THREE.Color(0xf0b49a);
const COOKED = new THREE.Color(0xc8762a);
const GOLDEN_DARK = new THREE.Color(0x96531a);
const BURNT = new THREE.Color(0x2b1d14);
const PER_ROD = 3;   // pladser pr. grillspyd

// Det man steger, set fra grillen. Farven ændrer sig fra rå til stegt.
function makeRoast(type) {
  const mat = new THREE.MeshLambertMaterial({ color: RAW.clone() });
  const g = new THREE.Group();
  const part = (w, h, d, x, y, z, m = mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    g.add(mesh);
  };
  if (type === 'fish') {
    part(0.14, 0.28, 0.7, 0, 0, 0);
    part(0.04, 0.3, 0.2, 0, 0, -0.42);
  } else if (type === 'hare') {
    part(0.34, 0.3, 0.75, 0, 0, 0);
    part(0.12, 0.12, 0.35, -0.12, -0.1, 0.45);
    part(0.12, 0.12, 0.35, 0.12, -0.1, 0.45);
  } else if (type === 'bear') {
    part(0.6, 0.42, 0.5, 0, 0, 0);
    const bone = new THREE.MeshLambertMaterial({ color: 0xf2ead2 });
    part(0.12, 0.12, 0.5, 0, 0, 0.42, bone);
    part(0.22, 0.2, 0.1, 0, 0, 0.68, bone);
  } else {
    part(0.42, 0.38, 0.6, 0, 0, 0);
    part(0.14, 0.14, 0.3, -0.17, -0.12, 0.32);   // lår
    part(0.14, 0.14, 0.3, 0.17, -0.12, 0.32);    // lår
    part(0.06, 0.06, 0.12, -0.17, -0.12, 0.5);
    part(0.06, 0.06, 0.12, 0.17, -0.12, 0.5);
    g.scale.setScalar({ pheasant: 0.85, goose: 1.25 }[type] ?? 1);
  }
  g.rotation.y = Math.PI / 2;
  const holder = new THREE.Group();
  holder.add(g);
  holder.userData.material = mat;
  return holder;
}

export function createCampfire(game) {
  const { config, scene, input, state, sound, effects, hud } = game;
  const cfg = config.campfire;
  const pos = new THREE.Vector3(cfg.position.x, 0, cfg.position.z);

  const fire = new THREE.Group();
  fire.position.copy(pos);
  scene.add(fire);
  game.colliders.push({ x: pos.x, z: pos.z, r: 1.1 });

  // Sten i en ring
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const stone = box(0.35, 0.25, 0.3, i % 2 ? 0x888888 : 0x9d9d9d, Math.cos(a) * 0.95, 0.12, Math.sin(a) * 0.95, 'stone');
    stone.rotation.y = -a;
    fire.add(stone);
  }

  // Brænde
  const log1 = box(1.3, 0.16, 0.16, 0x6b4423, 0, 0.12, 0);
  log1.rotation.y = 0.6;
  const log2 = box(1.3, 0.16, 0.16, 0x5a3a1e, 0, 0.2, 0);
  log2.rotation.y = -0.6;
  fire.add(log1, log2);

  // Flammer
  const flames = [];
  const flameColors = [0xff5a1f, 0xff8c1a, 0xffc53a, 0xff7020, 0xffe066];
  for (let i = 0; i < 5; i++) {
    const flame = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.6, 0.28),
      glow(flameColors[i], 2.2),
    );
    const a = (i / 5) * Math.PI * 2;
    const r = i === 4 ? 0 : 0.22;
    flame.position.set(Math.cos(a) * r, 0.45, Math.sin(a) * r);
    flame.userData.base = flame.position.clone();
    flame.userData.offset = Math.random() * 10;
    fire.add(flame);
    flames.push(flame);
  }

  const light = new THREE.PointLight(0xff8a2a, 3, 14, 1.5);
  light.position.set(0, 1, 0);
  fire.add(light);

  const cookTime = () => {
    const level = game.shop.level('fastCook');
    return cfg.cookTime * (level ? cfg.fastCook[level - 1] : 1);
  };

  // --- Tag (mod regn) ---
  let hasRoof = false;
  function buildRoof() {
    if (hasRoof) return;
    hasRoof = true;
    for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) {
      fire.add(box(0.14, 3.2, 0.14, 0x6b4423, x, 1.6, z));
    }
    for (const s of [-1, 1]) {
      const roof = box(2.3, 0.1, 4.2, 0x3d6b2a, s * 1.05, 3.45, 0);
      roof.rotation.z = -s * 0.35;
      fire.add(roof);
    }
  }
  const isOut = () => game.weather.isRaining && !hasRoof;

  // --- Grillspyd ---
  const rodY = 1.25;
  const slots = [];
  let spitGroup = null;

  // Bygger grillspyddene. Over 3 ænder kommer der flere spyd ved siden af hinanden.
  function buildSpits(count) {
    if (spitGroup) fire.remove(spitGroup);
    spitGroup = new THREE.Group();
    fire.add(spitGroup);

    while (slots.length < count) slots.push({ roast: null, type: null, time: 0, status: null, x: 0, z: 0 });

    const rods = Math.ceil(count / PER_ROD);
    for (let r = 0; r < rods; r++) {
      const z = (r - (rods - 1) / 2) * 0.8;
      const inRod = Math.min(PER_ROD, count - r * PER_ROD);
      const length = Math.max(inRod * 0.75 + 0.5, 2.3);
      for (const side of [-1, 1]) {
        spitGroup.add(box(0.1, rodY + 0.15, 0.1, 0x6b4423, side * (length / 2), (rodY + 0.15) / 2, z));
      }
      spitGroup.add(box(length + 0.3, 0.05, 0.05, 0x777777, 0, rodY, z));
      for (let i = 0; i < inRod; i++) {
        const slot = slots[r * PER_ROD + i];
        slot.x = (i - (inRod - 1) / 2) * 0.75;
        slot.z = z;
        if (slot.roast) slot.roast.position.set(slot.x, rodY, slot.z);
      }
    }
  }
  buildSpits(cfg.startSpits);

  // --- Bunken af vildt, som hundene har lagt ved bålet ---
  const pile = [];   // fx ['duck', 'duck', 'pheasant']
  let wasOut = false;
  const pileModels = [];
  const pileSpot = new THREE.Vector3(-1.9, 0, 1.3);   // i forhold til bålet

  function updatePile() {
    for (const m of pileModels) fire.remove(m);
    pileModels.length = 0;
    pile.slice(0, 8).forEach((type, i) => {
      const holder = new THREE.Group();
      const carcass = makeCarcass(type);
      carcass.scale.setScalar(0.7);
      holder.add(carcass);
      holder.rotation.y = i * 1.7;
      const a = i * 2.3;
      const top = i >= 4 ? 1 : 0;
      holder.position.set(pileSpot.x + Math.cos(a) * 0.45 * (1 - top), 0.2 + top * 0.3, pileSpot.z + Math.sin(a) * 0.45 * (1 - top));
      fire.add(holder);
      pileModels.push(holder);
    });
  }

  // Næste ting der kan steges: først fra bunken, så fra tasken
  const nextToCook = () => pile[0] ?? Object.keys(state.bag).find((t) => state.bag[t] > 0 && !config.foods[t]?.ingredient);

  function putOnFire(slot, { type, status = 'raw', time = 0, quiet = false } = {}) {
    if (!quiet) {
      type = pile.length ? pile.shift() : game.takeFromBag();
      updatePile();
    }
    slot.type = type ?? 'duck';
    slot.roast = makeRoast(slot.type);
    slot.roast.position.set(slot.x, rodY, slot.z);
    slot.time = time;
    slot.status = status;
    fire.add(slot.roast);
    if (quiet) return;
    sound.sizzle();
    game.message(`🔥 ${config.foods[slot.type].emoji} steger...`);
    game.emit('foodOnFire', { type: slot.type });
  }

  function takeOff(slot) {
    fire.remove(slot.roast);
    if (slot.status === 'done') {
      state.cooked++;
      sound.pickup();
      game.message(`🍗 Lækker stegt ${config.foods[slot.type].name}! +${game.score.cookedPoints(slot.type)}`);
      game.emit('foodCooked', { type: slot.type });
    } else {
      state.burnt++;
      game.message('⚫ Brændt... det smager ikke så godt');
      game.emit('foodBurnt', { type: slot.type });
    }
    slot.roast = null;
    slot.status = null;
  }

  function bar(fraction, color) {
    return `<div class="bar"><div style="width:${Math.round(fraction * 100)}%;background:${color}"></div></div>`;
  }

  function showPrompt() {
    const ready = slots.find((s) => s.status === 'done') || slots.find((s) => s.status === 'burnt');
    const free = slots.find((s) => !s.roast);
    const available = pile.length + game.bagCount();
    const next = nextToCook();
    let text;
    if (isOut()) text = '🌧️ Regnen har slukket bålet! Køb et tag i butikken';
    else if (ready) text = ready.status === 'done' ? `Tryk <b>E</b> for at tage den stegte ${config.foods[ready.type].name} af! 🍗` : 'Tryk <b>E</b> for at fjerne det brændte';
    else if (free && available > 0) text = `Tryk <b>E</b> for at sætte en ${config.foods[next].name} over bålet ${config.foods[next].emoji}`;
    else if (available > 0) text = 'Grillen er fuld! Køb et større bål i butikken';
    else if (slots.some((s) => s.roast)) text = 'Det steger...';
    else text = 'Skyd noget vildt først! 🦆';
    if (pile.length) text += `<br><small>🐕 ${pile.length} ting ligger ved bålet</small>`;

    let bars = '';
    for (const s of slots) {
      if (s.status === 'raw') bars += bar(s.time / cookTime(), '#ffb13a');
      else if (s.status === 'done') bars += bar(1 - (s.time - cfg.cookTime) / cfg.burnTime, '#e83a2b');
    }
    hud.setPrompt(text + bars);
    return { ready, free, available };
  }

  game.shop.addItem({
    id: 'campfire',
    category: 'mad',
    emoji: '🔥',
    name: 'Større bål',
    basePrice: cfg.upgradePrice,
    levels: cfg.upgrades.map((spits) => ({ text: `Plads til ${spits} ting på grillen` })),
    current: () => `Plads til ${slots.length} ${slots.length === 1 ? 'ting' : 'ting'} på grillen`,
    onBuy(level, { loading }) {
      buildSpits(cfg.upgrades[level - 1]);
      if (!loading) game.message('🔥 Bålet er blevet større!');
    },
  });

  game.shop.addItem({
    id: 'fastCook',
    category: 'mad',
    emoji: '⏱️',
    name: 'Hurtigere stegning',
    basePrice: cfg.fastCookPrice,
    levels: cfg.fastCook.map((f) => ({ text: `Maden er færdig på ${Math.round(cfg.cookTime * f)} sekunder` })),
    current: () => `Maden er færdig på ${Math.round(cookTime())} sekunder`,
    onBuy() {},
  });

  game.shop.addItem({
    id: 'alarm',
    category: 'mad',
    emoji: '⏰',
    name: 'Alarm',
    basePrice: config.prices.alarm,
    levels: [{ text: 'Bimler, lige før noget brænder på' }],
    onBuy() {},
  });

  game.shop.addItem({
    id: 'spices',
    category: 'mad',
    emoji: '🧂',
    name: 'Krydderier',
    basePrice: config.prices.spices,
    levels: [{ text: `${config.points.spiceBonus} ekstra point for alt hvad du steger` }],
    onBuy() {},
  });

  game.shop.addItem({
    id: 'fireRoof',
    category: 'mad',
    emoji: '⛺',
    name: 'Tag over bålet',
    basePrice: config.prices.fireRoof,
    levels: [{ text: 'Så slukker regnen ikke bålet' }],
    onBuy(level, { loading }) {
      buildRoof();
      if (!loading) game.message('⛺ Nu har bålet et tag!');
    },
  });

  game.remember('campfire', {
    save: () => ({ pile, slots: slots.map((s) => (s.roast ? { type: s.type, status: s.status, time: s.time } : null)) }),
    load(data) {
      // Ældre gem havde bare et tal for hvor mange ænder der lå i bunken
      pile.push(...(Array.isArray(data.pile) ? data.pile : Array(data.pile || 0).fill('duck')));
      updatePile();
      data.slots?.forEach((saved, i) => {
        if (saved && slots[i] && !slots[i].roast) putOnFire(slots[i], { ...saved, quiet: true });
      });
    },
  });

  return {
    position: pos,
    slots,
    // Hvor hundene lægger vildtet (i verden)
    pilePosition: pos.clone().add(pileSpot),

    addToPile(types) {
      pile.push(...types);
      updatePile();
    },

    get pile() { return pile; },
    takeFromPile() {
      const type = pile.shift() ?? null;
      if (type) updatePile();
      return type;
    },

    update(dt) {
      // Flammerne blafrer
      for (const f of flames) {
        const t = game.time * 9 + f.userData.offset;
        f.scale.y = 0.8 + Math.sin(t) * 0.25 + Math.random() * 0.15;
        f.position.y = f.userData.base.y + Math.sin(t * 0.7) * 0.05;
        f.rotation.y += dt * 2;
      }
      const out = isOut();
      for (const f of flames) f.visible = !out;
      light.visible = !out;
      if (out !== wasOut) {
        game.message(out ? '🌧️ Regnen slukkede bålet!' : '🔥 Bålet brænder igen');
        wasOut = out;
      }
      light.intensity = 2.6 + Math.random() * 0.8;

      if (!out && Math.random() < dt * 3.3) {
        effects.smoke(new THREE.Vector3(pos.x, 1, pos.z));
        if (Math.random() < 0.5) effects.sparks(new THREE.Vector3(pos.x, 0.8, pos.z));
      }

      // Steg ænderne (ikke når bålet er slukket)
      for (const s of slots) {
        if (!s.roast) continue;
        if (out) continue;
        s.time += dt;
        s.roast.rotation.x += dt * 1.5;
        const color = s.roast.userData.material.color;

        if (s.status === 'raw') {
          color.copy(RAW).lerp(COOKED, Math.min(1, s.time / cookTime()));
          if (s.time >= cookTime()) {
            s.status = 'done';
            s.time = cfg.cookTime;   // herfra tæller tiden mod at brænde på
            s.alarmed = false;
            sound.ding();
            game.message(`🍗 ${config.foods[s.type].emoji} er færdig!`);
          }
        } else if (s.status === 'done') {
          color.copy(COOKED).lerp(GOLDEN_DARK, (s.time - cfg.cookTime) / cfg.burnTime);
          if (!s.alarmed && game.shop.has('alarm') && s.time >= cfg.cookTime + cfg.burnTime - cfg.alarmSeconds) {
            s.alarmed = true;
            sound.alarm();
            game.message('⏰ Skynd dig! Noget brænder snart på!');
          }
          if (s.time >= cfg.cookTime + cfg.burnTime) {
            s.status = 'burnt';
            sound.puff();
            game.message('🔥 Åh nej! Noget brændte på!');
          }
        } else if (s.status === 'burnt') {
          color.copy(BURNT);
          if (Math.random() < dt * 3) effects.smoke(new THREE.Vector3(pos.x + s.x, rodY + 0.2, pos.z + s.z), true);
        }
      }

      // Står man tæt på bålet?
      if (!game.isPlayerNear(pos, cfg.useDistance)) return;

      const { ready, free, available } = showPrompt();
      if (input.consume('KeyE')) {
        if (ready) takeOff(ready);
        else if (free && available > 0) putOnFire(free);
      }
    },
  };
}
