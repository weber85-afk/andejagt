// ============================================================
//  INDSTILLINGER FOR SPILLET
//  Prøv at ændre tallene herunder, gem filen og genindlæs siden!
// ============================================================

export const config = {
  // --- Verden ---
  world: {
    size: 120,             // Hvor stor verden er (meter fra kant til kant)
    trees: 45,             // Antal træer
    bushes: 30,            // Antal buske
    lakeRadius: 14,        // Hvor stor søen er
    lakePosition: { x: 0, z: -22 },
    skyColor: 0x8fd3ff,
    hills: 1.4,            // Hvor høje bakkerne er (0 = helt flad)
    grassTufts: 2500,      // Græstotter (færre = hurtigere på langsomme computere)
    flowers: 300,
    parking: { x: -16, z: 19 },   // Hvor bilen holder
    // Grusvejen ud til Storskoven (punkter vejen går igennem)
    road: [{ x: -16, z: 19 }, { x: -30, z: 21 }, { x: -44, z: 16 }, { x: -66, z: 18 }],
  },

  // --- Storskoven (den store skov man kører til i bilen) ---
  forest: {
    center: { x: 0, z: -420 },   // Hvor i verden skoven ligger (langt væk fra lejren)
    size: 220,
    hills: 3,
    trees: 320,
    grassTufts: 4000,
    flowers: 120,
    mushrooms: 70,
    // Steder er i forhold til skovens midte
    parking: { x: 34, z: 8 },
    road: [{ x: 34, z: 8 }, { x: 55, z: 12 }, { x: 80, z: 5 }, { x: 116, z: 10 }],
    river: [{ x: -116, z: -40 }, { x: -60, z: -20 }, { x: -20, z: -36 }, { x: 20, z: -14 }, { x: 60, z: -30 }, { x: 116, z: -20 }],
    riverWidth: 7,
    ranger: { x: 28, z: 0 },     // Skovfogeden
    tower: { x: -22, z: 30 },    // Jagttårnet
  },

  // --- Dag og nat ---
  dayNight: {
    dayLength: 180,        // Sekunder dagen varer
    nightLength: 80,       // Sekunder natten varer (hvis man ikke sover)
    startTime: 10,         // Hvor langt inde i dagen et nyt spil starter
  },

  // --- Figuren (dig!) ---
  player: {
    walkSpeed: 6,          // Hvor hurtigt man går
    runSpeed: 11,          // Hvor hurtigt man løber (med Shift)
    jumpPower: 7,          // Hvor højt man hopper
    gravity: 20,
    eyeHeight: 1.7,        // Hvor højt øjnene sidder
    mouseSensitivity: 0.0022,
    startPosition: { x: 0, z: 12 },
    waterSlowdown: 0.55,   // Man går langsommere i søen
  },

  // --- Kamera ---
  camera: {
    startMode: 'first',    // 'first' = gennem øjnene, 'third' = bag figuren
    thirdPersonDistance: 4.5,
    fov: 75,
  },

  // --- Våben ---
  weapon: {
    startAmmo: 24,         // Patroner i tasken når man starter
    ammoPack: 10,          // Hvor mange patroner man får pr. køb
    ammoPrice: 10,
    rifle: {
      cooldown: 0.35,      // Sekunder mellem hvert skud
      range: 80,           // Hvor langt man kan skyde
      magazine: 6,         // Skud før man skal lade om (R)
      reloadTime: 1.2,
      // "Bedre gevær": hvert niveau giver hurtigere skud, længere rækkevidde og større magasin
      upgrades: [
        { cooldown: 0.27, range: 100, magazine: 8 },
        { cooldown: 0.2, range: 120, magazine: 10 },
        { cooldown: 0.13, range: 150, magazine: 12 },
      ],
    },
    shotgun: {
      cooldown: 0.8,
      range: 35,
      magazine: 2,
      reloadTime: 1.6,
      hitRadius: 3.5,      // Rammer alle ænder inden for denne afstand fra sigtet
    },
    // Riflen: til bjørne (og alt andet). Kan købes, når man har bilen.
    bigRifle: {
      price: 500,
      cooldown: 1.2,
      range: 150,
      magazine: 3,
      reloadTime: 2,
    },
    scopeZoom: 3.5,        // Hvor meget kikkertsigtet forstørrer
    binocularZoom: 5,      // Hvor meget kikkerten (B) forstørrer
  },

  // --- Sult ---
  hunger: {
    secondsPerPoint: 5,    // Så mange sekunder før man bliver 1 point mere sulten (mæthed går fra 100 til 0)
    eatAmount: 35,         // Så meget mættere man bliver af at spise (F)
    dishAmount: 70,        // ... og af en ret fra gryden
    hungryBelow: 25,       // Under dette er man sulten og går langsommere
    hungryFactor: 0.75,
    starvingFactor: 0.6,
  },

  // --- Fiskeri ---
  fishing: {
    castDistance: 14,      // Hvor langt man kan kaste
    minWait: 3,            // Sekunder før en fisk bider (mindst)
    maxWait: 9,            // (højst)
    biteTime: 1.3,         // Så lang tid har man til at klikke, når fisken bider
    maxWeight: 4,          // Den største fisk man kan fange (kg)
  },

  // --- Bjørnen ---
  bear: {
    firstBearAfter: 60,    // Sekunder i Storskoven før den første bjørn kommer
    minTime: 120,          // Tid mellem bjørne (sekunder)
    maxTime: 240,
    health: 3,             // Skud med riflen før bjørnen falder
    walkSpeed: 2,
    chargeSpeed: 8.5,      // Du løber 11 med Shift, så du kan godt nå at slippe væk
    noticeDistance: 22,    // Så tæt på kan man komme, før bjørnen ser én
    attackDistance: 2.2,
  },

  // --- Udstyr ---
  whistle: {
    duration: 30,          // Sekunder ænderne bliver lokket
    cooldown: 60,          // Sekunder før fløjten kan bruges igen
  },
  decoys: {
    extraDucks: 3,         // Flere ænder når man har lokkeænder
  },

  // --- Ænderne ---
  ducks: {
    maxFlying: 6,          // Hvor mange ænder der flyver på én gang
    spawnDelay: 2.5,       // Sekunder før en ny and kommer
    speed: 5,              // Hvor hurtigt de flyver
    minHeight: 5,
    maxHeight: 13,
    hitRadius: 1.3,        // Hvor stor en and er at ramme (større = nemmere)
    quackChance: 0.15,     // Hvor tit de rapper (pr. sekund)
    lowHeight: 3,          // Hvor lavt de flyver, når de bliver lokket
    goldenChance: 0.05,    // Chancen for at en ny and er den gyldne and
    goldenPoints: 100,
    flockChance: 0.6,      // Chancen for et andetræk (stor flok) hver dag
    flockSize: 14,
  },

  // --- Bålet ---
  campfire: {
    position: { x: 14, z: 6 },
    startSpits: 1,         // Hvor mange ænder der kan steges på én gang fra start
    cookTime: 8,           // Sekunder før anden er færdigstegt
    burnTime: 8,           // Sekunder EFTER den er færdig, før den brænder på
    useDistance: 3.2,      // Hvor tæt man skal stå for at bruge bålet
    // "Større bål": plads til så mange ænder på hvert niveau
    upgradePrice: 40,
    upgrades: [2, 3, 4, 6],
    // "Hurtigere stegning": stegetiden ganges med disse tal
    fastCookPrice: 50,
    fastCook: [0.75, 0.55, 0.4],
    alarmSeconds: 3,       // Alarmen bimler så mange sekunder før en and brænder på
  },

  // --- Gryden (opskrifter) ---
  pot: {
    price: 120,
    cookTime: 15,          // Sekunder om at lave en ret
  },
  // needs = det man skal bruge fra tasken, portions = hvor mange retter man får
  recipes: [
    { id: 'pie', name: 'Bærtærte', emoji: '🥧', needs: { berry: 6 }, points: 50, portions: 2 },
    { id: 'stew', name: 'Andegryde', emoji: '🍲', needs: { duck: 2, mushroom: 2 }, points: 80, portions: 2 },
    { id: 'fishsoup', name: 'Fiskesuppe', emoji: '🍜', needs: { fish: 2, berry: 1 }, points: 60, portions: 2 },
    { id: 'gamestew', name: 'Vildtgryde', emoji: '🥘', needs: { hare: 1, pheasant: 1, mushroom: 1 }, points: 110, portions: 2 },
    { id: 'goose', name: 'Gåsesteg med bær', emoji: '🍗', needs: { goose: 1, berry: 3 }, points: 120, portions: 3 },
    { id: 'venison', name: 'Hjortesteg', emoji: '🥩', needs: { deer: 1, mushroom: 2, berry: 2 }, points: 200, portions: 3 },
    { id: 'feast', name: 'Bjørnefest', emoji: '🍖', needs: { bear: 1, mushroom: 3, berry: 3 }, points: 350, portions: 5 },
  ],

  // --- Røgeriet ---
  smokehouse: {
    position: { x: 8, z: 0 },
    price: 350,
    capacity: 4,           // Ænder der kan ryges på én gang
    smokeTime: 20,         // Sekunder om at ryge en and
  },

  // --- Årstider ---
  seasons: {
    daysPerSeason: 3,      // Så mange dage hver årstid varer
  },

  // --- Vejr ---
  weather: {
    rainChance: 0.4,       // Chancen for regn hver dag (0 = aldrig, 1 = hver dag)
    snowChance: 0.7,       // Chancen for sne hver dag om vinteren
    rainLength: 40,        // Sekunder det regner
  },

  // --- Butikken ---
  shop: {
    position: { x: -9, z: 8 },
    // Prisen på opgraderinger: 1. køb × 1, 2. køb × 2, 3. køb × 6, 4. køb × 15 osv.
    priceSteps: [1, 2, 6, 15, 30],
    sellCookedDuck: 10,    // Hvad sælgeren betaler for en stegt and
  },

  // --- Shelter ---
  shelter: {
    position: { x: 24, z: 22 },
    price: 150,
    restedBoost: 1.35,     // Så meget hurtigere man løber, når man er udhvilet
    restedSeconds: 120,
  },

  // --- Fjeldet (kræver firehjulstræk på bilen) ---
  mountain: {
    center: { x: 450, z: 0 },
    size: 200,
    hills: 6,
    peak: { x: -20, z: -45, height: 48, radius: 85 },   // det store bjerg (i forhold til midten)
    snowLine: 7,           // Over denne højde er der sne
    trees: 90,
    grassTufts: 1200,
    flowers: 40,
    parking: { x: 60, z: 30 },
    road: [{ x: 60, z: 30 }, { x: 80, z: 36 }, { x: 106, z: 30 }],
    fourWheelPrice: 600,
  },

  // --- Havet ---
  sea: {
    center: { x: -450, z: 0 },
    size: 220,
    hills: 1.2,
    shore: 10,             // Havet begynder her (z i forhold til midten)
    trees: 50,
    grassTufts: 1500,
    flowers: 150,
    parking: { x: 0, z: -40 },
    road: [{ x: 0, z: -40 }, { x: 6, z: -70 }, { x: 0, z: -116 }],
    pier: { x: 0, from: 6, to: 50, width: 3 },          // Molen ud i vandet
    cutterPrice: 400,      // Fiskekutteren man kan sejle i
    cutterSpeed: 9,
    maxFishWeight: 12,     // Fisk i havet kan blive meget større
  },

  // --- Lejren ---
  hide: {
    position: { x: 16.5, z: -22 },   // Jagtskjulet ved søen
  },
  boat: {
    position: { x: 0, z: -10 },      // Hvor båden ligger i søen
    speed: 7,
  },
  flag: {
    position: { x: 17.5, z: 9.5 },
    colors: ['#c8102e', '#ffffff'],  // Flagets farver: baggrund og kors
    cross: true,                     // true = kors som Dannebrog, false = ensfarvet
  },

  // --- Bilen ---
  car: {
    price: 800,
    maxSpeed: 16,          // Topfart (meter i sekundet)
    reverseSpeed: 6,
    acceleration: 9,
    turnSpeed: 1.8,
    tank: 100,             // Så meget benzin der er i en fuld tank
    fuelPerMeter: 0.06,    // Så meget benzin bilen bruger pr. meter
    travelFuel: 10,        // Så meget benzin turen til/fra Storskoven koster
    reserveSpeed: 4,       // Bilen kan altid køre så hurtigt, også med tom tank
    fuelPrice: 20,         // Pris for at fylde tanken
    trailerPrice: 150,     // Trailer, så hundene kan komme med til Storskoven
  },

  // --- Hundene ---
  dog: {
    name: 'Bobby',         // Hundens navn
    secondName: 'Molly',   // Navnet på hund nummer 2
    speed: 9,              // Hvor hurtigt hundene løber
    price: 100,
    // Hvor mange ænder hunden kan bære. Første køb giver hunden, resten er opgraderinger.
    capacity: [1, 2, 3, 5],
    speedPrice: 60,
    speedUpgrades: [1.25, 1.5, 1.8],
    treatBoost: 1.6,       // Hundekiks: så meget hurtigere
    treatSeconds: 60,
  },

  // --- Priser i butikken (i point) ---
  // Ting med flere niveauer starter med denne pris og bliver dyrere (se shop.priceSteps)
  prices: {
    betterGun: 80,
    shotgun: 200,
    scope: 120,
    whistle: 60,
    decoys: 90,
    flashlight: 50,
    dogBasket: 40,
    dogTreat: 5,
    secondDog: 400,
    alarm: 70,
    spices: 100,
    fireRoof: 80,
    shelterLamp: 30,
    chest: 120,
    biggerShelter: 300,
    hide: 150,
    boat: 250,
    flag: 40,
    vestColor: 20,
    dogScarf: 25,
    dogGlasses: 25,
    fishingRod: 60,
    trophyWall: 100,
    tower: 200,
    mapCompass: 40,
    iceDrill: 70,
    binoculars: 80,
    carColor: 40,
  },

  // --- Pynt ---
  hats: [
    { id: 'cowboy', name: 'Cowboyhat', emoji: '🤠', price: 30 },
    { id: 'viking', name: 'Vikinghjelm', emoji: '⚔️', price: 60 },
    { id: 'crown', name: 'Krone', emoji: '👑', price: 100 },
  ],
  carColors: [
    { id: 'blue', name: 'Blå', color: 0x2f6fd8 },
    { id: 'green', name: 'Grøn', color: 0x3a9a3a },
    { id: 'yellow', name: 'Gul', color: 0xf2c22b },
    { id: 'black', name: 'Sort', color: 0x2a2a2a },
    { id: 'pink', name: 'Lyserød', color: 0xff7fb0 },
  ],
  vestColors: [
    { id: 'blue', name: 'Blå', color: 0x2f6fd8 },
    { id: 'green', name: 'Grøn', color: 0x3a9a3a },
    { id: 'purple', name: 'Lilla', color: 0x8a4fd0 },
    { id: 'yellow', name: 'Gul', color: 0xf2c22b },
    { id: 'black', name: 'Sort', color: 0x2a2a2a },
  ],

  // --- Vildt og mad ---
  // shotPoints = point for at ramme dyret, cookedPoints = point for at stege det
  foods: {
    duck: { name: 'and', plural: 'ænder', emoji: '🦆', shotPoints: 5, cookedPoints: 20 },
    pheasant: { name: 'fasan', plural: 'fasaner', emoji: '🐦', shotPoints: 8, cookedPoints: 25 },
    goose: { name: 'gås', plural: 'gæs', emoji: '🪿', shotPoints: 12, cookedPoints: 35 },
    hare: { name: 'hare', plural: 'harer', emoji: '🐇', shotPoints: 10, cookedPoints: 30 },
    fish: { name: 'fisk', plural: 'fisk', emoji: '🐟', shotPoints: 5, cookedPoints: 15 },
    bear: { name: 'bjørnekød', plural: 'bjørnekød', emoji: '🍖', shotPoints: 100, cookedPoints: 150 },
    deer: { name: 'hjortekød', plural: 'hjortekød', emoji: '🦌', shotPoints: 40, cookedPoints: 90 },
    boar: { name: 'vildsvin', plural: 'vildsvin', emoji: '🐗', shotPoints: 25, cookedPoints: 60 },
    ibex: { name: 'stenbuk', plural: 'stenbukke', emoji: '🐐', shotPoints: 20, cookedPoints: 50 },
    // Ingredienser til gryden (kan ikke steges alene)
    mushroom: { name: 'svamp', plural: 'svampe', emoji: '🍄', ingredient: true },
    berry: { name: 'bær', plural: 'bær', emoji: '🫐', ingredient: true },
  },

  // Dyr der ikke er mad
  animals: {
    fox: { name: 'ræv', shotPoints: 15 },
  },

  // --- Ræven (stjæler fra bunken ved bålet) ---
  fox: {
    minTime: 90,           // Sekunder mellem ræve
    maxTime: 200,
    speed: 7,
  },

  // --- Point ---
  points: {
    spiceBonus: 10,        // Ekstra point for stegt mad med krydderier
    burnt: 1,              // Point for noget der er brændt på
  },

  // --- Gem ---
  save: {
    autosaveSeconds: 10,   // Spillet gemmer sig selv så tit
  },
};
