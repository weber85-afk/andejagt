import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { config } from './config.js';
import { createGame } from './game.js';
import { createInput } from './input.js';
import { createSound } from './sound.js';
import { createHud } from './hud.js';
import { createEffects } from './effects.js';
import { createAreas } from './areas.js';
import { createWorld } from './world.js';
import { createLife } from './life.js';
import { createDayNight } from './daynight.js';
import { createShop } from './shop.js';
import { createPlayer } from './player.js';
import { createWeapon } from './weapon.js';
import { createDucks } from './ducks.js';
import { createCampfire } from './campfire.js';
import { createShelter } from './shelter.js';
import { createDogs } from './dog.js';
import { createWeather } from './weather.js';
import { createGear } from './gear.js';
import { createSmokehouse } from './smokehouse.js';
import { createCamp } from './camp.js';
import { createWardrobe } from './wardrobe.js';
import { createCar } from './car.js';
import { createWildlife } from './wildlife.js';
import { createBear } from './bear.js';
import { createFishing } from './fishing.js';
import { createTrophies } from './trophies.js';
import { createTower } from './tower.js';
import { createMap } from './map.js';
import { createRanger } from './ranger.js';
import { createScore } from './score.js';
import { createSave } from './save.js';
import { createScreens } from './screens.js';
import { createSettings } from './settings.js';
import { createPhoto } from './photo.js';
import { createTips } from './tips.js';
import { createAmbience } from './ambience.js';
import { createHunger } from './hunger.js';
import { createTracks } from './tracks.js';
import { createFox } from './fox.js';
import { createPot } from './pot.js';
import { createForage } from './forage.js';
import { createSea } from './sea.js';
import { createSeasons } from './seasons.js';
import { createXp } from './xp.js';
import { createEconomy } from './economy.js';
import { createTreasure } from './treasure.js';
import { createTraps } from './traps.js';
import { createNightVision } from './nightvision.js';
import { createFarm } from './farm.js';
import { createDecor } from './decor.js';
import { createCold } from './cold.js';
import { createRides } from './rides.js';
import { createBoats } from './boats.js';
import { createStats } from './stats.js';

const game = createGame(config);
window.game = game; // så man kan kigge på spillet i browserens konsol

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);
game.renderer = renderer;

// Glød: ting der er lysere end hvid (bål, lamper, månen, ildfluer) får et blødt skær
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(game.scene, game.camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 1);
composer.addPass(bloom);
composer.addPass(new OutputPass());
let fancy = true;
game.render = () => {
  if (!fancy) {
    renderer.render(game.scene, game.camera);
    return;
  }
  bloom.strength = 0.35 + 0.6 * (1 - (game.dayNight?.light ?? 1));
  composer.render();
};

// Grafik: 'høj' (flot) eller 'lav' (hurtig)
game.setQuality = (quality) => {
  fancy = quality !== 'lav';
  const ratio = fancy ? Math.min(devicePixelRatio, 2) : 1;
  renderer.setPixelRatio(ratio);
  composer.setPixelRatio(ratio);
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  if (game.world) {
    game.world.sun.castShadow = fancy;
    game.world.lowQuality = !fancy;
  }
};

game.input = createInput(game);
game.sound = createSound();
game.settings = createSettings(game);

// Alle delene af spillet. Rækkefølgen er den rækkefølge, de bliver opdateret i.
// Nye ting (fx nye dyr eller våben) tilføjes her.
createAreas(game);
game.add('world', createWorld(game));
game.add('dayNight', createDayNight(game));
game.add('seasons', createSeasons(game));
game.add('weather', createWeather(game));
game.add('effects', createEffects(game));
game.add('life', createLife(game));
game.add('hud', createHud(game));
game.add('shop', createShop(game));
game.add('xp', createXp(game));
game.add('economy', createEconomy(game));
game.add('player', createPlayer(game));
game.add('ducks', createDucks(game));
game.add('tracks', createTracks(game));
game.add('wildlife', createWildlife(game));
game.add('bear', createBear(game));
game.add('tower', createTower(game));
game.add('ranger', createRanger(game));
game.add('map', createMap(game));
game.add('weapon', createWeapon(game));
game.add('gear', createGear(game));
game.add('fishing', createFishing(game));
game.add('treasure', createTreasure(game));
game.add('traps', createTraps(game));
game.add('nightVision', createNightVision(game));
game.add('campfire', createCampfire(game));
game.add('smokehouse', createSmokehouse(game));
game.add('fox', createFox(game));
game.add('pot', createPot(game));
game.add('farm', createFarm(game));
game.add('decor', createDecor(game));
game.add('forage', createForage(game));
game.add('shelter', createShelter(game));
game.add('trophies', createTrophies(game));   // efter shelteret, da trofæerne hænger i det
game.add('cold', createCold(game));
game.add('dogs', createDogs(game));
game.add('camp', createCamp(game));
game.add('car', createCar(game));
game.add('sea', createSea(game));
game.add('rides', createRides(game));
game.add('boats', createBoats(game));
game.add('wardrobe', createWardrobe(game));
game.add('score', createScore(game));
game.add('photo', createPhoto(game));
game.add('ambience', createAmbience(game));
game.add('hunger', createHunger(game));
game.add('stats', createStats(game));
game.add('dogPetting', { update: () => game.dogs.petUpdate() });   // sidst, så E først bruges til andet
game.add('tips', createTips(game));
game.add('save', createSave(game));

// HUD'en skal opdateres til sidst, så den viser det nyeste
game.systems.push(game.systems.splice(game.systems.indexOf(game.hud), 1)[0]);

// Hent det gemte spil (hvis der er et)
game.save.load();
game.tips.skipIfExperienced();
game.xp.seedFromStats(game.saveables.stats.save().s);
game.settings.apply();

game.screens = createScreens(game, renderer.domElement);
game.screens.addPauseButton('🏅 Medaljer', () => game.stats.showPage());
game.screens.addStartButton('👤 Skift spiller', () => game.save.showPlayers());
game.screens.addStartButton('📥 Hent spil fra fil', () => game.save.importFile());
game.screens.addStartButton('📤 Gem spillet som fil', () => game.save.exportFile());
game.screens.addPauseButton('📤 Gem spillet som fil', () => game.save.exportFile());
game.screens.showStart();   // vis startskærmen igen med spillerknappen

addEventListener('resize', () => {
  game.camera.aspect = innerWidth / innerHeight;
  game.camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// --- Spil-løkken: kører ca. 60 gange i sekundet ---
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!game.paused && !game.sleeping) {
    game.time += dt;
    for (const system of game.systems) {
      // En fejl i én del må ikke fryse hele spillet
      try {
        system.update?.(dt);
      } catch (error) {
        if (!system.failed) console.error('Fejl i spillet:', error);
        system.failed = true;
      }
    }
  }
  game.render();
  game.input.endFrame();
}

// Tegn verden én gang, så den kan ses bag startskærmen
game.player.update(0);
game.dayNight.update(0);
loop();
