import * as THREE from 'three';

// Dag og nat: solen går hen over himlen, himlen skifter farve, og om natten kommer stjerner og månen.
export function createDayNight(game) {
  const { config, scene, world } = game;
  const cfg = config.dayNight;
  const cycle = cfg.dayLength + cfg.nightLength;

  let time = cfg.startTime;   // sekunder inde i døgnet (0 = solopgang)
  let day = 1;
  let wasNight = false;
  let warned = false;

  // Himmelfarver: [toppen af himlen, ved horisonten]
  const SKY = {
    day: [new THREE.Color(0x3f8fe0), new THREE.Color(0xbfe6ff)],
    dusk: [new THREE.Color(0x3a4f8a), new THREE.Color(0xf4a261)],
    night: [new THREE.Color(0x03081c), new THREE.Color(0x14224a)],
  };
  const SUN_COLOR = new THREE.Color(0xfff2d6);
  const DUSK_SUN = new THREE.Color(0xffa860);
  const MOON_COLOR = new THREE.Color(0x8fa6ff);

  // --- Himlen: en stor kugle med farveovergang og en sol ---
  const skyUniforms = {
    topColor: { value: new THREE.Color() },
    horizonColor: { value: new THREE.Color() },
    sunDirection: { value: new THREE.Vector3(0, 1, 0) },
    sunVisible: { value: 1 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(500, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 sunDirection;
        uniform float sunVisible;
        varying vec3 vDir;
        void main() {
          float h = max(vDir.y, 0.0);
          vec3 color = mix(horizonColor, topColor, pow(h, 0.55));
          float s = max(dot(vDir, sunDirection), 0.0);
          color += vec3(1.0, 0.85, 0.6) * pow(s, 12.0) * 0.35 * sunVisible;   // skær omkring solen
          color += vec3(1.6, 1.5, 1.2) * smoothstep(0.9975, 0.9985, s) * sunVisible;   // selve solen
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  scene.add(sky);

  // Stjerner og måne følger efter spilleren, så de altid ser langt væk ud
  const heavens = new THREE.Group();
  scene.add(heavens);

  const starPositions = [];
  for (let i = 0; i < 900; i++) {
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.05, Math.random() - 0.5).setLength(400);
    starPositions.push(v.x, v.y, v.z);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false });
  heavens.add(new THREE.Points(starGeo, starMat));

  const moonMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, fog: false });
  moonMat.color.multiplyScalar(1.4);
  const moon = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 18), moonMat);
  moon.rotation.set(0.4, 0.6, 0);
  heavens.add(moon);

  // Hvor lyst det er: 1 = fuld dag, 0 = nat
  function daylight() {
    const dawn = 8;   // skal passe med skipToMorning
    const dusk = 25;
    if (time < dawn) return time / dawn;
    if (time < cfg.dayLength - dusk) return 1;
    if (time < cfg.dayLength) return (cfg.dayLength - time) / dusk;
    return 0;
  }

  // Solen står op i øst (+x) og går ned i vest. Om natten går månen samme vej.
  const sunDir = new THREE.Vector3();
  const moonDir = new THREE.Vector3();
  function arc(target, phase) {
    const a = Math.PI * Math.max(0.03, Math.min(0.97, phase));
    return target.set(Math.cos(a), Math.sin(a) * 0.95 + 0.05, 0.35).normalize();
  }

  const top = new THREE.Color();
  const horizon = new THREE.Color();

  const dayNight = {
    get day() { return day; },
    get isNight() { return daylight() < 0.3; },
    get light() { return daylight(); },
    skyUniforms,

    // Spring natten over (når man sover)
    skipToMorning() {
      time = 8;   // lige efter solopgang, så det er lyst når man vågner
      day++;
      warned = false;
      wasNight = false;
      game.emit('morning', { day });
      game.message(`☀️ Godmorgen! Dag ${day}`);
    },

    update(dt) {
      time += dt;
      if (time >= cycle) {
        time -= cycle;
        day++;
        warned = false;
        game.emit('morning', { day });
        game.message(`☀️ Godmorgen! Dag ${day}`);
      }

      const light = daylight();
      const duskiness = 1 - Math.abs(light * 2 - 1);   // størst midt i solnedgangen
      top.copy(SKY.night[0]).lerp(SKY.day[0], light);
      horizon.copy(SKY.night[1]).lerp(SKY.day[1], light).lerp(SKY.dusk[1], duskiness * 0.8);
      top.lerp(SKY.dusk[0], duskiness * 0.4);
      skyUniforms.topColor.value.copy(top);
      skyUniforms.horizonColor.value.copy(horizon);
      scene.background.copy(horizon);
      scene.fog.color.copy(horizon);
      scene.fog.near = 25 + 25 * light;
      scene.fog.far = 70 + 70 * light;

      // Sol og måne
      const inDay = time < cfg.dayLength;
      arc(sunDir, inDay ? time / cfg.dayLength : 1);
      arc(moonDir, inDay ? 0 : (time - cfg.dayLength) / cfg.nightLength);
      skyUniforms.sunDirection.value.copy(sunDir);
      skyUniforms.sunVisible.value = light;
      world.sunDirection.copy(light > 0.15 ? sunDir : moonDir);
      world.sun.intensity = 0.25 + 1.35 * light;
      world.sun.color.copy(MOON_COLOR).lerp(SUN_COLOR, light).lerp(DUSK_SUN, duskiness * 0.6);
      world.hemi.intensity = 0.3 + 0.8 * light;

      // Inde i grotten er der mørkt
      if (game.inCave) {
        world.sun.intensity *= 0.05;
        world.hemi.intensity *= 0.08;
        scene.fog.color.setRGB(0.02, 0.02, 0.03);
        scene.fog.near = 2;
        scene.fog.far = 30;
      }

      const starsVisible = Math.max(0, 1 - light * 1.6);
      starMat.opacity = starsVisible;
      moonMat.opacity = starsVisible;
      heavens.visible = starsVisible > 0;
      sky.position.copy(game.camera.position);
      heavens.position.copy(game.camera.position);
      moon.position.copy(moonDir).multiplyScalar(380);

      if (!warned && time > cfg.dayLength - 35 && time < cfg.dayLength) {
        warned = true;
        game.message('🌅 Det bliver snart nat...');
      }
      const night = dayNight.isNight;
      if (night && !wasNight) {
        game.emit('nightfall', { day });
        game.message('🌙 Nu er det nat! Ænderne sover');
      }
      wasNight = night;
    },
  };

  game.remember('dayNight', {
    save: () => ({ time, day }),
    load(data) {
      time = data.time;
      day = data.day;
    },
  });

  return dayNight;
}
