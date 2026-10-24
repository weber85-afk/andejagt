// Sult: man bliver langsomt sulten og skal spise stegt mad (F). Sulten går man langsommere.
export function createHunger(game) {
  const { config, state, input, sound } = game;
  const cfg = config.hunger;
  const el = document.getElementById('hunger');
  let warned = false;
  let last = '';

  state.hunger ??= 100;

  function eat() {
    if (state.dishes > 0) {
      state.dishes--;
      state.hunger = Math.min(100, state.hunger + cfg.dishAmount);
      warned = false;
      sound.eat();
      game.message('😋 Mmm, en lækker ret!');
      game.emit('ate');
      return;
    }
    if (state.cooked <= 0) {
      game.message('🍗 Du har ingen stegt mad. Steg noget over bålet!');
      return;
    }
    if (state.hunger >= 98) {
      game.message('😊 Du er mæt');
      return;
    }
    state.cooked--;
    state.hunger = Math.min(100, state.hunger + cfg.eatAmount);
    warned = false;
    sound.eat();
    game.message('😋 Mmm, det smagte godt!');
    game.emit('ate');
  }

  return {
    // Hvor hurtigt man kan gå (1 = normalt)
    get speedFactor() {
      if (state.hunger <= 0) return cfg.starvingFactor;
      return state.hunger < cfg.hungryBelow ? cfg.hungryFactor : 1;
    },
    eat,

    update(dt) {
      state.hunger = Math.max(0, state.hunger - dt / cfg.secondsPerPoint);
      if (input.wasPressed('KeyF')) eat();
      if (state.hunger < cfg.hungryBelow && !warned) {
        warned = true;
        game.message('😟 Du er sulten! Spis noget med F');
      }

      const h = Math.round(state.hunger);
      const color = h > 50 ? '#6abf4b' : h > cfg.hungryBelow ? '#ffb13a' : '#e83a2b';
      const html = `😋 Mæthed<div class="gauge"><div style="width:${h}%;background:${color}"></div></div>`;
      if (html !== last) el.innerHTML = last = html;
    },
  };
}
