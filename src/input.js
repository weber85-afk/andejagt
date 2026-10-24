// Holder styr på tastatur og mus.
export function createInput(game) {
  const down = new Set();
  const pressed = new Set();   // taster trykket ned i denne frame
  let mouseDX = 0;
  let mouseDY = 0;
  let clicked = false;
  let mouseDown = false;
  let rightClicked = false;

  addEventListener('keydown', (e) => {
    if (!down.has(e.code)) pressed.add(e.code);
    down.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => down.delete(e.code));
  addEventListener('blur', () => down.clear());

  addEventListener('mousemove', (e) => {
    if (game.paused) return;
    mouseDX += e.movementX || 0;
    mouseDY += e.movementY || 0;
  });
  addEventListener('mousedown', (e) => {
    if (game.paused) return;
    if (e.button === 2) rightClicked = true;
    if (e.button !== 0) return;
    clicked = true;
    mouseDown = true;
  });
  addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseDown = false;
  });
  addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    isDown: (code) => down.has(code),
    wasPressed: (code) => pressed.has(code),
    // Som wasPressed, men "bruger" trykket, så ikke flere ting reagerer på det samme tryk
    consume(code) {
      if (!pressed.has(code)) return false;
      pressed.delete(code);
      return true;
    },
    get clicked() { return clicked; },
    get mouseDown() { return mouseDown; },
    get rightClicked() { return rightClicked; },

    takeMouseDelta() {
      const d = { x: mouseDX, y: mouseDY };
      mouseDX = 0;
      mouseDY = 0;
      return d;
    },

    // Kaldes til sidst i hver frame
    endFrame() {
      pressed.clear();
      clicked = false;
      rightClicked = false;
    },
  };
}
