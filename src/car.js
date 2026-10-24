import * as THREE from 'three';
import * as models from './models.js';
import { box, glow, signPost } from './models.js';

// Bilen: kør med WASD, kør ad grusvejen til Storskoven og hjem igen.
// Den bruger benzin, men kan altid køre langsomt på reservetanken.

function makeCar() {
  const red = 0xc0392b;
  const glass = 0x2a4a6a;
  const car = new THREE.Group();
  const body = new THREE.Group();   // alt der vipper med bakkerne
  car.add(body);
  body.add(
    box(2.0, 0.6, 4.2, red, 0, 0.75, 0),               // underdel
    box(1.8, 0.8, 1.8, red, 0, 1.45, 0.45),            // førerhus
    box(1.82, 0.5, 0.05, glass, 0, 1.55, 1.36),        // forrude
    box(0.05, 0.45, 1.5, glass, -0.91, 1.55, 0.45),    // sideruder
    box(0.05, 0.45, 1.5, glass, 0.91, 1.55, 0.45),
    box(1.82, 0.4, 0.05, glass, 0, 1.55, -0.46),       // bagrude
    box(2.0, 0.35, 0.1, red, 0, 1.2, -2.05),           // ladet
    box(0.1, 0.35, 2.1, red, -0.95, 1.2, -1.05),
    box(0.1, 0.35, 2.1, red, 0.95, 1.2, -1.05),
    box(2.1, 0.2, 0.2, 0x444444, 0, 0.55, 2.15),       // kofangere
    box(2.1, 0.2, 0.2, 0x444444, 0, 0.55, -2.15),
  );
  const lights = [];
  for (const x of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.06), glow(0xfff2c0, 1));
    lamp.position.set(x, 0.9, 2.11);
    body.add(lamp);
    lights.push(lamp);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.06), glow(0xff2a2a, 1.5));
    tail.position.set(x, 0.9, -2.11);
    body.add(tail);
  }
  const wheels = [];
  for (const [x, z] of [[-1.05, 1.35], [1.05, 1.35], [-1.05, -1.35], [1.05, -1.35]]) {
    const wheel = new THREE.Group();
    wheel.position.set(x, 0.38, z);
    wheel.add(box(0.32, 0.76, 0.76, 0x222222), box(0.34, 0.3, 0.3, 0x9a9a9a));
    body.add(wheel);
    wheels.push(wheel);
  }
  // Forlygter der lyser om natten
  const beams = [];
  for (const x of [-0.7, 0.7]) {
    const beam = new THREE.SpotLight(0xfff2d0, 0, 40, 0.5, 0.6, 1);
    beam.position.set(x, 0.9, 2.2);
    beam.target.position.set(x, 0, 12);
    body.add(beam, beam.target);
    beams.push(beam);
  }
  // Lakken har sit eget materiale, så farven kan skiftes
  const paint = new THREE.MeshLambertMaterial({ color: red, map: models.material(red).map });
  body.traverse((m) => {
    if (m.isMesh && m.material === models.material(red)) m.material = paint;
  });
  return { car, body, wheels, lights, beams, paint };
}

function makeTrailer() {
  const t = new THREE.Group();
  t.add(
    box(1.8, 0.15, 2.2, 0x6b4423, 0, 0.7, 0, 'planks'),
    box(0.1, 0.5, 2.2, 0x8b5a2b, -0.9, 1.0, 0, 'planks'),
    box(0.1, 0.5, 2.2, 0x8b5a2b, 0.9, 1.0, 0, 'planks'),
    box(1.8, 0.5, 0.1, 0x8b5a2b, 0, 1.0, -1.1, 'planks'),
    box(0.15, 0.15, 1.4, 0x444444, 0, 0.6, 1.7),   // trækstang
    box(0.3, 0.6, 0.6, 0x222222, -1.0, 0.3, 0),
    box(0.3, 0.6, 0.6, 0x222222, 1.0, 0.3, 0),
  );
  return t;
}

export function createCar(game) {
  const { config, scene, shop, input, player, hud, sound } = game;
  const cfg = config.car;
  const homeArea = game.areas.home;
  const forestArea = game.areas.forest;
  const fuelEl = document.getElementById('fuel');

  let model = null;
  let trailer = null;
  const pos = new THREE.Vector3(homeArea.parking.x, 0, homeArea.parking.z);
  let heading = -Math.PI / 2;   // retning bilen kører (0 = mod +Z, -PI/2 = mod vest)
  let speed = 0;
  let fuel = cfg.tank;
  let warnedEmpty = false;
  let traveling = false;
  let lastHtml = '';
  let radioOn = false;
  let paintColor = null;

  // Skilte ved vejene
  const homeSign = signPost(['🌲 Storskoven', '→ Kør herud'], { width: 2.2, height: 0.8 });
  const homeEnd = homeArea.road[homeArea.road.length - 1];
  homeSign.position.set(homeEnd.x + 14, game.groundHeight(homeEnd.x + 14, homeEnd.z + 4), homeEnd.z + 4);
  homeSign.rotation.y = Math.PI / 2;
  const parkingSign = signPost(['🚗 Parkering', 'Køb en bil i butikken'], { width: 2.2, height: 0.8 });
  parkingSign.position.set(homeArea.parking.x, 0, homeArea.parking.z - 4);
  const forestSign = signPost(['🏕️ Lejren', 'Kør herud ←'], { width: 2.2, height: 0.8 });
  const forestEnd = forestArea.road[forestArea.road.length - 1];
  forestSign.position.set(forestEnd.x - 14, game.groundHeight(forestEnd.x - 14, forestEnd.z + 4), forestEnd.z + 4);
  forestSign.rotation.y = -Math.PI / 2;
  scene.add(homeSign, parkingSign, forestSign);

  // Man kan ikke gå igennem bilen (men bilen skal ikke støde ind i sig selv, når man kører)
  const collider = { x: pos.x, z: pos.z, r: 0 };
  game.colliders.push(collider);

  function buildCar() {
    if (model) return;
    model = makeCar();
    if (paintColor) model.paint.color.set(paintColor);
    scene.add(model.car);
    collider.r = 1.7;
    scene.remove(parkingSign);
    place();
  }

  const forwardVec = () => new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));

  // Sæt bilen (og traileren) på jorden og vip den efter bakkerne
  function place() {
    if (!model) return;
    pos.y = game.groundHeight(pos.x, pos.z);
    model.car.position.copy(pos);
    model.car.rotation.y = heading;
    const f = forwardVec();
    const front = game.groundHeight(pos.x + f.x * 1.6, pos.z + f.z * 1.6);
    const back = game.groundHeight(pos.x - f.x * 1.6, pos.z - f.z * 1.6);
    const left = game.groundHeight(pos.x + f.z * 0.9, pos.z - f.x * 0.9);
    const rightH = game.groundHeight(pos.x - f.z * 0.9, pos.z + f.x * 0.9);
    model.body.rotation.x = -Math.atan2(front - back, 3.2);
    model.body.rotation.z = Math.atan2(left - rightH, 1.8);
    if (trailer) {
      const tx = pos.x - f.x * 4.3;
      const tz = pos.z - f.z * 4.3;
      trailer.position.set(tx, game.groundHeight(tx, tz), tz);
      trailer.rotation.y = heading;
    }
  }

  const inCar = () => player.vehicle === vehicle;

  // Det der sker hver frame, mens man sidder i bilen
  const vehicle = {
    drive(dt) {
      const empty = fuel <= 0;
      const top = empty ? cfg.reserveSpeed : cfg.maxSpeed;
      const gas = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
      const steer = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);

      if (gas > 0) speed = Math.min(top, speed + cfg.acceleration * dt);
      else if (gas < 0) speed = Math.max(-cfg.reverseSpeed, speed - cfg.acceleration * 1.5 * dt);
      else speed *= 1 - Math.min(1, dt * 1.2);
      if (input.isDown('Space')) speed *= 1 - Math.min(1, dt * 5);
      if (Math.abs(speed) > top) speed = Math.sign(speed) * top;

      const turn = steer * cfg.turnSpeed * dt * Math.min(1, Math.abs(speed) / 4) * Math.sign(speed || 1);
      heading += turn;
      player.addYaw(turn);

      const old = pos.clone();
      pos.addScaledVector(forwardVec(), speed * dt);
      const before = pos.clone();
      game.pushOut(pos, 1.3);
      if (pos.distanceTo(before) > 0.01) speed *= 0.5;   // ramte et træ eller en sten
      if (game.isInWater(pos.x, pos.z)) {
        pos.copy(old);
        if (Math.abs(speed) > 3) game.message('🌊 Bilen kan ikke sejle!');
        speed = 0;
      }
      game.clampToArea(pos, 2);
      const driven = pos.distanceTo(old);
      if (!empty) {
        fuel = Math.max(0, fuel - driven * cfg.fuelPerMeter);
        if (fuel === 0 && !warnedEmpty) {
          warnedEmpty = true;
          game.message('⛽ Tom tank! Bilen kører langsomt. Køb benzin i butikken');
        }
      }
      model.wheels.forEach((w) => { w.rotation.x += (speed * dt) / 0.38; });

      place();
      // Føreren sidder i venstre side af førerhuset
      const f = forwardVec();
      player.position.set(pos.x + f.z * 0.45 + f.x * 0.3, pos.y - 0.15, pos.z - f.x * 0.45 + f.z * 0.3);

      if (input.wasPressed('KeyH')) sound.horn();
      if (input.wasPressed('KeyR')) {
        radioOn = !radioOn;
        if (radioOn) sound.startMusic('radio');
        else sound.stopMusic();
        game.message(radioOn ? '📻 Radioen er tændt' : '📻 Radioen er slukket');
      }

      checkTravel();
    },
    cameraDistance: 8,
    get speed() { return speed; },
  };

  function enter() {
    collider.r = 0;
    player.setVehicle(vehicle);
    // Kig samme vej som bilen
    player.addYaw(heading + Math.PI - player.yaw);
    game.message('🚗 W = kør · S = bak · A/D = drej · E = stig ud');
  }

  function exit() {
    if (radioOn) {
      radioOn = false;
      sound.stopMusic();
    }
    player.setVehicle(null);
    collider.x = pos.x;
    collider.z = pos.z;
    collider.r = 1.7;
    const f = forwardVec();
    // Stig ud i venstre side
    player.teleport(pos.x + f.z * 2, pos.z - f.x * 2);
    game.pushOut(player.position, 0.35);
    speed = 0;
  }

  // --- Rejser: kører man ud for enden af vejen, kan man vælge hvor man vil hen ---
  const travelPanel = document.createElement('div');
  travelPanel.className = 'screen hidden';
  travelPanel.innerHTML = '<div class="panel"><h1>🗺️ Hvor vil du køre hen?</h1><div class="travel-buttons"></div><button class="small travel-close">Bliv her (E)</button></div>';
  document.body.appendChild(travelPanel);
  travelPanel.querySelector('.travel-close').addEventListener('click', () => game.screens.closeMenu(true));
  let menuOpen = false;

  const DESTINATIONS = [
    { area: homeArea, emoji: '🏕️', text: 'Lejren' },
    { area: forestArea, emoji: '🌲', text: 'Storskoven' },
    { area: game.areas.mountain, emoji: '⛰️', text: 'Fjeldet', needs: () => (shop.has('fourWheel') ? null : 'Kræver firehjulstræk') },
    { area: game.areas.sea, emoji: '🌊', text: 'Havet' },
  ];

  function checkTravel() {
    if (traveling || menuOpen) return;
    const area = game.areaAt(pos.x, pos.z);
    const end = area.road[area.road.length - 1];
    if (Math.hypot(pos.x - end.x, pos.z - end.z) > 12) return;
    speed = 0;
    const box = travelPanel.querySelector('.travel-buttons');
    box.innerHTML = '';
    for (const d of DESTINATIONS) {
      if (d.area === area) continue;
      const b = document.createElement('button');
      const locked = d.needs?.();
      b.textContent = `${d.emoji} ${d.text}${locked ? ` 🔒 ${locked}` : ''}`;
      b.disabled = !!locked;
      b.addEventListener('click', () => {
        menuOpen = false;
        game.screens.closeMenu(true);
        travel(d);
      });
      box.appendChild(b);
    }
    menuOpen = true;
    game.screens.openMenu(travelPanel);
  }

  function travel(dest) {
    traveling = true;
    speed = 0;
    hud.fade(true);
    setTimeout(() => {
      const target = dest.area;
      const road = target.road;
      const arrive = road[road.length - 2];
      const towards = road[road.length - 3] ?? target.parking;
      pos.set(arrive.x, 0, arrive.z);
      const newHeading = Math.atan2(towards.x - arrive.x, towards.z - arrive.z);
      player.addYaw(newHeading - heading);
      heading = newHeading;
      fuel = Math.max(0, fuel - cfg.travelFuel);
      place();
      vehicle.drive(0);
      // Hundene kommer med, hvis der er en trailer
      if (trailer) {
        game.dogs.list.forEach((dog, i) => {
          dog.position.set(pos.x - Math.sin(heading) * (6 + i), 0, pos.z - Math.cos(heading) * (6 + i));
        });
      }
      game.emit('traveled', { to: target.id });
      hud.fade(false);
      game.message(`${dest.emoji} Velkommen til ${dest.text}!`);
      if (target !== homeArea && !trailer && game.dogs.owned) setTimeout(() => game.message('🐕 Køb en trailer, så hundene kan komme med'), 2500);
      traveling = false;
    }, 1100);
  }

  shop.addItem({
    id: 'car',
    category: 'skov',
    emoji: '🚗',
    name: 'Bil',
    basePrice: cfg.price,
    levels: [{ text: 'Kør ad grusvejen til Storskoven, hvor der er nye dyr' }],
    onBuy(level, { loading }) {
      buildCar();
      if (!loading) game.message('🚗 Bilen holder på parkeringspladsen ved butikken');
    },
  });

  shop.addItem({
    id: 'fuel',
    category: 'skov',
    emoji: '⛽',
    name: 'Benzin',
    consumable: true,
    price: cfg.fuelPrice,
    requires: () => (model ? null : 'Kræver bilen'),
    text: 'Fyld tanken helt op',
    current: () => `Tanken er ${Math.round((fuel / cfg.tank) * 100)}% fuld`,
    onBuy() {
      fuel = cfg.tank;
      warnedEmpty = false;
      game.message('⛽ Tanken er fuld!');
    },
  });

  shop.addItem({
    id: 'trailer',
    category: 'skov',
    emoji: '🛻',
    name: 'Trailer',
    basePrice: cfg.trailerPrice,
    requires: () => (model ? null : 'Kræver bilen'),
    levels: [{ text: 'Hundene kommer med, når du kører til Storskoven' }],
    onBuy(level, { loading }) {
      if (!trailer) {
        trailer = makeTrailer();
        scene.add(trailer);
        place();
      }
      if (!loading) game.message('🛻 Traileren sidder bag på bilen');
    },
  });

  shop.addItem({
    id: 'fourWheel',
    category: 'skov',
    emoji: '⛰️',
    name: 'Firehjulstræk',
    basePrice: config.mountain.fourWheelPrice,
    requires: () => (model ? null : 'Kræver bilen'),
    levels: [{ text: 'Så kan bilen køre op på Fjeldet, hvor der er sne og stenbukke' }],
    onBuy(level, { loading }) {
      if (!loading) game.message('⛰️ Nu kan du køre til Fjeldet');
    },
  });

  // Nye farver til bilen (pynt)
  for (const c of config.carColors) {
    const hex = `#${c.color.toString(16).padStart(6, '0')}`;
    shop.addItem({
      id: `car-${c.id}`,
      category: 'pynt',
      emoji: `<span class="swatch" style="background:${hex}"></span>`,
      name: `${c.name} bil`,
      cosmetic: true,
      group: 'carColor',
      price: config.prices.carColor,
      requires: () => (model ? null : 'Kræver bilen'),
      onEquip(on) {
        paintColor = on ? c.color : null;
        if (model) model.paint.color.set(paintColor ?? 0xc0392b);
      },
    });
  }

  game.remember('car', {
    save: () => ({ x: pos.x, z: pos.z, heading, fuel }),
    load(data) {
      pos.set(data.x, 0, data.z);
      heading = data.heading;
      fuel = data.fuel ?? cfg.tank;
      collider.x = pos.x;
      collider.z = pos.z;
      place();
    },
  });

  return {
    get owned() { return !!model; },
    get position() { return pos; },
    get inCar() { return inCar(); },
    get radioOn() { return radioOn; },

    // Er menuen lukket uden at vælge et sted? Så bak lidt tilbage
    checkMenuClosed() {
      if (menuOpen && travelPanel.classList.contains('hidden')) {
        menuOpen = false;
        pos.addScaledVector(forwardVec(), -14);
        place();
        if (inCar()) vehicle.drive(0);
      }
    },

    update() {
      if (!model) return;
      this.checkMenuClosed();
      const driving = inCar();

      // Lygter om natten
      const dark = 1 - game.dayNight.light;
      model.beams.forEach((b) => { b.intensity = driving ? 30 * dark : 0; });
      model.lights.forEach((l) => l.material.color.setRGB(1, 0.95, 0.75).multiplyScalar(driving && dark > 0.3 ? 3 : 1));

      if (driving) {
        if (input.consume('KeyE') && Math.abs(speed) < 3) exit();
      } else if (game.isPlayerNear(pos, 3.2) && !player.vehicle) {
        hud.setPrompt(`Tryk <b>E</b> for at køre 🚗 <small>(⛽ ${Math.round((fuel / cfg.tank) * 100)}%)</small>`);
        if (input.consume('KeyE')) enter();
      }

      // Benzinmåler når man kører
      let html = '';
      if (driving) {
        const pct = fuel / cfg.tank;
        const color = pct > 0.3 ? '#6abf4b' : pct > 0 ? '#ffb13a' : '#e83a2b';
        html = `⛽ ${Math.round(pct * 100)}% · ${Math.round(Math.abs(speed) * 3.6)} km/t<div class="gauge"><div style="width:${Math.round(pct * 100)}%;background:${color}"></div></div>`;
      }
      if (html !== lastHtml) fuelEl.innerHTML = lastHtml = html;
    },
  };
}
