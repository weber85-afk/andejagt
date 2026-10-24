// Tips til nye spillere: små opgaver der viser hvordan spillet virker.
// De forsvinder, når man har prøvet det hele én gang.
const STEPS = [
  { text: '🎯 Sigt på en and og klik for at skyde', event: 'animalHit' },
  { text: '🦆 Gå hen til anden for at samle den op', event: 'pickedUp' },
  { text: '🔥 Gå hen til bålet og tryk E', event: 'foodOnFire' },
  { text: '🍗 Vent til den er stegt, og tryk E igen', event: 'foodCooked' },
  { text: '🛒 Gå hen til butikken og tryk E', event: 'shopOpened' },
];

export function createTips(game) {
  const el = document.getElementById('tip');
  let step = 0;
  let last = '';

  STEPS.forEach((s, i) => {
    game.on(s.event, () => {
      if (step !== i) return;
      step++;
      if (step === STEPS.length) game.message('🎉 Godt gået! Nu kan du selv');
    });
  });

  game.remember('tips', {
    save: () => step,
    load(data) {
      step = data;
    },
  });

  return {
    // Ældre gem (fra før tipsene fandtes) skal ikke have tips
    skipIfExperienced() {
      if (game.state.points > 100 || game.dayNight.day > 1) step = STEPS.length;
    },

    update() {
      const text = step < STEPS.length ? STEPS[step].text : '';
      if (text !== last) {
        el.textContent = last = text;
      }
    },
  };
}
