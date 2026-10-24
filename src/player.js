import * as THREE from 'three';
import { box, pivot } from './models.js';

// Hatte man kan have på (bygget i forhold til midten af hovedet)
const HATS = {
  hunter: () => [
    box(0.62, 0.06, 0.62, 0x3d6b2a, 0, 0.26, 0),
    box(0.46, 0.2, 0.46, 0x3d6b2a, 0, 0.38, 0),
    box(0.47, 0.06, 0.47, 0x8b5a2b, 0, 0.3, 0),
  ],
  cowboy: () => [
    box(0.85, 0.05, 0.85, 0x9b6a3b, 0, 0.26, 0),
    box(0.44, 0.28, 0.44, 0x9b6a3b, 0, 0.42, 0),
    box(0.45, 0.06, 0.45, 0x3a2a14, 0, 0.32, 0),
  ],
  viking: () => {
    const parts = [
      box(0.52, 0.24, 0.52, 0x9a9a9a, 0, 0.32, 0),
      box(0.54, 0.06, 0.54, 0x8b6a2b, 0, 0.22, 0),
    ];
    for (const side of [-1, 1]) {
      parts.push(box(0.22, 0.1, 0.1, 0xf2ead2, side * 0.36, 0.36, 0));
      parts.push(box(0.09, 0.22, 0.09, 0xf2ead2, side * 0.45, 0.48, 0));
    }
    return parts;
  },
  crown: () => {
    const gold = 0xf2c22b;
    const parts = [box(0.5, 0.16, 0.5, gold, 0, 0.32, 0), box(0.1, 0.1, 0.03, 0xd8323c, 0, 0.32, -0.26)];
    for (const [x, z] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21], [0, -0.21], [0, 0.21], [-0.21, 0], [0.21, 0]]) {
      parts.push(box(0.08, 0.16, 0.08, gold, x, 0.46, z));
    }
    return parts;
  },
};

// Figuren man styrer, og kameraet der følger den.
export function createPlayer(game) {
  const { config, input, camera } = game;
  const cfg = config.player;

  // --- Figuren (kigger mod -Z) ---
  const skin = 0xf2c49b;
  const vest = 0xe8692b;
  const pants = 0x34508f;
  const boots = 0x5a3a1e;

  const legL = pivot(-0.14, 0.8, 0, box(0.24, 0.62, 0.28, pants, 0, -0.31, 0), box(0.26, 0.2, 0.34, boots, 0, -0.7, -0.03));
  const legR = pivot(0.14, 0.8, 0, box(0.24, 0.62, 0.28, pants, 0, -0.31, 0), box(0.26, 0.2, 0.34, boots, 0, -0.7, -0.03));
  const body = box(0.66, 0.66, 0.38, vest, 0, 1.12, 0);
  const belt = box(0.68, 0.08, 0.4, 0x3a2a14, 0, 0.82, 0);

  const head = new THREE.Group();
  head.position.set(0, 1.7, 0);
  head.add(
    box(0.48, 0.48, 0.48, skin),
    box(0.08, 0.08, 0.02, 0x222222, -0.11, 0.03, -0.25),
    box(0.08, 0.08, 0.02, 0x222222, 0.11, 0.03, -0.25),
    box(0.16, 0.04, 0.02, 0xa0522d, 0, -0.12, -0.25),
  );
  const hat = new THREE.Group();
  hat.add(...HATS.hunter());
  head.add(hat);

  // "aim" drejer op og ned med blikket, så armene og geværet peger samme vej som man kigger
  const aim = pivot(0, 1.38, 0,
    box(0.2, 0.2, 0.6, vest, 0.38, 0, -0.25),
    box(0.18, 0.18, 0.16, skin, 0.38, 0, -0.6),
    box(0.2, 0.2, 0.55, vest, -0.3, -0.05, -0.3),
    box(0.18, 0.18, 0.16, skin, -0.12, -0.05, -0.62),
  );
  aim.children[2].rotation.y = -0.5;

  // Vesten har sit eget materiale, så farven kan skiftes
  const vestMaterial = new THREE.MeshLambertMaterial({ color: vest });
  for (const m of [body, aim.children[0], aim.children[2]]) m.material = vestMaterial;

  const figure = new THREE.Group();
  figure.add(legL, legR, body, belt, head, aim);
  game.scene.add(figure);

  // --- Tilstand ---
  const position = new THREE.Vector3(cfg.startPosition.x, 0, cfg.startPosition.z);
  let velocityY = 0;
  let onGround = true;
  let yaw = 0;
  let pitch = 0;
  let walkPhase = 0;
  let mode = config.camera.startMode;
  let boostFactor = 1;
  let boostUntil = 0;
  let vehicle = null;   // fx båden: { speed, seatHeight, constrain(position) }

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  const lookDir = new THREE.Vector3();

  // Kameraet bag figuren må ikke gå ind i træer, huse eller jorden
  const camStart = new THREE.Vector3();
  const camEnd = new THREE.Vector3();
  const camTry = new THREE.Vector3();
  function blocked(p, nearby) {
    if (p.y < game.groundHeight(p.x, p.z) + 0.25) return true;
    for (const c of nearby) {
      if (c.r !== undefined) {
        if (c.r > 0.3 && p.y < 4 && Math.hypot(p.x - c.x, p.z - c.z) < c.r + 0.3) return true;
      } else if (p.y < 3 && p.x > c.minX - 0.2 && p.x < c.maxX + 0.2 && p.z > c.minZ - 0.2 && p.z < c.maxZ + 0.2) {
        return true;
      }
    }
    return false;
  }
  function placeCamera(start, end) {
    const reach = start.distanceTo(end) + 2;
    const nearby = game.colliders.filter((c) => Math.hypot(c.x - start.x, c.z - start.z) < reach + 2);
    let t = 1;
    for (let k = 0.08; k <= 1.0001; k += 0.04) {
      camTry.lerpVectors(start, end, k);
      if (blocked(camTry, nearby)) {
        t = Math.max(0.12, k - 0.06);
        break;
      }
    }
    camera.position.lerpVectors(start, end, t);
  }

  const player = {
    position,
    get walkPhase() { return walkPhase; },
    get onGround() { return onGround; },
    figure,
    aim,
    get yaw() { return yaw; },
    get pitch() { return pitch; },
    get mode() { return mode; },

    // Flyt figuren et andet sted hen (fx når man vågner i sengen)
    teleport(x, z, newYaw = yaw) {
      position.set(x, game.groundHeight(x, z), z);
      yaw = newYaw;
      velocityY = 0;
    },

    // Løb hurtigere i et stykke tid
    boost(factor, seconds) {
      boostFactor = factor;
      boostUntil = game.time + seconds;
    },
    get boosted() { return game.time < boostUntil; },

    // Drej kameraet (fx når bilen svinger)
    addYaw(delta) {
      yaw += delta;
    },

    // Sid i noget der kan sejle/køre (null = gå selv)
    get vehicle() { return vehicle; },
    setVehicle(v) {
      vehicle = v;
      velocityY = 0;
    },

    setHat(id) {
      hat.clear();
      hat.add(...(HATS[id] ?? HATS.hunter)());
    },

    setVestColor(color) {
      vestMaterial.color.set(color ?? vest);
    },

    setMode(newMode) {
      mode = newMode;
      game.emit('cameraMode', { mode });
    },

    update(dt) {
      // Kig rundt med musen
      const look = input.takeMouseDelta();
      const sensitivity = cfg.mouseSensitivity / (game.weapon?.zoom ?? 1);
      yaw -= look.x * sensitivity;
      pitch -= look.y * sensitivity;
      pitch = Math.max(-1.55, Math.min(1.55, pitch));

      if (input.wasPressed('KeyV')) {
        player.setMode(mode === 'first' ? 'third' : 'first');
        game.message(mode === 'first' ? '👀 Gennem øjnene' : '🎥 Bag figuren');
      }

      // Gå
      forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      move.set(0, 0, 0);
      if (input.isDown('KeyW') || input.isDown('ArrowUp')) move.add(forward);
      if (input.isDown('KeyS') || input.isDown('ArrowDown')) move.sub(forward);
      if (input.isDown('KeyD') || input.isDown('ArrowRight')) move.add(right);
      if (input.isDown('KeyA') || input.isDown('ArrowLeft')) move.sub(right);

      const driving = !!vehicle?.drive;
      const moving = !driving && move.lengthSq() > 0;
      if (driving) {
        vehicle.drive(dt);   // bilen flytter figuren og drejer kameraet med
      } else if (moving && vehicle) {
        move.normalize().multiplyScalar(vehicle.speed * dt);
        position.add(move);
        vehicle.constrain(position);
      } else if (moving) {
        let speed = input.isDown('ShiftLeft') || input.isDown('ShiftRight') ? cfg.runSpeed : cfg.walkSpeed;
        if (game.isInLake(position.x, position.z)) speed *= cfg.waterSlowdown;
        if (game.time < boostUntil) speed *= boostFactor;
        speed *= (game.hunger?.speedFactor ?? 1) * (game.cold?.speedFactor ?? 1);
        move.normalize().multiplyScalar(speed * dt);
        const oldX = position.x;
        const oldZ = position.z;
        position.add(move);
        game.pushOut(position, 0.35);
        if (game.isDeepWater(position.x, position.z)) {
          // Havet er for dybt til at gå ud i
          position.x = oldX;
          position.z = oldZ;
        }
        game.clampToArea(position);
        if (onGround) walkPhase += dt * speed * 1.4;
      }

      // Hop og tyngdekraft
      if (!driving) {
        const ground = vehicle ? vehicle.seatHeight : game.groundHeight(position.x, position.z);
        if (onGround && !vehicle && input.isDown('Space')) {
          velocityY = cfg.jumpPower;
          onGround = false;
        }
        velocityY -= cfg.gravity * dt;
        position.y += velocityY * dt;
        if (position.y <= ground) {
          position.y = ground;
          velocityY = 0;
          onGround = true;
        }
      }

      // Animer figuren
      const swing = moving && onGround && !vehicle ? Math.sin(walkPhase) * 0.7 : 0;
      legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, swing, 0.3);
      legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, -swing, 0.3);
      figure.position.copy(position);
      figure.rotation.y = yaw;
      aim.rotation.x = pitch;
      head.rotation.x = pitch * 0.5;

      // Kamera
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
      const eyeY = position.y + cfg.eyeHeight;
      if (mode === 'first' || driving) figure.visible = false;
      if (mode === 'first') {
        const bob = moving && onGround && !vehicle ? Math.abs(Math.sin(walkPhase)) * 0.05 : 0;
        camera.position.set(position.x, eyeY + bob, position.z);
      } else {
        figure.visible = !driving;
        lookDir.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
        camStart.set(position.x, eyeY + 0.4, position.z);
        camEnd.copy(camStart)
          .addScaledVector(lookDir, -(vehicle?.cameraDistance ?? config.camera.thirdPersonDistance))
          .addScaledVector(right, 1.0);
        placeCamera(camStart, camEnd);
      }
      camera.updateMatrixWorld();
    },
  };

  game.remember('player', {
    save: () => ({ x: position.x, y: position.y, z: position.z, yaw, pitch, mode }),
    load(data) {
      position.set(data.x, data.y, data.z);
      yaw = data.yaw;
      pitch = data.pitch;
      mode = data.mode;
    },
  });

  return player;
}
