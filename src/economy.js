// Marked og sparegris (en fane i butikken):
//  - Sælg råt vildt. Priserne skifter hver morgen.
//  - Sparegris: sæt point ind og få renter hver morgen.
export function createEconomy(game) {
  const { config, state, sound } = game;
  const cfg = config.economy;
  let piggy = 0;
  let prices = {};

  const basePrice = (type) => {
    const f = config.foods[type];
    return f.ingredient ? cfg.ingredientPrice : Math.max(3, Math.round(f.cookedPoints * cfg.rawShare));
  };

  function newPrices() {
    prices = {};
    for (const type of Object.keys(config.foods)) {
      prices[type] = Math.round((cfg.minFactor + Math.random() * (cfg.maxFactor - cfg.minFactor)) * 100) / 100;
    }
  }
  newPrices();

  const priceOf = (type) => Math.max(1, Math.round(basePrice(type) * (prices[type] ?? 1)));

  game.on('morning', () => {
    newPrices();
    if (piggy > 0) {
      const interest = Math.min(cfg.maxInterest, Math.max(1, Math.floor(piggy * cfg.interest)));
      piggy += interest;
      setTimeout(() => game.message(`🐷 Sparegrisen gav dig ${interest} ⭐ i renter!`), 3000);
    }
  });

  function button(text, onClick, disabled = false, small = true) {
    const b = document.createElement('button');
    b.textContent = text;
    if (small) b.className = 'small';
    b.disabled = disabled;
    b.addEventListener('click', onClick);
    return b;
  }

  game.shop.addTab({
    id: 'marked',
    name: '💰 Marked',
    render(box, rerender) {
      // Sparegrisen
      const pig = document.createElement('div');
      pig.className = 'item';
      pig.innerHTML = `<div class="emoji">🐷</div><div class="info"><h3>Sparegris: ${piggy} ⭐</h3>
        <p>Hver morgen får du ${Math.round(cfg.interest * 100)}% ekstra i renter (højst ${cfg.maxInterest} ⭐ om dagen)</p></div><div class="buy"></div>`;
      const buy = pig.querySelector('.buy');
      const move = (amount) => {
        state.points -= amount;
        piggy += amount;
        sound.buy();
        rerender();
      };
      buy.append(
        button('Sæt 50 ind', () => move(50), state.points < 50),
        button('Sæt halvdelen ind', () => move(Math.floor(state.points / 2)), state.points < 2),
        button('Tag alt ud', () => move(-piggy), piggy <= 0),
      );
      box.appendChild(pig);

      // Sælg vildt
      const title = document.createElement('h3');
      title.textContent = '🛒 Sælg råt vildt – dagens priser';
      box.appendChild(title);
      const types = Object.keys(state.bag).filter((t) => state.bag[t] > 0);
      if (!types.length) {
        const p = document.createElement('p');
        p.textContent = 'Din taske er tom. Skyd eller saml noget, og kom tilbage!';
        box.appendChild(p);
      }
      for (const type of types) {
        const f = config.foods[type];
        const price = priceOf(type);
        const trend = prices[type] > 1.15 ? '📈 god pris!' : prices[type] < 0.85 ? '📉 lav pris' : '';
        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML = `<div class="emoji">${f.emoji}</div><div class="info"><h3>${state.bag[type]} ${state.bag[type] === 1 ? f.name : f.plural}</h3>
          <p>${price} ⭐ stykket ${trend}</p></div><div class="buy"></div>`;
        const sell = (n) => {
          state.bag[type] -= n;
          state.points += n * price;
          sound.buy();
          game.emit('sold', { count: n, type });
          rerender();
        };
        row.querySelector('.buy').append(button('Sælg 1', () => sell(1)), button(`Sælg alle (${state.bag[type] * price} ⭐)`, () => sell(state.bag[type])));
        box.appendChild(row);
      }
    },
  });

  game.remember('economy', {
    save: () => ({ piggy, prices }),
    load(data) {
      piggy = data.piggy ?? 0;
      prices = data.prices ?? prices;
    },
  });

  return {
    get piggy() { return piggy; },
  };
}
