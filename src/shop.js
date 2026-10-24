import * as THREE from 'three';
import { box, textSign } from './models.js';

// Butikken: en bod man går hen til og trykker E.
// Andre dele af spillet lægger deres egne varer ind med game.shop.addItem({...}).
export function createShop(game) {
  const { config, scene, state, sound, hud } = game;
  const pos = config.shop.position;
  const items = [];
  const levels = {};

  // --- Boden ---
  const stall = new THREE.Group();
  stall.position.set(pos.x, 0, pos.z);
  const start = config.player.startPosition;
  stall.rotation.y = Math.atan2(start.x - pos.x, start.z - pos.z);   // vender mod startstedet
  scene.add(stall);

  const skin = 0xf2c49b;
  stall.add(
    box(3, 1, 0.8, 0x8b5a2b, 0, 0.5, 0.3, 'planks'),  // disk
    box(3.1, 0.1, 0.9, 0xc49a6c, 0, 1.05, 0.3),       // bordplade
    box(3, 2.2, 0.1, 0x7a4b25, 0, 1.1, -1.1, 'planks'), // bagvæg
    box(0.6, 0.7, 0.35, 0x4a6fa5, 0, 1.25, -0.45),    // sælgerens krop
    box(0.5, 0.5, 0.04, 0xffffff, 0, 1.2, -0.26),     // forklæde
    box(0.45, 0.45, 0.45, skin, 0, 1.85, -0.45),      // hoved
    box(0.07, 0.07, 0.02, 0x222222, -0.1, 1.9, -0.22),
    box(0.07, 0.07, 0.02, 0x222222, 0.1, 1.9, -0.22),
    box(0.26, 0.06, 0.02, 0x5a3a1e, 0, 1.76, -0.22),  // overskæg
    box(0.5, 0.12, 0.5, 0xd8323c, 0, 2.12, -0.45),    // kasket
    box(0.25, 0.3, 0.25, 0xf2c94c, -0.9, 1.25, 0.35), // varer på disken
    box(0.2, 0.2, 0.2, 0x6abf4b, 0.9, 1.2, 0.3),
  );
  for (const x of [-1.45, 1.45]) {
    for (const z of [0.65, -1.05]) stall.add(box(0.14, 2.8, 0.14, 0x6b4423, x, 1.4, z));
  }
  for (let i = 0; i < 6; i++) {
    const stripe = box(0.52, 0.08, 2.1, i % 2 ? 0xffffff : 0xd8323c, -1.3 + i * 0.52, 2.85, -0.15);
    stripe.rotation.x = 0.15;
    stall.add(stripe);
  }
  const sign = textSign(['🛒 BUTIK'], { width: 2.2, height: 0.65, bg: '#d8323c' });
  sign.position.set(0, 3.4, 0.6);
  stall.add(sign);
  game.colliders.push({ x: pos.x, z: pos.z, r: 1.6 });

  // --- Butiksvinduet ---
  const CATEGORIES = [
    { id: 'udstyr', name: '🔫 Udstyr' },
    { id: 'hund', name: '🐾 Dyr' },
    { id: 'mad', name: '🔥 Mad' },
    { id: 'lejr', name: '🏠 Lejren' },
    { id: 'skov', name: '🚗 Bil & skov' },
    { id: 'pynt', name: '👕 Pynt' },
  ];
  let tab = CATEGORIES[0].id;
  const owned = new Set();   // pynt man har købt
  const equipped = {};       // pynt man har på: gruppe (eller id) -> id

  const panel = document.getElementById('shop');
  const list = document.getElementById('shop-items');
  const tabs = document.getElementById('shop-tabs');
  const sell = document.getElementById('shop-sell');
  const pointsEl = document.getElementById('shop-points');
  document.getElementById('shop-close').addEventListener('click', () => game.screens.closeMenu(true));

  // Opgraderinger bliver meget dyrere for hvert niveau (se priceSteps i config.js)
  function priceOf(item, level) {
    if (item.consumable || item.cosmetic) return item.price;
    const steps = config.shop.priceSteps;
    const extra = Math.max(0, level - steps.length + 1);   // hvis der er flere niveauer end trin
    const factor = steps[Math.min(level, steps.length - 1)] * 2 ** extra;
    return Math.round((item.basePrice * factor) / 5) * 5;
  }

  const slot = (item) => item.group || item.id;

  // Hvorfor en vare ikke kan købes endnu (eller null). Nogle ting kræver et vist jægerniveau.
  const blockedText = (item) => item.requires?.()
    ?? (item.minLevel && (game.xp?.level ?? 1) < item.minLevel ? `Kræver jægerniveau ${item.minLevel}` : null);

  // Faner med deres eget indhold (fx marked og sparegris)
  const customTabs = {};
  const isEquipped = (item) => equipped[slot(item)] === item.id;

  function equip(item, on, loading = false) {
    const current = items.find((i) => i.cosmetic && equipped[slot(i)] === i.id && slot(i) === slot(item));
    if (current && current !== item) current.onEquip(false, { loading });
    equipped[slot(item)] = on ? item.id : null;
    item.onEquip(on, { loading });
  }

  function buyButton(buyBox, price, onClick, label = `Køb ${price} ⭐`) {
    const b = document.createElement('button');
    b.textContent = label;
    b.disabled = state.points < price;
    b.addEventListener('click', onClick);
    buyBox.appendChild(b);
    if (b.disabled) buyBox.insertAdjacentHTML('beforeend', `<div class="missing">Du mangler ${price - state.points} ⭐</div>`);
  }

  function render() {
    pointsEl.textContent = state.points;

    tabs.innerHTML = '';
    for (const c of CATEGORIES) {
      const b = document.createElement('button');
      b.textContent = c.name;
      b.className = c.id === tab ? 'tab active' : 'tab';
      b.addEventListener('click', () => {
        tab = c.id;
        render();
      });
      tabs.appendChild(b);
    }

    const n = state.cooked;
    const each = config.shop.sellCookedDuck;
    sell.innerHTML = n > 0
      ? `🍗 Du har ${n} stykker stegt mad. `
      : `🍗 Sælgeren køber stegt mad for ${each} ⭐ stykket`;
    if (n > 0) {
      const b = document.createElement('button');
      b.textContent = `Sælg ${n === 1 ? 'den' : 'alle'} for ${n * each} ⭐`;
      b.className = 'small';
      b.addEventListener('click', () => {
        state.points += n * each;
        state.cooked = 0;
        sound.buy();
        game.emit('sold', { count: n });
        render();
      });
      sell.appendChild(b);
    }

    list.innerHTML = '';
    if (customTabs[tab]) {
      customTabs[tab](list, render);
      return;
    }
    // Det man kan købe står øverst, det låste i midten og det købte nederst
    const order = (item) => {
      const leveled = !item.consumable && !item.cosmetic;
      if (leveled && !item.levels[levels[item.id] || 0]) return 2;
      if (item.cosmetic && owned.has(item.id)) return 2;
      return blockedText(item) ? 1 : 0;
    };
    const shown = items.filter((i) => i.category === tab).sort((a, b) => order(a) - order(b));
    for (const item of shown) {
      const level = levels[item.id] || 0;
      const leveled = !item.consumable && !item.cosmetic;
      const next = leveled ? item.levels[level] : null;
      const price = priceOf(item, level);
      const blocked = blockedText(item);
      const dots = leveled && item.levels.length > 1
        ? '●'.repeat(level) + '○'.repeat(item.levels.length - level)
        : '';
      const description = item.current?.() ?? '';
      const nextText = leveled ? next?.text : item.text;

      const card = document.createElement('div');
      card.className = 'item';
      card.innerHTML = `
        <div class="emoji">${item.emoji}</div>
        <div class="info">
          <h3>${item.name}</h3>
          ${dots ? `<div class="level">${dots}</div>` : ''}
          ${description ? `<p>${description}</p>` : ''}
          ${nextText ? `<p class="next">${leveled ? '➡️ ' : ''}${nextText}</p>` : ''}
        </div>
        <div class="buy"></div>`;

      const buyBox = card.querySelector('.buy');
      if (item.cosmetic && owned.has(item.id)) {
        const b = document.createElement('button');
        b.className = 'small';
        b.textContent = isEquipped(item) ? 'Tag af' : 'Tag på';
        b.addEventListener('click', () => {
          equip(item, !isEquipped(item));
          render();
        });
        buyBox.appendChild(b);
      } else if (leveled && !next) {
        buyBox.innerHTML = '<div class="done">✅ Købt!</div>';
      } else if (blocked) {
        buyBox.innerHTML = `<div class="missing">🔒 ${blocked}</div>`;
      } else {
        buyButton(buyBox, price, () => buy(item));
      }
      list.appendChild(card);
    }
  }

  function buy(item) {
    const level = levels[item.id] || 0;
    const price = priceOf(item, level);
    if (state.points < price || blockedText(item)) return;
    if (!item.consumable && !item.cosmetic && !item.levels[level]) return;
    state.points -= price;
    if (item.cosmetic) {
      owned.add(item.id);
      equip(item, true);
    } else if (item.consumable) {
      item.onBuy();
    } else {
      levels[item.id] = level + 1;
      item.onBuy(level + 1, { loading: false });
    }
    sound.buy();
    game.emit('bought', { id: item.id, level: level + 1 });
    render();
  }

  game.remember('shop', {
    save: () => ({ levels: { ...levels }, owned: [...owned], equipped: { ...equipped } }),
    load(saved) {
      const savedLevels = saved.levels ?? saved;   // ældre gem havde kun niveauerne
      for (const item of items) {
        if (item.consumable || item.cosmetic) continue;
        const n = Math.min(savedLevels[item.id] || 0, item.levels.length);
        levels[item.id] = n;   // huskes, selv hvis noget går galt herunder
        try {
          for (let l = 1; l <= n; l++) item.onBuy(l, { loading: true });
        } catch (error) {
          console.error(`Kunne ikke genskabe "${item.id}"`, error);
        }
      }
      for (const id of saved.owned ?? []) owned.add(id);
      for (const id of Object.values(saved.equipped ?? {})) {
        const item = items.find((i) => i.id === id);
        if (item && owned.has(id)) equip(item, true, true);
      }
    },
  });

  return {
    // Varer kan være:
    //  opgradering: { id, category, emoji, name, basePrice, levels: [{ text }], current(), onBuy(level, { loading }) }
    //  forbrugsvare: { id, category, emoji, name, consumable: true, price, text, current(), onBuy() }
    //  pynt:         { id, category, emoji, name, cosmetic: true, price, group, text, onEquip(on, { loading }) }
    //  requires() kan returnere en tekst, hvis varen ikke kan købes endnu (fx 'Kræver shelteret')
    addItem(item) {
      items.push(item);
    },

    // En fane med sit eget indhold: render(container, rerender)
    addTab({ id, name, render: fill }) {
      CATEGORIES.push({ id, name });
      customTabs[id] = fill;
    },

    // Opdater butiksvinduet (fx efter man har solgt noget)
    refresh() {
      render();
    },

    level: (id) => levels[id] || 0,
    has: (id) => (levels[id] || 0) > 0,

    open() {
      render();
      game.screens.openMenu(panel);
      game.emit('shopOpened');
    },

    update() {
      if (!game.isPlayerNear(pos, 3.4)) return;
      hud.setPrompt('Tryk <b>E</b> for at gå i butikken 🛒');
      if (game.input.consume('KeyE')) this.open();
    },
  };
}
