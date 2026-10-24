// Startskærm, pausemenu (Esc), fuld skærm og låst mus.
// Menuer som butikken åbnes med game.screens.openMenu(element).
export function createScreens(game, canvas) {
  const overlay = document.getElementById('overlay');
  const title = document.getElementById('overlay-title');
  const sub = document.getElementById('overlay-sub');
  const buttons = document.getElementById('overlay-buttons');
  const status = document.getElementById('overlay-status');

  let openMenu = null;     // den menu der er åben lige nu (fx butikken)
  let playing = false;     // true når man er inde i spillet (ikke på startskærmen)

  function button(text, onClick, className = '') {
    const b = document.createElement('button');
    b.textContent = text;
    b.className = className;
    b.addEventListener('click', onClick);
    buttons.appendChild(b);
    return b;
  }

  function showOverlay({ heading, text, statusText = '' }) {
    game.paused = true;
    if (game.settings.music && !game.sound.musicPlaying) game.sound.startMusic('menu');
    title.textContent = heading;
    sub.textContent = text;
    status.textContent = statusText;
    buttons.innerHTML = '';
    overlay.classList.remove('hidden');
  }

  function showStart() {
    const save = game.save.info();
    showOverlay({ heading: '🦆 Andejagt 🔥', text: `Hej ${game.save.activeName}! Jag ænder og vildt, steg det over bålet, og kør på eventyr!` });
    for (const extra of startButtons) button(extra.text, extra.onClick, 'small');
    if (save) {
      button(`▶ Fortsæt (dag ${save.day}, ${save.points} ⭐)`, enterGame);
      button('Start forfra', () => {
        if (confirm('Vil du virkelig starte forfra? Alt du har samlet forsvinder.')) game.save.reset();
      }, 'small');
    } else {
      button('▶ Klik for at spille', enterGame);
    }
  }

  function showPause(statusText = '') {
    showOverlay({ heading: '⏸ Pause', text: 'Spillet står stille, mens du er i menuen.', statusText });
    button('▶ Fortsæt', enterGame);
    button('💾 Gem spillet', () => {
      status.textContent = game.save.save() ? '✅ Spillet er gemt!' : '❌ Kunne ikke gemme';
    }, 'small');
    button('⚙️ Indstillinger', showSettings, 'small');
    for (const extra of pauseButtons) button(extra.text, extra.onClick, 'small');
    button('🚪 Afslut spillet', quit, 'small');
  }

  // Ekstra knapper i pausemenuen (fx medaljer), som andre dele af spillet kan tilføje
  const pauseButtons = [];

  function showSettings() {
    const s = game.settings;
    showOverlay({ heading: '⚙️ Indstillinger', text: 'Gælder for denne computer' });
    const row = (label, ...children) => {
      const div = document.createElement('div');
      div.className = 'setting';
      div.append(label, ...children);
      buttons.appendChild(div);
    };
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 1;
    slider.step = 0.05;
    slider.value = s.volume;
    slider.addEventListener('input', () => s.set('volume', Number(slider.value)));
    row('🔊 Lyd', slider);

    const toggle = (label, getText, onClick) => {
      const b = document.createElement('button');
      b.className = 'small';
      b.textContent = getText();
      b.addEventListener('click', () => {
        onClick();
        b.textContent = getText();
      });
      row(label, b);
    };
    toggle('🎵 Musik', () => (s.music ? 'Til' : 'Fra'), () => {
      s.set('music', !s.music);
      if (s.music) game.sound.startMusic('menu');
      else game.sound.stopMusic();
    });
    toggle('🖼️ Grafik', () => (s.quality === 'høj' ? 'Flot' : 'Hurtig'), () => s.set('quality', s.quality === 'høj' ? 'lav' : 'høj'));
    button('⬅ Tilbage', () => (playing ? showPause() : showStart()));
  }

  function quit() {
    game.save.save();
    playing = false;
    if (document.fullscreenElement) document.exitFullscreen?.();
    showOverlay({ heading: '👋 Farvel!', text: 'Spillet er gemt. Du kan lukke vinduet nu.' });
    button('▶ Spil igen', enterGame);
  }

  const startButtons = [];

  // Selve spillet kører
  function resume() {
    if (!game.car?.radioOn) game.sound.stopMusic();
    overlay.classList.add('hidden');
    game.paused = false;
    playing = true;
  }

  async function lockMouse() {
    try {
      await canvas.requestPointerLock();
    } catch {
      showPause('Klik på Fortsæt igen for at spille');
    }
  }

  // Kaldes når man klikker på en knap for at spille: fuld skærm + lås musen
  function enterGame() {
    game.sound.unlock();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {});
    }
    lockMouse();
  }

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      if (!openMenu) resume();
    } else if (!openMenu && playing) {
      game.save.save();
      showPause();
    }
  });
  document.addEventListener('pointerlockerror', () => showPause('Klik på Fortsæt igen for at spille'));

  addEventListener('keydown', (e) => {
    if (openMenu) {
      if (e.code === 'KeyE') closeMenu(true);
      if (e.code === 'Escape') closeMenu(false);
    } else if (e.code === 'Escape' && playing && !game.paused) {
      // Hvis musen ikke er låst (fx i nogle browsere), åbner Esc stadig menuen
      showPause();
    }
  });

  function closeMenu(backToGame) {
    openMenu.classList.add('hidden');
    openMenu = null;
    game.input.endFrame();   // så det samme tryk på E ikke også bruges i spillet
    if (backToGame) lockMouse();
    else showPause();
  }

  showStart();

  return {
    showStart,
    showPause,

    addPauseButton(text, onClick) {
      pauseButtons.push({ text, onClick });
    },
    addStartButton(text, onClick) {
      startButtons.push({ text, onClick });
    },
    // Vis en simpel side i menuen (fx medaljer). fill(container) fylder indholdet.
    showPage(heading, text, fill, back = showPause) {
      showOverlay({ heading, text });
      fill(buttons);
      button('⬅ Tilbage', () => back());
    },

    openMenu(element) {
      openMenu = element;
      game.paused = true;
      element.classList.remove('hidden');
      if (document.pointerLockElement) document.exitPointerLock();
    },
    closeMenu,

    // Til test i browserens konsol, hvor musen ikke altid kan låses
    playWithoutMouseLock: resume,
  };
}
