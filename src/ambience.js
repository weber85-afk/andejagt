// Baggrundslyde: fugle om dagen, fårekyllinger om natten, vand der risler, vind og fodtrin.
export function createAmbience(game) {
  const { sound } = game;
  let birdTimer = 2;
  let cricketTimer = 1;
  let lastStep = 0;

  return {
    update(dt) {
      const p = game.player.position;
      const light = game.dayNight.light;
      const raining = game.weather.isRaining;
      const winter = game.seasons?.isWinter;
      const area = game.area.id;

      // Fugle om dagen, fårekyllinger om natten (ikke i regn eller om vinteren)
      birdTimer -= dt;
      if (birdTimer <= 0) {
        birdTimer = 1.5 + Math.random() * 4;
        if (light > 0.6 && !raining && !winter && area !== 'mountain') sound.chirp(0.05 + Math.random() * 0.1);
      }
      cricketTimer -= dt;
      if (cricketTimer <= 0) {
        cricketTimer = 0.6 + Math.random() * 1.2;
        if (light < 0.3 && !raining && !winter) sound.cricket(0.02 + Math.random() * 0.03);
      }

      // Vand, hav og vind
      const water = game.waterDistance(p.x, p.z);
      const frozen = game.seasons?.isFrozen;
      sound.setLoop('river', area === 'forest' && !frozen ? Math.max(0, 1 - water / 25) * 0.25 : 0);
      sound.setLoop('sea', area === 'sea' ? Math.max(0.05, 1 - Math.max(0, water) / 60) * 0.35 : 0);
      sound.setLoop('wind', area === 'mountain' ? 0.25 : area === 'forest' ? 0.06 : raining ? 0.08 : 0.02);

      // Fodtrin: én lyd hver gang benet svinger frem
      const phase = game.player.walkPhase;
      if (phase - lastStep > Math.PI) {
        lastStep = phase;
        if (game.player.onGround && !game.player.vehicle) {
          const surface = game.isInWater(p.x, p.z) ? 'water' : winter || (area === 'mountain' && p.y > 5) ? 'snow' : 'grass';
          sound.step(surface);
        }
      }
      if (phase < lastStep) lastStep = phase;
    },
  };
}
