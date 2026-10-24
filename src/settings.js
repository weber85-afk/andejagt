// Indstillinger der gælder for hele computeren (ikke det gemte spil): lyd, musik og grafik.
const KEY = 'andejagt-indstillinger';

export function createSettings(game) {
  const values = { volume: 0.6, music: true, quality: 'høj' };
  try {
    Object.assign(values, JSON.parse(localStorage.getItem(KEY)) ?? {});
  } catch {}

  function store() {
    try {
      localStorage.setItem(KEY, JSON.stringify(values));
    } catch {}
  }

  function apply() {
    game.sound.setVolume(values.volume);
    game.setQuality(values.quality);
  }

  return {
    get volume() { return values.volume; },
    get music() { return values.music; },
    get quality() { return values.quality; },

    set(name, value) {
      values[name] = value;
      store();
      apply();
    },

    apply,
  };
}
