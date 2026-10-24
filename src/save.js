// Gemmer spillet i browseren, så man kan fortsætte næste gang.
// Hver spiller har sit eget gemte spil (fx søskende eller en ven).
// Dele af spillet der vil huskes, kalder game.remember('navn', { save() {...}, load(data) {...} }).
const PLAYERS_KEY = 'andejagt-spillere';
const ACTIVE_KEY = 'andejagt-aktiv';
const FIRST_KEY = 'andejagt-gem-v1';   // det første gemte spil (fra før der var flere spillere)

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function createSave(game) {
  let timer = 0;
  let resetting = false;

  // Spillerne på denne computer
  let players = readJson(PLAYERS_KEY);
  if (!Array.isArray(players) || !players.length) {
    players = [{ id: 'p1', name: 'Spiller 1', key: FIRST_KEY }];
    writeJson(PLAYERS_KEY, players);
  }
  let activeId = null;
  try {
    activeId = localStorage.getItem(ACTIVE_KEY);
  } catch {}
  const active = players.find((p) => p.id === activeId) ?? players[0];

  const read = (player = active) => readJson(player.key);

  const save = {
    get players() { return players; },
    get activeName() { return active.name; },

    save() {
      if (resetting) return false;
      const data = { savedAt: Date.now(), state: game.state, parts: {} };
      for (const [key, part] of Object.entries(game.saveables)) data.parts[key] = part.save();
      return writeJson(active.key, data);
    },

    load() {
      const data = read();
      if (!data) return false;
      Object.assign(game.state, data.state);
      // Ældre gem havde kun ænder
      const s = game.state;
      if (s.rawDucks) game.addToBag('duck', s.rawDucks);
      if (s.cookedDucks) s.cooked += s.cookedDucks;
      if (s.burntDucks) s.burnt += s.burntDucks;
      delete s.rawDucks;
      delete s.cookedDucks;
      delete s.burntDucks;
      s.bag ??= {};
      s.trophies ??= {};
      s.dishes ??= 0;
      for (const [key, part] of Object.entries(game.saveables)) {
        if (data.parts?.[key] === undefined) continue;
        // En fejl i én del må ikke stoppe resten af spillet i at starte
        try {
          part.load(data.parts[key]);
        } catch (error) {
          console.error(`Kunne ikke hente "${key}" fra det gemte spil`, error);
        }
      }
      return true;
    },

    // Lidt info til startskærmen (eller null hvis der ikke er gemt noget)
    info(player = active) {
      const data = read(player);
      if (!data) return null;
      return { day: data.parts?.dayNight?.day ?? 1, points: data.state?.points ?? 0 };
    },

    // Skift til en anden spiller (siden genindlæses med den spillers gemte spil)
    switchTo(id) {
      save.save();
      try {
        localStorage.setItem(ACTIVE_KEY, id);
      } catch {}
      resetting = true;
      location.reload();
    },

    addPlayer(name) {
      const id = `p${Date.now()}`;
      players.push({ id, name, key: `andejagt-gem-${id}` });
      writeJson(PLAYERS_KEY, players);
      save.switchTo(id);
    },

    renamePlayer(name) {
      active.name = name;
      writeJson(PLAYERS_KEY, players);
    },

    // Siden hvor man vælger spiller (fra startskærmen)
    showPlayers() {
      game.screens.showPage('👤 Hvem spiller?', `Nu spiller: ${active.name}`, (box) => {
        for (const p of players) {
          const info = save.info(p);
          const b = document.createElement('button');
          b.textContent = `${p.id === active.id ? '✅' : '▶'} ${p.name}${info ? ` (dag ${info.day}, ${info.points} ⭐)` : ' (nyt spil)'}`;
          b.addEventListener('click', () => (p.id === active.id ? game.screens.showStart() : save.switchTo(p.id)));
          box.appendChild(b);
        }
        const add = document.createElement('button');
        add.className = 'small';
        add.textContent = '➕ Ny spiller';
        add.addEventListener('click', () => {
          const name = prompt('Hvad hedder den nye spiller?')?.trim();
          if (name) save.addPlayer(name.slice(0, 20));
        });
        box.appendChild(add);
        const rename = document.createElement('button');
        rename.className = 'small';
        rename.textContent = `✏️ Skift navn på ${active.name}`;
        rename.addEventListener('click', () => {
          const name = prompt('Nyt navn:', active.name)?.trim();
          if (name) {
            save.renamePlayer(name.slice(0, 20));
            save.showPlayers();
          }
        });
        box.appendChild(rename);
      }, () => game.screens.showStart());
    },

    // Gem spillet som en fil (fx for at flytte det til en anden computer eller hjemmeside)
    exportFile() {
      save.save();
      const file = { game: 'andejagt', version: 1, name: active.name, data: read() };
      const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `andejagt-${active.name.toLowerCase().replace(/[^a-z0-9æøå]+/g, '-')}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    // Hent et spil fra en fil. Det erstatter den nuværende spillers spil.
    importFile() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.addEventListener('change', async () => {
        const chosen = input.files?.[0];
        if (!chosen) return;
        let file;
        try {
          file = JSON.parse(await chosen.text());
        } catch {
          file = null;
        }
        if (file?.game !== 'andejagt' || !file.data?.state) {
          alert('Det er ikke en Andejagt-fil 🤔');
          return;
        }
        const info = file.data.parts?.dayNight?.day ?? 1;
        if (!confirm(`Hent ${file.name}s spil (dag ${info}, ${file.data.state.points ?? 0} ⭐)? Det erstatter spillet for ${active.name}.`)) return;
        writeJson(active.key, file.data);
        if (file.name && /^Spiller \d+$/.test(active.name)) save.renamePlayer(file.name);
        resetting = true;
        location.reload();
      });
      input.click();
    },

    reset() {
      resetting = true;
      try {
        localStorage.removeItem(active.key);
      } catch {}
      location.reload();
    },

    update(dt) {
      timer += dt;
      if (timer >= game.config.save.autosaveSeconds) {
        timer = 0;
        save.save();
      }
    },
  };

  addEventListener('beforeunload', () => save.save());
  game.on('bought', () => save.save());
  game.on('morning', () => save.save());

  return save;
}
