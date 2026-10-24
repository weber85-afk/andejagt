import * as THREE from 'three';

// Vejret: nogle dage kommer der en regnbyge. Regnen slukker bålet, hvis det ikke har et tag.
export function createWeather(game) {
  const { config, scene } = game;
  const cfg = config.weather;
  const GREY = new THREE.Color(0x6b7380);

  let rainAt = -1;      // hvornår på dagen det begynder at regne (-1 = ingen regn i dag)
  let rainLeft = 0;     // sekunder tilbage af regnen
  let amount = 0;       // 0 = tørvejr, 1 = fuld regn (glider langsomt)
  let dayTime = 0;

  function planDay() {
    const chance = game.seasons?.isWinter ? cfg.snowChance : cfg.rainChance;
    rainAt = Math.random() < chance ? 20 + Math.random() * (config.dayNight.dayLength - 60) : -1;
    dayTime = 0;
  }
  planDay();
  game.on('morning', planDay);

  // Regndråber: streger der falder omkring kameraet
  const count = 1500;
  const area = 30;
  const positions = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * area * 2;
    const y = Math.random() * 20;
    const z = (Math.random() - 0.5) * area * 2;
    positions.set([x, y, z, x, y - 0.5, z], i * 6);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xaecbe8, transparent: true, opacity: 0 });
  const rain = new THREE.LineSegments(geometry, material);
  rain.frustumCulled = false;
  scene.add(rain);

  const weather = {
    // Regn slukker bålet. Om vinteren sner det i stedet (det slukker ikke bålet).
    get isRaining() { return rainLeft > 0 && !game.seasons?.isWinter; },
    get isSnowing() { return rainLeft > 0 && !!game.seasons?.isWinter; },

    update(dt) {
      dayTime += dt;
      if (rainAt >= 0 && dayTime >= rainAt) {
        rainAt = -1;
        rainLeft = cfg.rainLength;
        game.message(game.seasons?.isWinter ? '🌨️ Det begynder at sne!' : '🌧️ Det begynder at regne!');
        game.emit('rainStart');
      }
      if (rainLeft > 0) {
        rainLeft -= dt;
        if (rainLeft <= 0) {
          game.message(game.seasons?.isWinter ? '🌤️ Det er holdt op med at sne' : '🌤️ Regnen er holdt op');
          game.emit('rainStop');
        }
      }
      amount += ((rainLeft > 0 ? 1 : 0) - amount) * Math.min(1, dt * 0.8);

      const snowing = !!game.seasons?.isWinter;
      material.opacity = amount * (snowing ? 0.9 : 0.6);
      material.color.set(snowing ? 0xffffff : 0xaecbe8);
      rain.visible = amount > 0.01;
      if (rain.visible) {
        rain.position.set(game.camera.position.x, game.camera.position.y - 8, game.camera.position.z);
        const fall = dt * (snowing ? 3 : 25);
        const length = snowing ? 0.08 : 0.5;
        for (let i = 0; i < count; i++) {
          let y = positions[i * 6 + 1] - fall;
          if (y < 0) y += 20;
          positions[i * 6 + 1] = y;
          positions[i * 6 + 4] = y - length;
          if (snowing) {
            // Sneen daler og svajer
            const sway = Math.sin(game.time + i) * dt * 0.5;
            positions[i * 6] += sway;
            positions[i * 6 + 3] = positions[i * 6];
          }
        }
        geometry.attributes.position.needsUpdate = true;
      }

      // Gråere himmel og mindre lys når det regner (kører efter dag/nat)
      if (amount > 0.01) {
        const grey = amount * 0.6 * game.dayNight.light;
        const sky = game.dayNight.skyUniforms;
        sky.topColor.value.lerp(GREY, grey);
        sky.horizonColor.value.lerp(GREY, grey);
        sky.sunVisible.value *= 1 - amount;
        scene.background.copy(sky.horizonColor.value);
        scene.fog.color.copy(scene.background);
        scene.fog.far *= 1 - amount * 0.35;
        game.world.sun.intensity *= 1 - amount * 0.5;
      }
    },
  };

  return weather;
}
