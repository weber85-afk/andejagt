// Kort og kompas: kompasset øverst viser retningen og vigtige steder, og M viser et kort over området.
export function createMap(game) {
  const { config, shop, input } = game;
  const compassEl = document.getElementById('compass');
  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  let showMap = false;
  let lastCompass = '';

  // Vigtige steder i hvert område: [emoji, x, z]
  function places() {
    const list = [];
    const home = game.areas.home;
    const forest = game.areas.forest;
    const fc = config.forest.center;
    if (game.area === home) {
      list.push(['🔥', config.campfire.position.x, config.campfire.position.z]);
      list.push(['🛒', config.shop.position.x, config.shop.position.z]);
      if (game.shelter.built) list.push(['🏠', config.shelter.position.x, config.shelter.position.z]);
    } else {
      list.push(['🧑‍🌾', fc.x + config.forest.ranger.x, fc.z + config.forest.ranger.z]);
      if (shop.has('tower')) list.push(['🗼', game.tower.position.x, game.tower.position.z]);
      const bear = game.bear.bear;
      if (bear) list.push(['🐻', bear.mesh.position.x, bear.mesh.position.z]);
    }
    if (game.car.owned) {
      const c = game.car.position;
      if (game.areaAt(c.x, c.z) === game.area) list.push(['🚗', c.x, c.z]);
    }
    const end = game.area.road[game.area.road.length - 1];
    list.push([game.area === home ? '🌲' : '🏕️', end.x, end.z]);
    return list.filter(() => true);
  }

  function drawMap() {
    const area = game.area;
    const size = canvas.width;
    const scale = size / (area.size + 10);
    const c = area.center;
    const toMap = (x, z) => [(x - c.x) * scale + size / 2, (z - c.z) * scale + size / 2];

    ctx.fillStyle = area === game.areas.home ? '#6fae4f' : '#4a8a3a';
    ctx.fillRect(0, 0, size, size);

    // Træer
    ctx.fillStyle = 'rgba(20, 70, 30, 0.75)';
    for (const col of game.colliders) {
      if (col.r === undefined || col.r < 0.35 || game.areaAt(col.x, col.z) !== area) continue;
      const [x, y] = toMap(col.x, col.z);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }

    // Vand
    ctx.fillStyle = '#3a9ad9';
    ctx.strokeStyle = '#3a9ad9';
    for (const w of area.water) {
      if (w.type === 'lake') {
        const [x, y] = toMap(w.x, w.z);
        ctx.beginPath();
        ctx.arc(x, y, w.r * scale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = w.width * scale;
        ctx.beginPath();
        w.points.forEach((p, i) => (i ? ctx.lineTo(...toMap(p.x, p.z)) : ctx.moveTo(...toMap(p.x, p.z))));
        ctx.stroke();
      }
    }

    // Vej
    ctx.strokeStyle = '#c9ad7a';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    area.road.forEach((p, i) => (i ? ctx.lineTo(...toMap(p.x, p.z)) : ctx.moveTo(...toMap(p.x, p.z))));
    ctx.stroke();

    // Steder
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [emoji, x, z] of places()) ctx.fillText(emoji, ...toMap(x, z));

    // Dig (en pil der peger den vej du kigger)
    const [px, py] = toMap(game.player.position.x, game.player.position.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-game.player.yaw);
    ctx.fillStyle = '#ffe14d';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${area.name} · N ↑`, size / 2, 18);
  }

  shop.addItem({
    id: 'mapCompass',
    category: 'udstyr',
    emoji: '🧭',
    name: 'Kort og kompas',
    basePrice: config.prices.mapCompass,
    levels: [{ text: 'Kompas øverst på skærmen, og tryk M for at se kortet' }],
    onBuy(level, { loading }) {
      if (!loading) game.message('🧭 Tryk M for at se kortet');
    },
  });

  return {
    update() {
      const owned = shop.has('mapCompass');
      if (owned && input.wasPressed('KeyM')) showMap = !showMap;
      canvas.classList.toggle('on', owned && showMap);
      if (owned && showMap) drawMap();

      // Kompas: retningen man kigger, hvor nord er -Z
      let html = '';
      if (owned) {
        const heading = -game.player.yaw;
        const spot = (angle) => {
          let d = angle - heading;
          d = Math.atan2(Math.sin(d), Math.cos(d));   // mellem -PI og PI
          return Math.abs(d) < 1.3 ? 50 + (d / 1.3) * 50 : null;
        };
        const marks = [['N', 0], ['Ø', Math.PI / 2], ['S', Math.PI], ['V', -Math.PI / 2]];
        const p = game.player.position;
        for (const [emoji, x, z] of places()) marks.push([emoji, Math.atan2(x - p.x, -(z - p.z))]);
        for (const [label, angle] of marks) {
          const left = spot(angle);
          if (left !== null) html += `<span style="left:${left.toFixed(1)}%">${label}</span>`;
        }
        html += '<div class="needle"></div>';
      }
      if (html !== lastCompass) compassEl.innerHTML = lastCompass = html;
    },
  };
}
