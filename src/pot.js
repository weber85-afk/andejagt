import * as THREE from 'three';
import { box, glow } from './models.js';

// Gryden ved bålet: lav retter efter opskrifter. Retter giver mange point og mætter godt.
export function createPot(game) {
  const { config, scene, shop, input, hud, sound, effects, state } = game;
  const fire = game.campfire.position;
  const pos = new THREE.Vector3(fire.x + 4, 0, fire.z - 2.6);   // langt nok fra bålet til at E ikke forveksles
  const panel = document.getElementById('recipes');
  const list = document.getElementById('recipe-items');
  document.getElementById('recipes-close').addEventListener('click', () => game.screens.closeMenu(true));

  let built = false;
  let cooking = null;   // { id, time }
  let soup = null;
  let bubbleTimer = 0;

  function build() {
    if (built) return;
    built = true;
    const g = new THREE.Group();
    g.position.copy(pos);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const stick = box(0.08, 2.0, 0.08, 0x5a3a1e, Math.cos(a) * 0.55, 0.95, Math.sin(a) * 0.55, 'bark');
      stick.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
      g.add(stick);
    }
    g.add(
      box(0.75, 0.55, 0.75, 0x222222, 0, 0.75, 0),           // gryde
      box(0.85, 0.08, 0.85, 0x333333, 0, 1.05, 0),
      box(0.04, 0.6, 0.04, 0x555555, 0, 1.35, 0),
    );
    soup = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.62), new THREE.MeshLambertMaterial({ color: 0x8a5a2b }));
    soup.position.y = 1.02;
    soup.visible = false;
    g.add(soup);
    // Små gløder under gryden
    const embers = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), glow(0xff7020, 1.8));
    embers.position.y = 0.1;
    g.add(embers);
    scene.add(g);
    game.colliders.push({ x: pos.x, z: pos.z, r: 0.6 });
  }

  const has = (needs) => Object.entries(needs).every(([type, n]) => game.bagCount(type) >= n);

  function render() {
    list.innerHTML = '';
    for (const r of config.recipes) {
      const parts = Object.entries(r.needs).map(([type, n]) => {
        const f = config.foods[type];
        const ok = game.bagCount(type) >= n;
        return `<span style="color:${ok ? '#2e7d32' : '#a3421a'}">${f.emoji} ${game.bagCount(type)}/${n} ${n === 1 ? f.name : f.plural}</span>`;
      }).join(' · ');
      const card = document.createElement('div');
      card.className = 'item';
      card.innerHTML = `
        <div class="emoji">${r.emoji}</div>
        <div class="info"><h3>${r.name}</h3><p>${parts}</p><p class="next">+${r.points} ⭐ og ${r.portions} retter at spise</p></div>
        <div class="buy"></div>`;
      const b = document.createElement('button');
      b.textContent = 'Lav';
      b.disabled = !has(r.needs) || !!cooking;
      b.addEventListener('click', () => start(r));
      card.querySelector('.buy').appendChild(b);
      list.appendChild(card);
    }
  }

  function start(r) {
    for (const [type, n] of Object.entries(r.needs)) for (let i = 0; i < n; i++) game.takeFromBag(type);
    cooking = { id: r.id, time: config.pot.cookTime };
    soup.visible = true;
    soup.material.color.set(r.id === 'pie' ? 0x6a3a8a : r.id === 'fishsoup' ? 0xd8c890 : 0x8a5a2b);
    sound.sizzle();
    game.message(`${r.emoji} ${r.name} koger...`);
    game.screens.closeMenu(true);
  }

  shop.addItem({
    id: 'pot',
    category: 'mad',
    emoji: '🍲',
    name: 'Gryde',
    basePrice: config.pot.price,
    levels: [{ text: 'Lav retter af vildt, svampe og bær. Giver mange point' }],
    onBuy(level, { loading }) {
      build();
      if (!loading) game.message('🍲 Gryden står ved bålet');
    },
  });

  game.remember('pot', {
    save: () => cooking,
    load(data) {
      cooking = data;
      if (cooking && soup) soup.visible = true;
    },
  });

  return {
    update(dt) {
      if (!built) return;
      if (cooking) {
        cooking.time -= dt;
        bubbleTimer -= dt;
        if (bubbleTimer <= 0) {
          bubbleTimer = 0.25;
          effects.smoke(pos.clone().setY(1.2));
        }
        if (cooking.time <= 0) {
          const r = config.recipes.find((x) => x.id === cooking.id);
          state.dishes += r.portions;
          state.points += r.points;
          sound.ding();
          game.message(`${r.emoji} ${r.name} er klar! +${r.points} ⭐`);
          game.emit('dishMade', { id: r.id });
          cooking = null;
          soup.visible = false;
        }
      }
      if (!game.isPlayerNear(pos, 2.4)) return;
      if (cooking) {
        const r = config.recipes.find((x) => x.id === cooking.id);
        const pct = Math.round((1 - cooking.time / config.pot.cookTime) * 100);
        hud.setPrompt(`${r.emoji} ${r.name} koger...<div class="bar"><div style="width:${pct}%;background:#8a5a2b"></div></div>`);
        return;
      }
      hud.setPrompt('Tryk <b>E</b> for at bruge gryden 🍲');
      if (input.consume('KeyE')) {
        render();
        game.screens.openMenu(panel);
      }
    },
  };
}
