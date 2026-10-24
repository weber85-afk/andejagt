// Natkikkert: tryk N for grønt nattesyn, så man kan se i mørket.
export function createNightVision(game) {
  const { config, shop, input } = game;
  const canvas = game.renderer.domElement;
  const overlay = document.getElementById('nightvision');
  let on = false;

  function set(value) {
    on = value;
    canvas.style.filter = on ? 'brightness(2.6) contrast(1.2) saturate(0) sepia(1) hue-rotate(55deg) saturate(3)' : '';
    overlay.classList.toggle('on', on);
  }

  shop.addItem({
    id: 'nightVision',
    category: 'udstyr',
    emoji: '🌙',
    name: 'Natkikkert',
    basePrice: config.prices.nightVision,
    minLevel: 3,
    levels: [{ text: 'Grønt nattesyn. Tryk N' }],
    onBuy(level, { loading }) {
      if (!loading) game.message('🌙 Tryk N for nattesyn');
    },
  });

  return {
    update() {
      if (shop.has('nightVision') && input.wasPressed('KeyN')) {
        set(!on);
        game.message(on ? '🌙 Nattesyn til' : '🌙 Nattesyn fra');
      }
      if (on && game.photo?.on) set(false);
    },
  };
}
