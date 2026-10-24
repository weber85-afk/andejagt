// Pynt til figuren: hatte og vestefarver. Kan ses, når kameraet er bag figuren (V).
export function createWardrobe(game) {
  const { config, shop, player } = game;

  for (const hat of config.hats) {
    shop.addItem({
      id: `hat-${hat.id}`,
      category: 'pynt',
      emoji: hat.emoji,
      name: hat.name,
      cosmetic: true,
      group: 'hat',
      price: hat.price,
      onEquip: (on) => player.setHat(on ? hat.id : 'hunter'),
    });
  }

  for (const vest of config.vestColors) {
    const hex = `#${vest.color.toString(16).padStart(6, '0')}`;
    shop.addItem({
      id: `vest-${vest.id}`,
      category: 'pynt',
      emoji: `<span class="swatch" style="background:${hex}"></span>`,
      name: `${vest.name} vest`,
      cosmetic: true,
      group: 'vest',
      price: config.prices.vestColor,
      onEquip: (on) => player.setVestColor(on ? vest.color : null),
    });
  }

  return {};
}
