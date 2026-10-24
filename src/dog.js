import * as THREE from 'three';
import { box, pivot } from './models.js';
import { makeCarcass } from './catalog.js';

// Hundene: de henter ænder der er skudt ned og lægger dem ved bålet.
// Først køber man Bobby, og senere kan man købe hund nummer 2.
// Opgraderinger (bære flere, løbe hurtigere, pynt) gælder for alle hundene.

function makeDogModel(fur, dark, snout) {
  const dog = new THREE.Group();

  const legs = [];
  for (const [x, z] of [[-0.17, 0.32], [0.17, 0.32], [-0.17, -0.32], [0.17, -0.32]]) {
    const leg = pivot(x, 0.45, z, box(0.14, 0.45, 0.14, fur, 0, -0.22, 0));
    legs.push(leg);
    dog.add(leg);
  }

  const glasses = new THREE.Group();
  glasses.add(
    box(0.38, 0.04, 0.03, 0x111111, 0, 0.1, 0.215),
    box(0.14, 0.1, 0.03, 0x111111, -0.1, 0.07, 0.22),
    box(0.14, 0.1, 0.03, 0x111111, 0.1, 0.07, 0.22),
  );
  glasses.visible = false;

  const head = new THREE.Group();
  head.position.set(0, 0.85, 0.5);
  head.add(
    box(0.4, 0.38, 0.4, fur),
    box(0.24, 0.18, 0.22, snout, 0, -0.08, 0.28),         // snude
    box(0.1, 0.08, 0.06, 0x222222, 0, -0.02, 0.4),        // næse
    box(0.06, 0.06, 0.02, 0x222222, -0.1, 0.07, 0.21),    // øje
    box(0.06, 0.06, 0.02, 0x222222, 0.1, 0.07, 0.21),     // øje
    box(0.1, 0.26, 0.16, dark, -0.24, -0.02, -0.02),      // øre
    box(0.1, 0.26, 0.16, dark, 0.24, -0.02, -0.02),       // øre
    glasses,
  );

  const scarf = new THREE.Group();
  scarf.add(box(0.46, 0.14, 0.14, 0xd8323c, 0, 0.66, 0.4), box(0.2, 0.16, 0.08, 0xd8323c, 0, 0.53, 0.47));
  scarf.visible = false;

  const tail = pivot(0, 0.75, -0.48, box(0.08, 0.08, 0.38, fur, 0, 0.08, -0.17));
  tail.rotation.x = -0.6;

  const body = new THREE.Group();   // alt undtagen benene, så hunden kan lægge sig
  body.add(
    box(0.42, 0.38, 0.95, fur, 0, 0.6, 0),                // krop
    box(0.44, 0.08, 0.1, 0x2f6fd8, 0, 0.72, 0.38),        // halsbånd
    head,
    tail,
    scarf,
  );
  dog.add(body);
  return { mesh: dog, body, legs, head, tail, scarf, glasses };
}

export function createDogs(game) {
  const { config, scene, campfire, player, sound, shop } = game;
  const cfg = config.dog;

  const dogs = [];
  let capacity = 0;
  let treatUntil = 0;
  let stay = false;   // G: hundene bliver hvor de er
  const accessories = { scarf: false, glasses: false };

  const andOrDucks = (n) => `${n} ${n === 1 ? 'and' : 'ænder'}`;

  function speed() {
    const level = shop.level('dogSpeed');
    let s = cfg.speed * (level ? cfg.speedUpgrades[level - 1] : 1);
    if (game.time < treatUntil) s *= cfg.treatBoost;
    return s;
  }

  function addDog(name, colors) {
    const model = makeDogModel(...colors);
    const shopPos = config.shop.position;
    const dog = {
      name,
      model,
      position: new THREE.Vector3(shopPos.x + 2 + dogs.length, 0, shopPos.z + 2),
      carried: [],      // det hunden bærer, fx ['duck', 'pheasant']
      carriedModels: [],
      task: 'follow',   // 'follow', 'fetch', 'deliver' eller 'sleep'
      target: null,
      walkPhase: 0,
      stuckTime: 0,
      step: new THREE.Vector3(),
    };
    model.mesh.position.copy(dog.position);
    model.scarf.visible = accessories.scarf;
    model.glasses.visible = accessories.glasses;
    scene.add(model.mesh);
    dogs.push(dog);
    return dog;
  }

  // Viser det hunden bærer: én ting i munden, resten på ryggen
  function updateCarried(dog) {
    for (const m of dog.carriedModels) m.parent.remove(m);
    dog.carriedModels = [];
    dog.carried.forEach((type, i) => {
      const holder = new THREE.Group();
      holder.add(makeCarcass(type));
      if (i === 0) {
        holder.scale.setScalar(0.5);
        holder.position.set(0, -0.2, 0.42);
        holder.rotation.set(0, Math.PI / 2, 0);
        dog.model.head.add(holder);
      } else {
        holder.scale.setScalar(0.45);
        holder.position.set(0, 0.88 + (i - 1) * 0.25, -0.05);
        holder.rotation.set(0, i * 0.8, 0);
        dog.model.body.add(holder);
      }
      dog.carriedModels.push(holder);
    });
  }

  // Nærmeste vildt på jorden i samme område, som ingen anden hund er på vej hen til
  function nearestFree(dog) {
    let best = null;
    let bestDistance = Infinity;
    for (const provider of game.pickups) {
      for (const item of provider.grounded()) {
        if (dogs.some((d) => d !== dog && d.target?.item === item)) continue;
        const d = item.mesh.position.distanceTo(dog.position);
        if (d < bestDistance && d < 120) {
          best = { item, provider };
          bestDistance = d;
        }
      }
    }
    return best;
  }

  const canSleep = () => game.dayNight.isNight && shop.has('dogBasket') && game.shelter.built;

  function decide(dog) {
    if (stay) {
      dog.target = null;
      dog.task = 'stay';
      return;
    }
    dog.target = dog.carried.length < capacity ? nearestFree(dog) : null;
    if (dog.target) dog.task = 'fetch';
    else if (dog.carried.length > 0) dog.task = 'deliver';
    else if (canSleep()) dog.task = 'sleep';
    else dog.task = 'follow';
  }

  // Går mod et mål. Returnerer false, når hunden er fremme (eller sidder fast bag noget).
  function moveTowards(dog, goal, spd, dt, stopDistance) {
    const { position, step } = dog;
    step.set(goal.x - position.x, 0, goal.z - position.z);
    const distance = step.length();
    if (distance <= stopDistance + 0.05) {
      dog.stuckTime = 0;
      return false;
    }
    if (game.isInLake(position.x, position.z)) spd *= 0.6;
    step.setLength(Math.min(distance - stopDistance, spd * dt));
    position.add(step);
    game.pushOut(position, 0.4);
    dog.model.mesh.rotation.y = Math.atan2(step.x, step.z);
    dog.walkPhase += dt * spd * 2.2;

    const progress = distance - Math.hypot(goal.x - position.x, goal.z - position.z);
    dog.stuckTime = progress < spd * dt * 0.1 ? dog.stuckTime + dt : 0;
    if (dog.stuckTime > 1.5) {
      dog.stuckTime = 0;
      return false;
    }
    return true;
  }

  function updateDog(dog, index, dt) {
    const { position, model } = dog;

    // Er målet væk (fx fordi spilleren selv tog anden)? Så find på noget nyt.
    if (dog.task !== 'fetch' || !dog.target.provider.grounded().includes(dog.target.item)) decide(dog);

    let moving = false;
    let lying = false;
    if (dog.task === 'fetch') {
      moving = moveTowards(dog, dog.target.item.mesh.position, speed(), dt, 0.9);
      if (!moving) {
        dog.target.provider.take(dog.target.item);
        dog.carried.push(dog.target.item.type);
        updateCarried(dog);
        const distance = position.distanceTo(player.position);
        sound.bark(0.5 * Math.max(0, 1 - distance / 50));
        decide(dog);
      }
    } else if (dog.task === 'deliver') {
      // I lejren lægger hundene vildtet ved bålet, i Storskoven giver de det til dig
      const home = game.areaAt(position.x, position.z) === game.areas.home;
      if (!home && game.area !== game.areaAt(position.x, position.z)) return;   // venter på at spilleren kommer tilbage
      moving = moveTowards(dog, home ? campfire.pilePosition : player.position, speed(), dt, home ? 1.2 : 1.8);
      if (!moving) {
        const what = dog.carried.length === 1 ? game.foodName(dog.carried[0]) : `${dog.carried.length} ting`;
        if (home) {
          campfire.addToPile(dog.carried);
          game.message(`🐕 ${dog.name} lagde ${what} ved bålet`);
        } else {
          for (const type of dog.carried) game.addToBag(type);
          game.message(`🐕 ${dog.name} gav dig ${what}`);
        }
        dog.carried = [];
        updateCarried(dog);
        decide(dog);
      }
    } else if (dog.task === 'stay') {
      moving = false;
    } else if (dog.task === 'sleep') {
      const basket = game.shelter.basketPosition;
      const spot = { x: basket.x + index * 0.5, z: basket.z };
      moving = moveTowards(dog, spot, speed(), dt, 0.05);
      lying = !moving;
    } else if (game.areaAt(position.x, position.z) !== game.area) {
      // Spilleren er i et andet område (kørt uden trailer), så hunden venter her
      moving = false;
    } else {
      // Følg efter spilleren, løb hurtigere hvis den er langt væk
      const far = position.distanceTo(player.position) > 8;
      const goal = { x: player.position.x + index * 1.2, z: player.position.z + index * 0.8 };
      moving = moveTowards(dog, goal, far ? speed() : config.player.walkSpeed, dt, 2.5);
    }

    // Animation
    position.y = Math.max(game.groundHeight(position.x, position.z), -0.3);
    model.mesh.position.copy(position);
    const swing = moving ? Math.sin(dog.walkPhase) * 0.7 : 0;
    model.legs.forEach((leg, i) => {
      const target = lying ? -1.4 : i % 3 === 0 ? swing : -swing;
      leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, target, 0.3);
    });
    model.body.position.y = THREE.MathUtils.lerp(model.body.position.y, lying ? -0.3 : 0, 0.1);
    const happy = game.time < (dog.happyUntil ?? 0);
    model.tail.rotation.y = lying ? 0 : Math.sin(game.time * (happy ? 30 : moving ? 10 : 16)) * (happy ? 0.9 : 0.6);
    model.body.rotation.x = THREE.MathUtils.lerp(model.body.rotation.x, dog.task === 'stay' ? -0.35 : 0, 0.1);   // sidder ned
    if (!moving && dog.task === 'follow') {
      // Kig på spilleren, når den står stille
      model.mesh.rotation.y = Math.atan2(player.position.x - position.x, player.position.z - position.z);
    }
  }

  function setAccessory(name, on) {
    accessories[name] = on;
    for (const dog of dogs) dog.model[name].visible = on;
  }

  // --- Varer i butikken ---
  const needsDog = () => (dogs.length ? null : `Kræver hunden ${cfg.name}`);

  shop.addItem({
    id: 'dog',
    category: 'hund',
    emoji: '🐕',
    name: `Hunden ${cfg.name}`,
    basePrice: cfg.price,
    levels: cfg.capacity.map((c, i) => ({
      text: i === 0
        ? `Køb ${cfg.name}! Den henter ænder og lægger dem ved bålet`
        : `Hundene kan bære ${andOrDucks(c)} ad gangen`,
    })),
    current: () => (dogs.length ? `Hundene kan bære ${andOrDucks(capacity)} ad gangen` : 'Du har ingen hund endnu'),
    onBuy(level, { loading }) {
      if (!dogs.length) addDog(cfg.name, [0xd9a24a, 0x9a6a2a, 0xe8bd72]);
      capacity = cfg.capacity[level - 1];
      if (loading) return;
      sound.bark();
      game.message(level === 1 ? `🐕 Du har fået ${cfg.name}!` : `🐕 Hundene kan nu bære ${andOrDucks(capacity)}!`);
    },
  });

  shop.addItem({
    id: 'dogSpeed',
    category: 'hund',
    emoji: '💨',
    name: 'Hurtigere hunde',
    basePrice: cfg.speedPrice,
    requires: needsDog,
    levels: cfg.speedUpgrades.map((f) => ({ text: `Hundene løber ${Math.round((f - 1) * 100)}% hurtigere` })),
    onBuy() {},
  });

  shop.addItem({
    id: 'dogTreat',
    category: 'hund',
    emoji: '🦴',
    name: 'Hundekiks',
    consumable: true,
    price: config.prices.dogTreat,
    requires: needsDog,
    text: `Hundene løber ekstra hurtigt i ${cfg.treatSeconds} sekunder`,
    onBuy() {
      treatUntil = game.time + cfg.treatSeconds;
      sound.bark();
      game.message('🦴 Mums! Hundene har fået kiks');
    },
  });

  shop.addItem({
    id: 'dogBasket',
    category: 'hund',
    emoji: '🧺',
    name: 'Hundekurv',
    basePrice: config.prices.dogBasket,
    requires: () => needsDog() ?? (game.shelter.built ? null : 'Kræver shelteret'),
    levels: [{ text: 'Hundene sover i shelteret om natten' }],
    onBuy(level, { loading }) {
      game.shelter.addBasket();
      if (!loading) game.message('🧺 Kurven står i shelteret');
    },
  });

  shop.addItem({
    id: 'secondDog',
    category: 'hund',
    emoji: '🐩',
    name: `Hunden ${cfg.secondName}`,
    basePrice: config.prices.secondDog,
    requires: needsDog,
    levels: [{ text: `En hund mere, der hjælper ${cfg.name}` }],
    onBuy(level, { loading }) {
      addDog(cfg.secondName, [0x2a2a2a, 0x111111, 0xf2f2f2]);
      if (!loading) {
        sound.bark();
        game.message(`🐩 Du har fået ${cfg.secondName}!`);
      }
    },
  });

  for (const [id, name, emoji, part] of [
    ['dogScarf', 'Tørklæde til hundene', '🧣', 'scarf'],
    ['dogGlasses', 'Solbriller til hundene', '🕶️', 'glasses'],
  ]) {
    shop.addItem({
      id,
      category: 'pynt',
      emoji,
      name,
      cosmetic: true,
      price: config.prices[id],
      requires: needsDog,
      onEquip: (on) => setAccessory(part, on),
    });
  }

  game.remember('dog', {
    save: () => dogs.map((d) => ({ x: d.position.x, z: d.position.z, carried: d.carried })),
    load(data) {
      const list = Array.isArray(data) ? data : data ? [data] : [];   // ældre gem havde kun én hund
      list.forEach((saved, i) => {
        const dog = dogs[i];
        if (!dog || !saved) return;
        dog.position.set(saved.x, 0, saved.z);
        // Ældre gem havde bare et tal (og det var altid ænder)
        dog.carried = Array.isArray(saved.carried) ? saved.carried : Array(saved.carried || 0).fill('duck');
        updateCarried(dog);
      });
    },
  });

  return {
    list: dogs,
    get owned() { return dogs.length > 0; },

    update(dt) {
      if (dogs.length && game.input.wasPressed('KeyG')) {
        stay = !stay;
        dogs.forEach(decide);
        sound.bark(0.3);
        game.message(stay ? '🐕 "Bliv!" Hundene sætter sig' : '🐕 "Kom og hent!"');
      }
      dogs.forEach((dog, i) => updateDog(dog, i, dt));
    },

    // Klap en hund (kører til sidst, så E først bruges til bål, bil osv.)
    petUpdate() {
      if (game.player.vehicle || game.hud.hasPrompt) return;
      const dog = dogs.find((d) => game.isPlayerNear(d.position, 1.9));
      if (!dog) return;
      game.hud.setPrompt(`Tryk <b>E</b> for at klappe ${dog.name} 🐕`);
      if (game.input.consume('KeyE')) {
        dog.happyUntil = game.time + 2.5;
        sound.happy();
        game.effects.burst(dog.position.clone().setY(dog.position.y + 1.3), { count: 6, colors: [0xff6fa8, 0xff3a7a], size: 0.15, speed: 1, up: 2, gravity: 1, life: 1.2 });
        game.message(`❤️ ${dog.name} er glad!`);
        game.emit('petted');
      }
    },
  };
}
