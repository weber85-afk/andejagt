import * as THREE from 'three';
import { box, textSign } from './models.js';

// Røgeriet: ryger ænder helt af sig selv og brænder dem aldrig.
// Det tager ænder fra bunken ved bålet, og man kan aflevere sine egne med E.
export function createSmokehouse(game) {
  const { config, scene, state, campfire, effects, sound, hud, input, shop } = game;
  const cfg = config.smokehouse;
  const pos = new THREE.Vector3(cfg.position.x, 0, cfg.position.z);

  let built = false;
  const racks = [];   // det der ryges: { type, time } hvor time er sekunder tilbage
  let smokeTimer = 0;

  function build({ loading }) {
    if (built) return;
    built = true;
    const house = new THREE.Group();
    house.position.copy(pos);
    house.rotation.y = Math.atan2(campfire.position.x - pos.x, campfire.position.z - pos.z);   // døren vender mod bålet
    house.add(
      box(2.4, 2.2, 2.4, 0x9a8a7a, 0, 1.1, 0, 'stone'),   // stenhus
      box(2.7, 0.2, 2.7, 0x5a3a1e, 0, 2.3, 0),            // tag
      box(1.9, 0.5, 1.9, 0x5a3a1e, 0, 2.6, 0),
      box(0.5, 1.2, 0.5, 0x7a6a5a, 0.6, 3.2, -0.5),       // skorsten
      box(0.9, 1.5, 0.05, 0x5a3a1e, 0, 0.75, 1.21),       // dør
    );
    const sign = textSign(['🏭 Røgeri'], { width: 1.6, height: 0.45 });
    sign.position.set(0, 1.85, 1.25);
    house.add(sign);
    scene.add(house);
    game.colliders.push({ x: pos.x, z: pos.z, r: 1.6 });
    house.updateMatrixWorld();
    chimney.copy(new THREE.Vector3(0.6, 3.9, -0.5)).applyMatrix4(house.matrixWorld);
    if (!loading) game.message('🏭 Røgeriet er bygget! Det tager selv ænder fra bålet');
  }
  const chimney = new THREE.Vector3();

  shop.addItem({
    id: 'smokehouse',
    category: 'mad',
    emoji: '🏭',
    name: 'Røgeri',
    basePrice: cfg.price,
    levels: [{ text: `Ryger ${cfg.capacity} stykker vildt ad gangen helt af sig selv og brænder det aldrig` }],
    onBuy: (level, options) => build(options),
  });

  game.remember('smokehouse', {
    save: () => racks.map((r) => ({ ...r })),
    load(data) {
      // Ældre gem havde kun tiden (og det var altid ænder)
      racks.push(...data.map((r) => (typeof r === 'number' ? { type: 'duck', time: r } : r)));
    },
  });

  return {
    update(dt) {
      if (!built) return;

      // Tag vildt fra bunken ved bålet
      let type;
      while (racks.length < cfg.capacity && (type = campfire.takeFromPile())) racks.push({ type, time: cfg.smokeTime });

      for (let i = racks.length - 1; i >= 0; i--) {
        const rack = racks[i];
        rack.time -= dt;
        if (rack.time <= 0) {
          racks.splice(i, 1);
          state.cooked++;
          sound.ding();
          game.message(`🏭 Røgeriet har røget en ${config.foods[rack.type].name}! +${game.score.cookedPoints(rack.type)}`);
          game.emit('foodCooked', { type: rack.type });
        }
      }

      smokeTimer -= dt;
      if (racks.length && smokeTimer <= 0) {
        smokeTimer = 0.35;
        effects.smoke(chimney);
      }

      if (!game.isPlayerNear(pos, 3.2)) return;
      const free = cfg.capacity - racks.length;
      const inBag = game.bagCount();
      let text = racks.length ? `🏭 Røgeriet ryger ${racks.map((r) => config.foods[r.type].emoji).join(' ')}` : '🏭 Røgeriet er tomt';
      if (free > 0 && inBag > 0) text = 'Tryk <b>E</b> for at lægge dit vildt i røgeriet';
      const bars = racks.map((r) => `<div class="bar"><div style="width:${Math.round((1 - r.time / cfg.smokeTime) * 100)}%;background:#9a8a7a"></div></div>`).join('');
      hud.setPrompt(text + bars);
      if (input.consume('KeyE') && free > 0 && inBag > 0) {
        const n = Math.min(free, inBag);
        for (let i = 0; i < n; i++) racks.push({ type: game.takeFromBag(), time: cfg.smokeTime });
        game.message(`🏭 ${n} ting i røgeriet`);
      }
    },
  };
}
