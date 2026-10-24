// Kulde: om vinteren og på Fjeldet bliver man kold. Varm dig ved bålet, i hytten (med pejs)
// eller i bilen. Med varm jakke fryser man langsommere. Fryser man, går man langsommere.
export function createCold(game) {
  const { config, state, shop } = game;
  const cfg = config.cold;
  const el = document.getElementById('warmth');
  let warned = false;
  let last = '';
  state.warmth ??= 100;

  const insideHut = () => {
    if (!game.shelter.built) return false;
    const s = game.shelter.position;
    const p = game.player.position;
    return p.x > s.x - 2 && p.x < s.x + (shop.has('biggerShelter') ? 5 : 2) && p.z > s.z - 2 && p.z < s.z + 2;
  };

  shop.addItem({
    id: 'warmJacket',
    category: 'udstyr',
    emoji: '🧥',
    name: 'Varm jakke',
    basePrice: config.prices.warmJacket,
    levels: [{ text: 'Du fryser meget langsommere om vinteren og på Fjeldet' }],
    onBuy() {},
  });

  return {
    get speedFactor() {
      if (state.warmth <= 0) return 0.6;
      return state.warmth < cfg.coldBelow ? 0.8 : 1;
    },

    update(dt) {
      const area = game.area.id;
      const winter = game.seasons.isWinter;
      let drain = winter ? cfg.winterDrain : area === 'mountain' ? cfg.mountainDrain : 0;
      if (game.dayNight.isNight) drain *= cfg.nightFactor;
      if (shop.has('warmJacket')) drain *= cfg.jacketFactor;

      // Varme steder
      let warm = 0;
      const fire = game.campfire.position;
      if (area === 'home' && game.isPlayerNear(fire, 6) && !game.weather.isRaining) warm = cfg.fireWarmth;
      if (insideHut()) warm = Math.max(warm, shop.has('fireplace') ? cfg.fireplaceWarmth : cfg.hutWarmth);
      if (game.car.inCar) warm = Math.max(warm, cfg.carWarmth);

      state.warmth = Math.max(0, Math.min(100, state.warmth + (warm - (warm ? 0 : drain)) * dt));
      if (state.warmth < cfg.coldBelow && !warned) {
        warned = true;
        game.message('🥶 Du fryser! Varm dig ved bålet eller i hytten');
      }
      if (state.warmth > 60) warned = false;

      const show = drain > 0 || state.warmth < 100;
      const w = Math.round(state.warmth);
      const color = w > 50 ? '#ff9a3a' : w > cfg.coldBelow ? '#8fc8ff' : '#3a7ae8';
      const html = show ? `${w > cfg.coldBelow ? '🌡️' : '🥶'} Varme<div class="gauge"><div style="width:${w}%;background:${color}"></div></div>` : '';
      if (html !== last) el.innerHTML = last = html;
    },
  };
}
