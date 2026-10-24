// Områderne i spillet: lejren ("home") og Storskoven ("forest").
// De ligger langt fra hinanden i den samme 3D-verden, så tågen skjuler det andet område.
// Her bestemmes hvor højt jorden er, hvor der er vand, og hvor vejene går.

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Afstand fra et punkt til en linje gennem flere punkter
export function distanceToPath(points, x, z) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz)));
  }
  return best;
}

// Bløde bakker (samme tal giver altid samme bakker)
function hills(x, z, seed) {
  return (
    Math.sin(x * 0.045 + seed) * Math.cos(z * 0.038 + seed * 1.7) +
    0.5 * Math.sin(x * 0.09 - z * 0.07 + seed * 2.3) +
    0.25 * Math.sin(x * 0.17 + z * 0.21 + seed * 0.6)
  );
}

export function createAreas(game) {
  const { config } = game;
  const w = config.world;
  const f = config.forest;
  const fc = f.center;
  const at = (p) => ({ x: p.x + fc.x, z: p.z + fc.z });   // skov-koordinat -> verden

  const home = {
    id: 'home',
    name: 'Lejren',
    center: { x: 0, z: 0 },
    size: w.size,
    hills: w.hills,
    seed: 1.3,
    parking: w.parking,
    road: w.road,
    water: [{ type: 'lake', x: w.lakePosition.x, z: w.lakePosition.z, r: w.lakeRadius }],
    // Steder der skal være flade (bål, butik, huse ...): { x, z, r }
    flat: [
      { ...config.campfire.position, r: 7 },
      { ...config.player.startPosition, r: 5 },
      { ...config.shop.position, r: 5 },
      { x: config.shelter.position.x + 1.5, z: config.shelter.position.z, r: 6 },
      { ...config.smokehouse.position, r: 4 },
      { ...config.flag.position, r: 2 },
      { ...config.hide.position, r: 3 },
      { ...w.parking, r: 6 },
    ],
  };

  const forest = {
    id: 'forest',
    name: 'Storskoven',
    center: fc,
    size: f.size,
    hills: f.hills,
    seed: 4.7,
    parking: at(f.parking),
    road: f.road.map(at),
    water: [{ type: 'river', points: f.river.map(at), width: f.riverWidth }],
    flat: [
      { ...at(f.parking), r: 9 },
      { ...at(f.ranger), r: 4 },
      { ...at(f.tower), r: 4 },
    ],
  };

  const m = config.mountain;
  const mc = m.center;
  const atM = (p) => ({ x: p.x + mc.x, z: p.z + mc.z });
  const mountain = {
    id: 'mountain',
    name: 'Fjeldet',
    center: mc,
    size: m.size,
    hills: m.hills,
    seed: 2.9,
    peak: { ...atM(m.peak), height: m.peak.height, radius: m.peak.radius },
    parking: atM(m.parking),
    road: m.road.map(atM),
    water: [],
    flat: [{ ...atM(m.parking), r: 9 }],
  };

  const sc = config.sea.center;
  const sea = config.sea;
  const atS = (p) => ({ x: p.x + sc.x, z: p.z + sc.z });
  const seaArea = {
    id: 'sea',
    name: 'Havet',
    center: sc,
    size: sea.size,
    hills: sea.hills,
    seed: 6.1,
    parking: atS(sea.parking),
    road: sea.road.map(atS),
    water: [{ type: 'sea', shore: sc.z + sea.shore }],
    pier: { minX: sc.x + sea.pier.x - sea.pier.width / 2, maxX: sc.x + sea.pier.x + sea.pier.width / 2, minZ: sc.z + sea.pier.from - 8, maxZ: sc.z + sea.pier.to },
    flat: [{ ...atS(sea.parking), r: 9 }, { x: sc.x + sea.pier.x, z: sc.z + sea.pier.from - 6, r: 5 }],
  };

  const areas = { home, forest, mountain, sea: seaArea };

  function areaAt(x, z) {
    for (const a of [forest, mountain, seaArea]) if (Math.hypot(x - a.center.x, z - a.center.z) < a.size) return a;
    return home;
  }

  // Havets kyst bølger lidt, så den ikke er snorlige
  const shoreAt = (water, x) => water.shore + Math.sin(x * 0.05) * 4 + Math.sin(x * 0.13) * 1.5;
  const onPier = (area, x, z) => area.pier && x > area.pier.minX && x < area.pier.maxX && z > area.pier.minZ && z < area.pier.maxZ;

  // Hvor langt er der til vandkanten? (negativ = ude i vandet)
  function waterDistance(area, x, z) {
    let best = Infinity;
    for (const water of area.water) {
      let d;
      if (water.type === 'lake') d = Math.hypot(x - water.x, z - water.z) - water.r;
      else if (water.type === 'sea') d = shoreAt(water, x) - z;
      else d = distanceToPath(water.points, x, z) - water.width / 2;
      best = Math.min(best, d);
    }
    return best;
  }

  function flatness(area, x, z) {
    let mask = smoothstep(2, 12, waterDistance(area, x, z));
    for (const spot of area.flat) mask = Math.min(mask, smoothstep(spot.r, spot.r + 8, Math.hypot(x - spot.x, z - spot.z)));
    mask = Math.min(mask, smoothstep(3, 9, distanceToPath(area.road, x, z)) * 0.7 + 0.3);
    return mask;
  }

  Object.assign(game, {
    areas,
    areaAt,

    // Hvor højt jorden er et bestemt sted
    groundHeight(x, z) {
      const area = areaAt(x, z);
      if (onPier(area, x, z) && waterDistance(area, x, z) < 1) return 0.7;   // på molen
      const wd = waterDistance(area, x, z);
      if (wd < 0) {
        if (game.frozen && area.id !== 'sea') return game.waterLevel;   // isen bærer om vinteren
        if (area.id === 'sea') return -0.3 - Math.min(3, -wd * 0.25);   // havet bliver dybt
        return -0.45 * Math.min(1, -wd / 3);   // bunden af søen eller åen
      }
      const mask = flatness(area, x, z);
      let h = area.hills * hills(x - area.center.x, z - area.center.z, area.seed) * mask;
      if (area.peak) {
        const d = Math.hypot(x - area.peak.x, z - area.peak.z);
        h += area.peak.height * Math.max(0, 1 - d / area.peak.radius) ** 2 * mask;
      }
      const land = Math.max(h, 0) + Math.min(h, 0) * 0.5;   // dalene er ikke så dybe som bakkerne er høje
      if (area.id === 'sea') return Math.max(land, 0.15 + Math.min(wd, 10) * 0.04);   // stranden skråner op fra vandet
      return land;
    },

    // Er der vand her? (om vinteren er søen og åen frosne og tæller ikke som vand)
    isInWater(x, z) {
      const area = areaAt(x, z);
      if (onPier(area, x, z)) return false;
      if (game.frozen && area.id !== 'sea') return false;
      return waterDistance(area, x, z) < 0;
    },
    // Vand, der er for dybt til at gå i (havet)
    isDeepWater(x, z) {
      const area = areaAt(x, z);
      return area.id === 'sea' && !onPier(area, x, z) && waterDistance(area, x, z) < -1.5;
    },
    // Er der frossen sø/å her?
    isOnIce(x, z) {
      const area = areaAt(x, z);
      return !!game.frozen && area.id !== 'sea' && waterDistance(area, x, z) < 0;
    },
    isInLake(x, z) {
      return game.isInWater(x, z);
    },
    waterDistance(x, z) {
      return waterDistance(areaAt(x, z), x, z);
    },

    distanceToRoad(x, z) {
      return distanceToPath(areaAt(x, z).road, x, z);
    },

    // Hold en position inde i det område den er i
    clampToArea(position, margin = 1) {
      const area = areaAt(position.x, position.z);
      const half = area.size / 2 - margin;
      position.x = Math.max(area.center.x - half, Math.min(area.center.x + half, position.x));
      position.z = Math.max(area.center.z - half, Math.min(area.center.z + half, position.z));
    },
  });

  // Det område spilleren er i lige nu
  Object.defineProperty(game, 'area', {
    get() {
      const p = game.player?.position;
      return p ? areaAt(p.x, p.z) : home;
    },
  });

  return {};
}
