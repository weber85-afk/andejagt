// Jægerniveau: man får erfaring (XP) for alt hvad man laver og stiger i niveau.
// Nogle ting i butikken kræver et bestemt niveau.
const TITLES = ['Ny jæger', 'Lærling', 'Skovløber', 'Sporfinder', 'Jæger', 'Erfaren jæger', 'Mesterjæger', 'Storvildtjæger', 'Legende', 'Jagtkonge'];

// XP der skal til for at nå et niveau (niveau 2 = 100, niveau 3 = 300, niveau 4 = 600 ...)
const needed = (level) => 50 * (level - 1) * level;

export function createXp(game) {
  let xp = 0;
  let seeded = false;

  const levelFor = (amount) => {
    let level = 1;
    while (level < TITLES.length && amount >= needed(level + 1)) level++;
    return level;
  };

  function add(amount) {
    const before = levelFor(xp);
    xp += Math.round(amount);
    const after = levelFor(xp);
    if (after > before) {
      game.sound.medal();
      game.message(`🎖️ Nyt niveau: ${after} – ${TITLES[after - 1]}!`);
      game.emit('levelUp', { level: after });
    }
  }

  game.on('animalHit', ({ type }) => add(Math.max(5, game.config.foods[type]?.shotPoints ?? 10)));
  game.on('foodCooked', () => add(8));
  game.on('fishCaught', () => add(8));
  game.on('dishMade', () => add(20));
  game.on('missionDone', () => add(40));
  game.on('treasureFound', () => add(30));

  game.remember('xp', {
    save: () => xp,
    load(data) {
      xp = data;
      seeded = true;
    },
  });

  return {
    get xp() { return xp; },
    get level() { return levelFor(xp); },
    get title() { return TITLES[levelFor(xp) - 1]; },
    // Hvor langt man er mod næste niveau (0-1)
    get progress() {
      const level = levelFor(xp);
      if (level >= TITLES.length) return 1;
      return (xp - needed(level)) / (needed(level + 1) - needed(level));
    },
    add,

    // Gamle gem (fra før niveauer fandtes) får XP ud fra det man allerede har lavet
    seedFromStats(stats) {
      if (seeded || !stats) return;
      const hits = Object.values(stats.hit ?? {}).reduce((a, b) => a + b, 0);
      xp = hits * 6 + (stats.cooked ?? 0) * 8 + (stats.fish ?? 0) * 8 + (stats.dishes ?? 0) * 20 + (stats.missions ?? 0) * 40;
      seeded = true;
    },
  };
}
