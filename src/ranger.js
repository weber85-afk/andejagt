import * as THREE from 'three';
import { box, signPost } from './models.js';

// Skovfogeden i Storskoven: giver opgaver og point, når man klarer dem.
// Nye opgaver kan tilføjes i listen herunder.
const MISSIONS = [
  { id: 'pheasants', text: 'Skyd 3 fasaner', event: 'animalHit', type: 'pheasant', count: 3, reward: 80 },
  { id: 'hares', text: 'Skyd 2 harer', event: 'animalHit', type: 'hare', count: 2, reward: 70 },
  { id: 'goose', text: 'Skyd en gås', event: 'animalHit', type: 'goose', count: 1, reward: 60 },
  { id: 'ducks', text: 'Skyd 5 ænder', event: 'animalHit', type: 'duck', count: 5, reward: 50 },
  { id: 'fish', text: 'Fang 2 fisk', event: 'fishCaught', count: 2, reward: 60, needs: 'fishingRod' },
  { id: 'cook', text: 'Steg 4 ting over bålet', event: 'foodCooked', count: 4, reward: 70 },
  { id: 'bear', text: 'Nedlæg en bjørn', event: 'animalHit', type: 'bear', count: 1, reward: 250, needs: 'bigRifle' },
];

export function createRanger(game) {
  const { config, scene, input, hud, shop, sound } = game;
  const fc = config.forest.center;
  const pos = new THREE.Vector3(fc.x + config.forest.ranger.x, 0, fc.z + config.forest.ranger.z);
  const missionEl = document.getElementById('mission');
  let mission = null;   // { id, progress }
  let last = null;
  let lastHtml = '';

  // Skovfogeden
  const ranger = new THREE.Group();
  const green = 0x3d5a2a;
  ranger.add(
    box(0.24, 0.8, 0.28, 0x3a3a2a, -0.14, 0.4, 0),
    box(0.24, 0.8, 0.28, 0x3a3a2a, 0.14, 0.4, 0),
    box(0.7, 0.75, 0.4, green, 0, 1.15, 0),
    box(0.2, 0.7, 0.24, green, -0.46, 1.15, 0),
    box(0.2, 0.7, 0.24, green, 0.46, 1.15, 0),
    box(0.48, 0.48, 0.48, 0xf2c49b, 0, 1.78, 0),
    box(0.08, 0.08, 0.02, 0x222222, -0.11, 1.82, 0.25),
    box(0.08, 0.08, 0.02, 0x222222, 0.11, 1.82, 0.25),
    box(0.3, 0.12, 0.04, 0x8a6a45, 0, 1.65, 0.25),       // skæg
    box(0.75, 0.06, 0.75, 0x5a4a2a, 0, 2.04, 0),         // hat
    box(0.45, 0.25, 0.45, 0x5a4a2a, 0, 2.18, 0),
    box(0.15, 0.15, 0.04, 0xf2c22b, -0.2, 1.35, 0.21),   // skilt på jakken
  );
  ranger.position.copy(pos);
  scene.add(ranger);
  game.colliders.push({ x: pos.x, z: pos.z, r: 0.5 });
  const sign = signPost(['🧑‍🌾 Skovfogeden', 'Tryk E for opgaver'], { width: 2, height: 0.7 });
  sign.position.set(pos.x + 2, game.groundHeight(pos.x + 2, pos.z), pos.z);
  scene.add(sign);

  const current = () => MISSIONS.find((m) => m.id === mission?.id);
  const done = () => mission && mission.progress >= current().count;

  function newMission() {
    const options = MISSIONS.filter((m) => m.id !== last && (!m.needs || shop.has(m.needs)));
    const m = options[Math.floor(Math.random() * options.length)];
    mission = { id: m.id, progress: 0 };
    game.message(`🧑‍🌾 "${m.text}, så får du ${m.reward} ⭐!"`);
  }

  function talk() {
    if (!mission) {
      newMission();
    } else if (done()) {
      const m = current();
      game.state.points += m.reward;
      sound.buy();
      game.message(`🧑‍🌾 "Godt klaret!" +${m.reward} ⭐`);
      game.emit('missionDone', { id: m.id });
      last = m.id;
      mission = null;
    } else {
      const m = current();
      game.message(`🧑‍🌾 "${m.text}. Du mangler ${m.count - mission.progress}"`);
    }
  }

  // Tæl fremskridt på opgaven
  for (const event of new Set(MISSIONS.map((m) => m.event))) {
    game.on(event, (data) => {
      const m = current();
      if (!m || m.event !== event || done()) return;
      if (m.type && data.type !== m.type) return;
      mission.progress++;
      if (done()) game.message('📋 Opgave klaret! Gå tilbage til skovfogeden');
    });
  }

  game.remember('ranger', {
    save: () => ({ mission, last }),
    load(data) {
      mission = data.mission && MISSIONS.some((m) => m.id === data.mission.id) ? data.mission : null;
      last = data.last;
    },
  });

  return {
    position: pos,

    update() {
      // Kig på spilleren
      const p = game.player.position;
      ranger.rotation.y = Math.atan2(p.x - pos.x, p.z - pos.z);

      if (game.isPlayerNear(pos, 3) && !game.player.vehicle) {
        hud.setPrompt(done() ? 'Tryk <b>E</b> for at få din belønning ⭐' : mission ? 'Tryk <b>E</b> for at snakke med skovfogeden' : 'Tryk <b>E</b> for at få en opgave 📋');
        if (input.consume('KeyE')) talk();
      }

      const m = current();
      const html = m ? `📋 ${m.text} (${Math.min(mission.progress, m.count)}/${m.count})${done() ? ' ✅' : ''}` : '';
      if (html !== lastHtml) missionEl.textContent = lastHtml = html;
    },
  };
}
