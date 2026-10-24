import * as THREE from 'three';
import { box, glow } from './models.js';

// Våbnene: geværet (kan opgraderes) og haglgeværet. Man skifter med 1 og 2.
// Hvert våben har et magasin, og man lader om med R ved at bruge patroner fra tasken.

function makeRifle() {
  const gun = new THREE.Group();
  gun.add(
    box(0.12, 0.17, 0.42, 0x8b5a2b, 0, -0.03, 0.17),   // kolbe
    box(0.11, 0.12, 0.42, 0x5a3a1e, 0, 0, -0.24),     // skæfte
    box(0.07, 0.07, 0.7, 0x333333, 0, 0.04, -0.7),    // løb
    box(0.03, 0.05, 0.03, 0x222222, 0, 0.1, -1.0),    // sigte
  );
  const scope = new THREE.Group();
  scope.add(
    box(0.09, 0.09, 0.4, 0x1a1a1a, 0, 0.14, -0.35),
    box(0.11, 0.11, 0.06, 0x1a1a1a, 0, 0.14, -0.57),
  );
  scope.visible = false;
  gun.add(scope);
  gun.userData.scope = scope;
  return gun;
}

function makeShotgun() {
  const gun = new THREE.Group();
  gun.add(
    box(0.13, 0.18, 0.42, 0x4a2a14, 0, -0.03, 0.17),
    box(0.13, 0.12, 0.35, 0x3a2010, 0, 0, -0.2),
    box(0.06, 0.06, 0.6, 0x555555, -0.035, 0.05, -0.62),
    box(0.06, 0.06, 0.6, 0x555555, 0.035, 0.05, -0.62),
  );
  return gun;
}

function makeBigRifle() {
  const gun = new THREE.Group();
  gun.add(
    box(0.12, 0.18, 0.45, 0x3a2010, 0, -0.03, 0.18),
    box(0.11, 0.13, 0.5, 0x2a1508, 0, 0, -0.25),
    box(0.08, 0.08, 0.9, 0x222222, 0, 0.04, -0.85),
    box(0.11, 0.11, 0.5, 0x111111, 0, 0.15, -0.35),    // kikkert
    box(0.13, 0.13, 0.06, 0x111111, 0, 0.15, -0.62),
  );
  return gun;
}

function makeRod() {
  const rod = new THREE.Group();
  const stick = box(0.04, 0.04, 1.6, 0x8b5a2b, 0, 0.3, -0.7);
  stick.rotation.x = 0.35;
  rod.add(stick, box(0.1, 0.12, 0.12, 0x333333, 0.06, 0.02, 0.0));
  rod.userData.tip = new THREE.Object3D();
  rod.userData.tip.position.set(0, 0.57, -1.45);
  rod.add(rod.userData.tip);
  return rod;
}

function makeBow() {
  const bow = new THREE.Group();
  const wood = 0x8b5a2b;
  for (const [y, rx] of [[0.35, -0.35], [0, 0], [-0.35, 0.35]]) {
    const part = box(0.05, 0.4, 0.05, wood, 0, y, -0.55 - Math.abs(y) * 0.25);
    part.rotation.x = rx;
    bow.add(part);
  }
  bow.add(box(0.01, 0.95, 0.01, 0xeeeeee, 0, 0, -0.38));    // streng
  bow.add(box(0.03, 0.03, 0.75, 0x6b4423, 0, 0, -0.65));    // pil
  bow.add(box(0.06, 0.06, 0.08, 0xaaaaaa, 0, 0, -1.04));
  return bow;
}

function makeDetector() {
  const d = new THREE.Group();
  const pole = box(0.04, 0.04, 1.3, 0x555555, 0, -0.2, -0.6);
  pole.rotation.x = -0.5;
  d.add(pole, box(0.4, 0.04, 0.3, 0x2a2a2a, 0, -0.52, -1.18), box(0.12, 0.1, 0.16, 0xf2c22b, 0, 0.0, -0.1));
  return d;
}

function addFlash(gun, z) {
  const flash = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.22),
    glow(0xffd23a, 3),
  );
  flash.position.set(0, 0.04, z);
  flash.visible = false;
  gun.add(flash);
  gun.userData.flash = flash;
  return gun;
}

export function createWeapon(game) {
  const { camera, player, input, config, sound, effects, state, shop } = game;
  const cfg = config.weapon;

  const ammoEl = document.getElementById('ammo');
  const scopeEl = document.getElementById('scope');

  // Et sæt modeller pr. våben: én i hånden (gennem øjnene) og én som figuren holder
  const guns = {
    rifle: { name: 'Gevær', hand: addFlash(makeRifle(), -1.12), figure: addFlash(makeRifle(), -1.12), loaded: cfg.rifle.magazine },
    shotgun: { name: 'Haglgevær', hand: addFlash(makeShotgun(), -0.98), figure: addFlash(makeShotgun(), -0.98), loaded: cfg.shotgun.magazine },
    bigRifle: { name: 'Riffel', hand: addFlash(makeBigRifle(), -1.35), figure: addFlash(makeBigRifle(), -1.35), loaded: cfg.bigRifle.magazine },
    rod: { name: 'Fiskestang', hand: addFlash(makeRod(), -1.5), figure: addFlash(makeRod(), -1.5), loaded: 0 },
    bow: { name: 'Bue', hand: addFlash(makeBow(), -1.1), figure: addFlash(makeBow(), -1.1), loaded: 0 },
    detector: { name: 'Metaldetektor', hand: addFlash(makeDetector(), -1.2), figure: addFlash(makeDetector(), -1.2), loaded: 0 },
  };
  // Våben der ikke bruger patroner
  const TOOLS = ['rod', 'detector'];
  const SHOP_ID = { rod: 'fishingRod', detector: 'metalDetector' };
  const arrows = [];   // pile der ligger på jorden og kan samles op
  const handBase = new THREE.Vector3(0.3, -0.3, -0.5);
  for (const gun of Object.values(guns)) {
    gun.hand.position.copy(handBase);
    gun.hand.scale.setScalar(0.75);
    gun.hand.traverse((m) => { m.castShadow = false; });
    camera.add(gun.hand);
    gun.figure.position.set(0.3, 0.08, -0.4);
    player.aim.add(gun.figure);
  }

  let current = 'rifle';
  let reserve = cfg.startAmmo;   // patroner i tasken
  let cooldown = 0;
  let reloading = 0;
  let kick = 0;
  let flashTime = 0;
  let zoom = 1;
  let scopeOn = false;   // kikkertsigtet tændes og slukkes (højreklik eller Z)
  let binoOn = false;    // kikkerten (B)
  const binoEl = document.getElementById('binoculars');
  let lastAmmo = '';

  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);

  // Hvad våbnet kan lige nu (geværet bliver bedre, når det opgraderes)
  function stats(id = current) {
    if (id === 'shotgun') return cfg.shotgun;
    if (id === 'bow') return cfg.bow;
    if (id === 'bigRifle') return cfg.bigRifle;
    const level = shop.level('betterGun');
    return level ? { ...cfg.rifle, ...cfg.rifle.upgrades[level - 1] } : cfg.rifle;
  }

  function startReload() {
    const gun = guns[current];
    if (reloading > 0 || gun.loaded >= stats().magazine) return;
    if (reserve <= 0) {
      outOfAmmo();
      return;
    }
    reloading = stats().reloadTime;
    sound.reload();
  }

  function finishReload() {
    const gun = guns[current];
    const take = Math.min(stats().magazine - gun.loaded, reserve);
    gun.loaded += take;
    reserve -= take;
  }

  function outOfAmmo() {
    sound.empty();
    // Så man aldrig sidder fast uden patroner og uden point
    if (reserve <= 0 && state.points < cfg.ammoPrice && guns[current].loaded === 0) {
      reserve += cfg.ammoPack;
      game.message(`🎁 Sælgeren giver dig ${cfg.ammoPack} gratis patroner`);
    } else {
      game.message('Ingen patroner! Køb flere i butikken 🛒');
    }
  }

  // Skyd med buen: lydløst, og pilene kan samles op igen
  function shootBow() {
    if ((state.arrows ?? 0) <= 0) {
      sound.empty();
      game.message('🏹 Ingen pile! Saml dem op igen eller køb nye');
      return;
    }
    state.arrows--;
    cooldown = cfg.bow.cooldown;
    kick = 0.6;
    sound.flutter();
    raycaster.setFromCamera(center, camera);
    const ray = raycaster.ray;
    const found = [];
    for (const provider of game.targets) {
      for (const hit of provider.findHits(ray, cfg.bow.range)) found.push({ ...hit, provider });
    }
    found.sort((a, b) => a.along - b.along);
    if (found.length) {
      found[0].provider.hit(found[0].target, 'bow');
      state.arrows++;   // pilen sidder i dyret og kommer med, når man tager det
    } else {
      // Pilen lander på jorden et sted foran én
      const p = new THREE.Vector3();
      for (let t = 2; t < cfg.bow.range; t += 1) {
        ray.at(t, p);
        if (p.y <= game.groundHeight(p.x, p.z) + 0.1) break;
      }
      const arrow = box(0.05, 0.05, 0.8, 0x6b4423, p.x, game.groundHeight(p.x, p.z) + 0.15, p.z);
      arrow.rotation.y = player.yaw;
      arrow.rotation.x = -0.4;
      game.scene.add(arrow);
      arrows.push(arrow);
    }
    game.emit('shot', { hit: found.length > 0, loud: false });
  }

  function shoot() {
    const gun = guns[current];
    const s = stats();
    if (gun.loaded <= 0) {
      if (reserve > 0) startReload();
      else outOfAmmo();
      return;
    }
    gun.loaded--;
    cooldown = s.cooldown;
    kick = current === 'shotgun' ? 1.6 : 1;
    flashTime = 0.06;
    if (current !== 'rifle') sound.shotgun();
    else sound.shot();

    raycaster.setFromCamera(center, camera);
    const ray = raycaster.ray;
    // Spørg alt hvad der kan skydes (ænder, fasaner, bjørne ...), om skuddet rammer
    const found = [];
    for (const provider of game.targets) {
      for (const hit of provider.findHits(ray, s.range, s.hitRadius)) found.push({ ...hit, provider });
    }
    found.sort((a, b) => a.along - b.along);
    const hits = current === 'shotgun' ? found : found.slice(0, 1);
    for (const h of hits) h.provider.hit(h.target, current);
    if (hits.length > 1) game.message(`💥 ${hits.length} på ét skud!`);

    if (!hits.length && ray.direction.y < 0) {
      // Ramte vi søen? Så sprøjter det
      const t = (game.waterLevel - ray.origin.y) / ray.direction.y;
      const point = ray.at(t, new THREE.Vector3());
      if (t < s.range && game.isInLake(point.x, point.z)) effects.splash(point);
    }
    game.emit('shot', { hit: hits.length > 0, loud: true });
    if (gun.loaded === 0 && reserve > 0) startReload();
  }

  function select(id) {
    if (id === current) return;
    const item = SHOP_ID[id] ?? id;
    if (id !== 'rifle' && !shop.has(item)) return;
    current = id;
    reloading = 0;
    game.message({ rifle: '🔫 Gevær', shotgun: '💥 Haglgevær', bigRifle: '🐻 Riffel', rod: '🎣 Fiskestang', bow: '🏹 Bue', detector: '🔍 Metaldetektor' }[id]);
  }

  shop.addItem({
    id: 'ammo',
    category: 'udstyr',
    emoji: '🎯',
    name: 'Patroner',
    consumable: true,
    price: cfg.ammoPrice,
    text: `${cfg.ammoPack} patroner mere i tasken`,
    current: () => `Du har ${reserve} i tasken`,
    onBuy() {
      reserve += cfg.ammoPack;
    },
  });

  shop.addItem({
    id: 'betterGun',
    category: 'udstyr',
    emoji: '🔫',
    name: 'Bedre gevær',
    basePrice: config.prices.betterGun,
    levels: cfg.rifle.upgrades.map((u) => ({ text: `Skyder hurtigere, ${u.range} m langt, ${u.magazine} skud i magasinet` })),
    current: () => `${stats('rifle').range} m rækkevidde, ${stats('rifle').magazine} skud i magasinet`,
    onBuy(level, { loading }) {
      if (!loading) game.message('🔫 Dit gevær er blevet bedre!');
    },
  });

  shop.addItem({
    id: 'shotgun',
    category: 'udstyr',
    emoji: '💥',
    name: 'Haglgevær',
    basePrice: config.prices.shotgun,
    levels: [{ text: 'Rammer bredt, men ikke så langt. Skift med 1 og 2' }],
    onBuy(level, { loading }) {
      if (!loading) {
        game.message('💥 Tryk 2 for haglgeværet');
        select('shotgun');
      }
    },
  });

  shop.addItem({
    id: 'bigRifle',
    category: 'udstyr',
    emoji: '🐻',
    name: 'Riffel',
    basePrice: cfg.bigRifle.price,
    requires: () => (shop.has('car') ? null : 'Kræver bilen'),
    levels: [{ text: 'Kraftig riffel med kikkert. Den eneste der kan nedlægge en bjørn. Tryk 3' }],
    onBuy(level, { loading }) {
      if (!loading) {
        game.message('🐻 Tryk 3 for riflen');
        select('bigRifle');
      }
    },
  });

  shop.addItem({
    id: 'bow',
    category: 'udstyr',
    emoji: '🏹',
    name: 'Bue og pil',
    basePrice: config.prices.bow,
    levels: [{ text: 'Lydløs, så dyrene ikke bliver bange. Pilene kan samles op. Tryk 5' }],
    onBuy(level, { loading }) {
      if (!loading) {
        state.arrows = (state.arrows ?? 0) + cfg.bow.startArrows;
        game.message('🏹 Tryk 5 for buen');
        select('bow');
      }
    },
  });

  shop.addItem({
    id: 'arrows',
    category: 'udstyr',
    emoji: '➶',
    name: 'Pile',
    consumable: true,
    price: config.prices.arrows,
    requires: () => (shop.has('bow') ? null : 'Kræver buen'),
    text: '10 pile mere',
    current: () => `Du har ${state.arrows ?? 0} pile`,
    onBuy() {
      state.arrows = (state.arrows ?? 0) + 10;
    },
  });

  shop.addItem({
    id: 'binoculars',
    category: 'udstyr',
    emoji: '👀',
    name: 'Kikkert',
    basePrice: config.prices.binoculars,
    levels: [{ text: 'Tryk B for at spejde efter dyr langt væk' }],
    onBuy(level, { loading }) {
      if (!loading) game.message('👀 Tryk B for kikkerten');
    },
  });

  shop.addItem({
    id: 'scope',
    category: 'udstyr',
    emoji: '🔭',
    name: 'Kikkertsigte',
    basePrice: config.prices.scope,
    levels: [{ text: 'Zoom ind med geværet: højreklik eller Z. Tryk igen for at zoome ud' }],
    onBuy() {
      guns.rifle.hand.userData.scope.visible = true;
      guns.rifle.figure.userData.scope.visible = true;
    },
  });

  game.remember('weapon', {
    save: () => ({ current, reserve, rifle: guns.rifle.loaded, shotgun: guns.shotgun.loaded, bigRifle: guns.bigRifle.loaded }),
    load(data) {
      reserve = data.reserve ?? reserve;
      for (const id of Object.keys(guns)) guns[id].loaded = data[id] ?? guns[id].loaded;
      if (data.current && data.current !== 'rifle' && shop.has(data.current)) current = data.current;
      if (SHOP_ID[data.current] && shop.has(SHOP_ID[data.current])) current = data.current;
    },
  });

  return {
    // Hvor meget der er zoomet ind (1 = ingen zoom). Bruges til at gøre musen langsommere.
    get zoom() { return zoom; },
    get current() { return current; },
    addAmmo(n) {
      reserve += n;
    },
    // Spidsen af fiskestangen (i verden), så fiskelinen kan tegnes derfra
    rodTip(target) {
      const rod = player.mode === 'first' ? guns.rod.hand : guns.rod.figure;
      return rod.userData.tip.getWorldPosition(target);
    },

    update(dt) {
      // Man kan ikke skyde, mens man kører bil eller tager billeder
      if (player.vehicle?.drive || game.photo?.on) {
        binoOn = false;
        binoEl.classList.remove('on');
        for (const gun of Object.values(guns)) gun.hand.visible = gun.figure.visible = false;
        scopeOn = false;
        if (camera.fov !== config.camera.fov) {
          camera.fov = config.camera.fov;
          camera.updateProjectionMatrix();
        }
        zoom = 1;
        scopeEl.classList.remove('on');
        return;
      }
      if (input.wasPressed('Digit1')) select('rifle');
      if (input.wasPressed('Digit2')) select('shotgun');
      if (input.wasPressed('Digit3')) select('bigRifle');
      if (input.wasPressed('Digit4')) select('rod');
      if (input.wasPressed('Digit5')) select('bow');
      if (input.wasPressed('Digit6')) select('detector');

      // Saml pile op
      for (let i = arrows.length - 1; i >= 0; i--) {
        const a = arrows[i];
        if (Math.hypot(a.position.x - player.position.x, a.position.z - player.position.z) < 1.5) {
          game.scene.remove(a);
          arrows.splice(i, 1);
          state.arrows = (state.arrows ?? 0) + 1;
          sound.pickup();
        }
      }
      if (input.wasPressed('KeyR') && !TOOLS.includes(current) && current !== 'bow') startReload();

      if (shop.has('binoculars') && input.wasPressed('KeyB')) {
        binoOn = !binoOn;
        scopeOn = false;
      }

      cooldown -= dt;
      if (TOOLS.includes(current) || binoOn) {
        // Fiskestangen og metaldetektoren skyder ikke (se fishing.js og treasure.js)
      } else if (current === 'bow') {
        if (input.clicked && cooldown <= 0) shootBow();
      } else if (reloading > 0) {
        reloading -= dt;
        if (reloading <= 0) finishReload();
      } else if (input.clicked && cooldown <= 0) {
        shoot();
      }

      // Kikkertsigte
      // Kikkert: på geværet (hvis købt) og altid på riflen
      const canScope = (id) => id === 'bigRifle' || (id === 'rifle' && shop.has('scope'));
      if (input.rightClicked || input.wasPressed('KeyZ')) {
        if (!canScope(current) && shop.has('scope')) select('rifle');
        if (canScope(current)) scopeOn = !scopeOn;
      }
      if (!canScope(current)) scopeOn = false;
      const scoped = scopeOn && reloading <= 0;
      const targetZoom = binoOn ? cfg.binocularZoom : scoped ? cfg.scopeZoom : 1;
      binoEl.classList.toggle('on', binoOn && zoom > 2);
      zoom += (targetZoom - zoom) * Math.min(1, dt * 12);
      const fov = config.camera.fov / zoom;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      scopeEl.classList.toggle('on', zoom > 2 && !binoOn);

      // Vis det rigtige våben
      for (const [id, gun] of Object.entries(guns)) {
        gun.hand.visible = id === current && player.mode === 'first' && zoom < 2;
        gun.figure.visible = id === current;
      }

      kick = Math.max(0, kick - dt * 6);
      const gun = guns[current];
      const dip = reloading > 0 ? Math.sin((reloading / stats().reloadTime) * Math.PI) * 0.25 : 0;
      gun.hand.position.set(handBase.x, handBase.y + kick * 0.03 - dip, handBase.z + kick * 0.12);
      gun.hand.rotation.x = kick * 0.25 - dip;
      gun.figure.rotation.x = kick * 0.2 - dip;

      flashTime -= dt;
      for (const g of Object.values(guns)) {
        g.hand.userData.flash.visible = false;
        g.figure.userData.flash.visible = false;
      }
      if (flashTime > 0) {
        const flash = (player.mode === 'first' ? gun.hand : gun.figure).userData.flash;
        flash.visible = true;
        flash.rotation.z = Math.random() * Math.PI;
      }

      const icon = { rifle: '🔫', shotgun: '💥', bigRifle: '🐻' }[current];
      const reloadText = reloading > 0 ? '<small>lader om...</small><br>' : '';
      const html = current === 'rod' ? '🎣 Fiskestang'
        : current === 'detector' ? '🔍 Metaldetektor'
        : current === 'bow' ? `🏹 ${state.arrows ?? 0} pile`
        : `${reloadText}${icon} ${gun.loaded}/${stats().magazine} <small>· 🎒 ${reserve}</small>`;
      if (html !== lastAmmo) ammoEl.innerHTML = lastAmmo = html;
    },
  };
}
