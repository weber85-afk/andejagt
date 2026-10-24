// Tekst og tal oven på spillet: point, beskeder og "Tryk E"-hjælp.
export function createHud(game) {
  const stats = document.getElementById('stats');
  const prompt = document.getElementById('prompt');
  const messages = document.getElementById('messages');
  const crosshair = document.getElementById('crosshair');
  const fadeEl = document.getElementById('fade');

  let lastStats = '';
  let promptHtml = '';
  let lastPrompt = '';

  game.on('message', ({ text }) => {
    const div = document.createElement('div');
    div.className = 'msg';
    div.textContent = text;
    messages.appendChild(div);
    setTimeout(() => div.remove(), 2200);
    while (messages.children.length > 3) messages.firstChild.remove();
  });

  return {
    // Andre dele af spillet kalder setPrompt() hver frame, hvis de vil vise noget
    setPrompt(html) {
      promptHtml = html;
    },
    get hasPrompt() { return promptHtml !== ''; },

    // Gør skærmen sort (fx når man sover)
    fade(on) {
      fadeEl.classList.toggle('on', on);
    },

    showCrosshair(show) {
      crosshair.style.display = show ? '' : 'none';
    },

    update() {
      const s = game.state;
      const dn = game.dayNight;
      const bag = Object.entries(s.bag)
        .filter(([, n]) => n > 0)
        .map(([type, n]) => `${game.config.foods[type].emoji} ${n}`)
        .join(' &nbsp;');
      const season = game.seasons ? ` · ${game.seasons.name}` : '';
      let html = `${dn.isNight ? '🌙 Nat' : '☀️ Dag'} ${dn.day}${season} · ${game.area.name}<br>🎒 ${bag || 'Tom'}<br>🍗 Stegte: ${s.cooked}${s.dishes ? ` · 🍲 Retter: ${s.dishes}` : ''}<br>⭐ Point: ${s.points}`;
      if (s.burnt > 0) html += `<br>⚫ Brændte: ${s.burnt}`;
      if (html !== lastStats) {
        stats.innerHTML = html;
        lastStats = html;
      }

      if (promptHtml !== lastPrompt) {
        prompt.innerHTML = promptHtml;
        lastPrompt = promptHtml;
      }
      promptHtml = '';
    },
  };
}
