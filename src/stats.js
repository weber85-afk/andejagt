// Statistik og medaljer: tæller hvad man har lavet og giver medaljer for det.
// Nye medaljer kan tilføjes i listen herunder.
const MEDALS = [
  { id: 'firstDuck', emoji: '🦆', name: 'Første and', text: 'Skyd din første and', check: (s) => s.hit.duck >= 1 },
  { id: 'ducks50', emoji: '🦆', name: 'Andejæger', text: 'Skyd 50 ænder', check: (s) => s.hit.duck >= 50 },
  { id: 'ducks200', emoji: '🏹', name: 'Mesterjæger', text: 'Skyd 200 ænder', check: (s) => s.hit.duck >= 200 },
  { id: 'golden', emoji: '🌟', name: 'Guldfund', text: 'Ram den gyldne and', check: (s) => s.golden >= 1 },
  { id: 'bear', emoji: '🐻', name: 'Bjørnejæger', text: 'Nedlæg en bjørn', check: (s) => s.hit.bear >= 1 },
  { id: 'deer', emoji: '🦌', name: 'Hjortejæger', text: 'Nedlæg en hjort', check: (s) => s.hit.deer >= 1 },
  { id: 'fish10', emoji: '🐟', name: 'Fisker', text: 'Fang 10 fisk', check: (s) => s.fish >= 10 },
  { id: 'bigFish', emoji: '🐋', name: 'Kæmpefisk', text: 'Fang en fisk på over 8 kg', check: (s) => s.biggestFish >= 8 },
  { id: 'cook25', emoji: '🍗', name: 'Kok', text: 'Steg 25 ting', check: (s) => s.cooked >= 25 },
  { id: 'chef', emoji: '👨‍🍳', name: 'Mesterkok', text: 'Lav 5 retter i gryden', check: (s) => s.dishes >= 5 },
  { id: 'neverBurnt', emoji: '✨', name: 'Aldrig brændt', text: 'Steg 20 ting uden at brænde noget', check: (s) => s.cooked >= 20 && s.burnt === 0 },
  { id: 'rich', emoji: '💰', name: 'Rigmand', text: 'Hav 1000 point på én gang', check: (s, g) => g.state.points >= 1000 },
  { id: 'days10', emoji: '📅', name: 'Overlever', text: 'Spil i 10 dage', check: (s, g) => g.dayNight.day >= 10 },
  { id: 'explorer', emoji: '🗺️', name: 'Opdagelsesrejsende', text: 'Besøg alle steder', check: (s) => ['forest', 'mountain', 'sea'].every((a) => s.visited.includes(a)) },
  { id: 'missions5', emoji: '📋', name: 'Skovfogedens hjælper', text: 'Klar 5 opgaver', check: (s) => s.missions >= 5 },
  { id: 'petDog', emoji: '🐕', name: 'Hundeven', text: 'Klap hundene 20 gange', check: (s) => s.pets >= 20 },
];

export function createStats(game) {
  const { state, sound } = game;
  let s = fresh();
  let unlocked = new Set();
  let checkTimer = 0;

  function fresh() {
    return { hit: {}, golden: 0, fish: 0, biggestFish: 0, cooked: 0, burnt: 0, dishes: 0, missions: 0, pets: 0, visited: [] };
  }

  game.on('animalHit', ({ type, golden }) => {
    s.hit[type] = (s.hit[type] || 0) + 1;
    if (golden) s.golden++;
  });
  game.on('fishCaught', ({ weight }) => {
    s.fish++;
    s.biggestFish = Math.max(s.biggestFish, weight);
  });
  game.on('foodCooked', () => s.cooked++);
  game.on('foodBurnt', () => s.burnt++);
  game.on('dishMade', () => s.dishes++);
  game.on('missionDone', () => s.missions++);
  game.on('petted', () => s.pets++);
  game.on('traveled', ({ to }) => {
    if (!s.visited.includes(to)) s.visited.push(to);
  });

  function check() {
    for (const m of MEDALS) {
      if (unlocked.has(m.id) || !m.check(s, game)) continue;
      unlocked.add(m.id);
      sound.medal();
      game.message(`🏅 Ny medalje: ${m.emoji} ${m.name}!`);
    }
  }

  game.remember('stats', {
    save: () => ({ s, unlocked: [...unlocked] }),
    load(data) {
      s = { ...fresh(), ...data.s };
      unlocked = new Set(data.unlocked);
    },
  });

  return {
    // Siden med medaljer og tal (vises fra pausemenuen)
    showPage() {
      game.screens.showPage('🏅 Medaljer', `${unlocked.size} af ${MEDALS.length} medaljer`, (box) => {
        const grid = document.createElement('div');
        grid.className = 'medals';
        for (const m of MEDALS) {
          const has = unlocked.has(m.id);
          const div = document.createElement('div');
          div.className = has ? 'medal' : 'medal locked';
          div.innerHTML = `<span>${has ? m.emoji : '🔒'}</span><b>${m.name}</b><small>${m.text}</small>`;
          grid.appendChild(div);
        }
        box.appendChild(grid);
        const foods = game.config.foods;
        const hits = Object.entries(s.hit).map(([t, n]) => `${foods[t]?.emoji ?? ''} ${n}`).join(' · ');
        const p = document.createElement('p');
        p.className = 'stats';
        p.innerHTML = `Skudt: ${hits || 'ingenting endnu'}<br>🍗 Stegt: ${s.cooked} · 🐟 Fisk: ${s.fish} (største ${String(s.biggestFish).replace('.', ',')} kg) · 📋 Opgaver: ${s.missions}`;
        box.appendChild(p);
      });
    },

    update(dt) {
      checkTimer -= dt;
      if (checkTimer <= 0) {
        checkTimer = 1;
        check();
      }
    },
  };
}
