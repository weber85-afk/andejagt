// Fotomode: tryk P for at skjule alt på skærmen og tage flotte billeder.
// Klik (eller Enter) gemmer billedet på computeren.
export function createPhoto(game) {
  const { input } = game;
  const hint = document.getElementById('photo-hint');
  const hud = document.getElementById('hud');
  let on = false;

  function save() {
    game.render();
    const a = document.createElement('a');
    a.href = game.renderer.domElement.toDataURL('image/png');
    a.download = `andejagt-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    a.click();
    game.sound.pickup();
  }

  return {
    get on() { return on; },

    update() {
      if (input.wasPressed('KeyP')) {
        on = !on;
        hud.classList.toggle('photo', on);
        hint.classList.toggle('on', on);
      }
      if (on && (input.clicked || input.wasPressed('Enter'))) save();
    },
  };
}
