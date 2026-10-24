// Giver point, når der sker noget i spillet.
export function createScore(game) {
  const points = game.config.points;

  const foods = game.config.foods;

  game.on('animalHit', ({ type, golden }) => {
    const points = golden ? game.config.ducks.goldenPoints : foods[type]?.shotPoints ?? game.config.animals[type]?.shotPoints ?? 0;
    game.state.points += points;
  });
  const cookedPoints = (type) => foods[type].cookedPoints + (game.shop.has('spices') ? points.spiceBonus : 0);
  game.on('foodCooked', ({ type }) => {
    game.state.points += cookedPoints(type);
  });
  game.on('foodBurnt', () => {
    game.state.points += points.burnt;
  });

  return { cookedPoints };
}
