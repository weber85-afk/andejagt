import * as THREE from 'three';
import { box } from './models.js';

// Fiskeri: vælg fiskestangen (4), sigt på vandet og klik for at kaste ud.
// Når proppen dykker, skal man klikke hurtigt for at fange fisken.
export function createFishing(game) {
  const { config, scene, shop, input, sound, effects, state } = game;
  const cfg = config.fishing;

  const bobber = new THREE.Group();
  bobber.add(box(0.16, 0.12, 0.16, 0xd8323c, 0, 0.06, 0), box(0.16, 0.08, 0.16, 0xffffff, 0, 0.16, 0));
  bobber.visible = false;
  scene.add(bobber);

  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xeeeeee }));
  line.frustumCulled = false;
  line.visible = false;
  scene.add(line);

  // Huller i isen (om vinteren)
  const holes = [];
  function drillHole(point) {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0a2a4a }));
    hole.position.set(point.x, game.waterLevel + 0.02, point.z);
    scene.add(hole);
    holes.push(hole);
    if (holes.length > 5) scene.remove(holes.shift());
    effects.burst(hole.position, { count: 10, colors: [0xffffff, 0xdfefff], size: 0.12, speed: 2, up: 2, gravity: 8, life: 0.8 });
    game.message('🧊 Du borede et hul i isen');
  }
  game.on('season', ({ id }) => {
    if (id !== 'winter') while (holes.length) scene.remove(holes.pop());
  });

  let phase = 'idle';   // 'idle', 'waiting' (venter på bid) eller 'bite' (nu skal man klikke!)
  let timer = 0;
  const raycaster = new THREE.Raycaster();
  const tip = new THREE.Vector3();

  function reelIn(text) {
    phase = 'idle';
    bobber.visible = false;
    line.visible = false;
    if (text) game.message(text);
  }

  function cast() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), game.camera);
    const ray = raycaster.ray;
    if (ray.direction.y >= -0.02) {
      game.message('🎣 Kig ned på vandet og kast');
      return;
    }
    const t = (game.waterLevel - ray.origin.y) / ray.direction.y;
    const point = ray.at(t, new THREE.Vector3());
    const p = game.player.position;
    const ice = game.isOnIce(point.x, point.z);
    if (Math.hypot(point.x - p.x, point.z - p.z) > cfg.castDistance || !(game.isInWater(point.x, point.z) || ice)) {
      game.message('🎣 Kast ud i vandet');
      return;
    }
    if (ice) {
      if (!shop.has('iceDrill')) {
        game.message('❄️ Søen er frosset! Køb et isbor i butikken');
        return;
      }
      if (Math.hypot(point.x - p.x, point.z - p.z) > 4) {
        game.message('❄️ Gå helt hen på isen og bor et hul tæt ved dig');
        return;
      }
      drillHole(point);
    }
    bobber.position.set(point.x, game.waterLevel, point.z);
    bobber.visible = true;
    line.visible = true;
    phase = 'waiting';
    timer = cfg.minWait + Math.random() * (cfg.maxWait - cfg.minWait);
    effects.splash(bobber.position);
    sound.splashSound();
  }

  function catchFish() {
    const max = game.area.id === 'sea' ? config.sea.maxFishWeight : cfg.maxWeight;   // havfisk bliver større
    const weight = Math.round((0.4 + Math.random() ** 2 * max) * 10) / 10;
    game.addToBag('fish');
    const record = weight > (state.trophies.biggestFish || 0);
    if (record) state.trophies.biggestFish = weight;
    sound.pickup();
    effects.splash(bobber.position);
    game.message(`🐟 Du fangede en fisk på ${String(weight).replace('.', ',')} kg!${record ? ' Ny rekord! 🏆' : ''}`);
    game.emit('animalHit', { type: 'fish' });
    game.emit('fishCaught', { weight });
    reelIn();
  }

  shop.addItem({
    id: 'fishingRod',
    category: 'udstyr',
    emoji: '🎣',
    name: 'Fiskestang',
    basePrice: config.prices.fishingRod,
    levels: [{ text: 'Fang fisk i søen og åen. Tryk 4 for fiskestangen' }],
    onBuy(level, { loading }) {
      if (!loading) game.message('🎣 Tryk 4 for fiskestangen');
    },
  });

  shop.addItem({
    id: 'iceDrill',
    category: 'udstyr',
    emoji: '🧊',
    name: 'Isbor',
    basePrice: config.prices.iceDrill,
    levels: [{ text: 'Bor huller i isen og fisk om vinteren' }],
    onBuy() {},
  });

  return {
    update(dt) {
      const holding = game.weapon.current === 'rod' && !game.player.vehicle?.drive;
      if (!holding) {
        if (phase !== 'idle') reelIn();
        return;
      }

      if (phase === 'idle') {
        if (input.clicked) cast();
        return;
      }

      // Linen fra stangen til proppen
      game.weapon.rodTip(tip);
      const pts = lineGeo.attributes.position;
      pts.setXYZ(0, tip.x, tip.y, tip.z);
      pts.setXYZ(1, bobber.position.x, bobber.position.y + 0.15, bobber.position.z);
      pts.needsUpdate = true;

      const p = game.player.position;
      if (Math.hypot(bobber.position.x - p.x, bobber.position.z - p.z) > cfg.castDistance + 6) {
        reelIn('🎣 Linen blev for lang');
        return;
      }

      timer -= dt;
      if (phase === 'waiting') {
        bobber.position.y = game.waterLevel + Math.sin(game.time * 2) * 0.03;
        if (input.clicked) {
          reelIn('🎣 For tidligt! Vent til proppen dykker');
        } else if (timer <= 0) {
          phase = 'bite';
          timer = cfg.biteTime;
          sound.splashSound();
          game.message('🐟 Nu bider den! KLIK!');
        }
      } else if (phase === 'bite') {
        bobber.position.y = game.waterLevel - 0.12 + Math.sin(game.time * 25) * 0.06;
        if (input.clicked) catchFish();
        else if (timer <= 0) reelIn('🐟 Øv, fisken slap væk');
      }
    },
  };
}
