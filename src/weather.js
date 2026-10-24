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
  let storm = false;    // tordenvejr
  let lightningTimer = 0;
  let flash = 0;
  let rainbowLeft = 0;
  let forceStorm = false;

  // Regnbuen: farvede buer på himlen, modsat solen
  const rainbow = new THREE.Group();
  const bowColors = [0xff3a3a, 0xff9a2a, 0xffe14d, 0x5ad85a, 0x3a9ae8, 0x5a5ae8, 0x9a5ae8];
  bowColors.forEach((color, i) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(150 - i * 3.2, 1.6, 6, 48, Math.PI),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, fog: false, depthWrite: false }),
    );
    rainbow.add(arc);
  });
  rainbow.visible = false;
  scene.add(rainbow);

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
    get isStorm() { return storm && rainLeft > 0; },
    // Til test: start regn (eller torden) nu
    startRain(withStorm = false) {
      rainAt = dayTime;
      forceStorm = withStorm;
    },

    update(dt) {
      dayTime += dt;
      if (rainAt >= 0 && dayTime >= rainAt) {
        rainAt = -1;
        rainLeft = cfg.rainLength;
        storm = !game.seasons?.isWinter && (forceStorm || Math.random() < cfg.stormChance);
        forceStorm = false;
        lightningTimer = 3;
        game.message(game.seasons?.isWinter ? '🌨️ Det begynder at sne!' : storm ? '⛈️ Tordenvejr! Det lyner og tordner' : '🌧️ Det begynder at regne!');
        game.emit('rainStart');
      }
      if (rainLeft > 0) {
        rainLeft -= dt;
        if (rainLeft <= 0) {
          game.message(game.seasons?.isWinter ? '🌤️ Det er holdt op med at sne' : '🌤️ Regnen er holdt op');
          if (!game.seasons?.isWinter && game.dayNight.light > 0.6) {
            rainbowLeft = cfg.rainbowSeconds;
            setTimeout(() => game.message('🌈 Se, en regnbue!'), 2500);
          }
          storm = false;
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

      // Lyn og torden
      if (storm && rainLeft > 0) {
        lightningTimer -= dt;
        if (lightningTimer <= 0) {
          lightningTimer = 4 + Math.random() * 7;
          flash = 0.18;
          setTimeout(() => game.sound.thunder(0.5 + Math.random() * 0.4), 300 + Math.random() * 1200);
        }
      }
      if (flash > 0) {
        flash -= dt;
        game.dayNight.skyUniforms.horizonColor.value.setRGB(1.6, 1.6, 1.8);
        game.dayNight.skyUniforms.topColor.value.setRGB(1.2, 1.2, 1.4);
        game.world.hemi.intensity += 2.5;
      }

      // Regnbuen står modsat solen
      if (rainbowLeft > 0) rainbowLeft -= dt;
      const bowOpacity = Math.min(1, rainbowLeft / 5, (cfg.rainbowSeconds - rainbowLeft) / 3) * 0.35;
      rainbow.visible = bowOpacity > 0.01;
      if (rainbow.visible) {
        const sun = game.world.sunDirection;
        rainbow.position.copy(game.camera.position).add(new THREE.Vector3(-sun.x, 0, -sun.z).normalize().multiplyScalar(260));
        rainbow.position.y -= 30;
        rainbow.lookAt(game.camera.position.x, rainbow.position.y, game.camera.position.z);
        rainbow.children.forEach((arc) => { arc.material.opacity = bowOpacity; });
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
