# Andejagt

Et 3D-browserspil til et barn på 8–10 år. Personlige oplysninger og hvordan spillet lægges online, står i `CLAUDE.local.md`, som ikke kommer med online.
- Man går rundt i førsteperson (eller tredjeperson med **V**) og jager ænder ved lejren.
- Man kan køre i bil til tre andre steder:
  - **Storskoven** med fasaner, harer, gæs, hjorte, vildsvin og bjørne
  - **Fjeldet** med sne, stenbukke og ørne
  - **Havet** med mole, fiskekutter og kæmpefisk
- Der er årstider, sult, opskrifter, medaljer og flere spillere på samme computer.
- Vildtet steges over bålet.
- For pointene kan man købe udstyr, hunde, opgraderinger til madlavning, ting til lejren, bil og pynt i en butik med faner.

## Arbejdsform

- Barnet kommer løbende med idéer. De skrives i `IDEER.md` og flyttes til "Færdigt", når de er lavet.
- Al tekst i spillet skal være på **dansk** og let at læse for en 8–10-årig: korte sætninger og gerne emojis.
- Kommentarer i koden er på dansk, så barnet kan følge med.
- Tal, som det giver mening at skrue på (hastighed, antal, tider, priser, point), skal ligge i `src/config.js` og ikke være hardcodet.
- Grafikken er blokket i Minecraft-stil:
  - Kasser laves med `box(w, h, d, farve, x, y, z, mønster)` fra `src/models.js`. Mønstrene ligger i `src/textures.js`: `grain`, `planks`, `bark`, `leaves`, `stone` og `birch`.
  - Skilte laves med `textSign()`.
  - Ting der skal gløde, bruger `glow()`.
  - Mange ting der står stille, samles med `createBatch()`.
  - Brug ingen eksterne billed- eller lydfiler. Lyd laves med WebAudio i `src/sound.js`.
- Commit efter hver ændring, der virker, så man kan gå tilbage.

## Kør spillet

Der er intet byggetrin. Three.js og dets tilføjelser (`three/addons/`) hentes fra CDN via import map i `index.html`.

```bash
python3 serve.py 8123
```

Åbn derefter http://localhost:8123, eller dobbeltklik på `Start spillet.command`. `serve.py` sender `Cache-Control: no-store`, så browseren aldrig blander gamle og nye filer. Brug den i stedet for `python3 -m http.server`. `.claude/launch.json` har konfigurationen `andejagt` på port 8124, så den ikke kolliderer med familiens egen server på 8123. Bemærk at hver port har sit eget gemte spil.

## Læg spillet online

Kør altid dette før en commit, der skal online. Det giver hver fil et versionsnummer i import-kortet i `index.html`, så browseren henter den nye udgave:

```bash
python3 tools/version.py
```

`index.html` indlæser `main.js` via `import './src/main.js'`, så også startfilen går gennem import-kortet. Detaljer om hvor spillet ligger online står i `CLAUDE.local.md`.

## Test

- `window.game` er tilgængelig i konsollen.
- Musen kan ikke låses i Claude-browserpanelet. Brug derfor `game.screens.playWithoutMouseLock()` for at komme forbi start- og pausemenuen. Når man lukker en menu med `closeMenu(true)`, fejler låsningen bagefter og viser pausemenuen igen, så kald `playWithoutMouseLock()` efter et kort øjeblik.
- Når panelet er skjult, kører `requestAnimationFrame` ikke. Kør så tiden frem manuelt ved at kalde `update(dt)` på alle `game.systems`, og tegn med `game.render()`.
- Tidspunktet på dagen sættes med `game.saveables.dayNight.load({ time, day })`.
- Tjek for syntaksfejl i alle filer:

  ```bash
  for f in src/*.js; do node --check --input-type=module < "$f"; done
  ```

## Opbygning

- `src/main.js` opretter renderer, glød (bloom via EffectComposer, `game.render()`) og alle systemer, indlæser det gemte spil og kører spil-løkken.
  - Systemerne opdateres kun, når både `game.paused` og `game.sleeping` er falske.
  - En fejl i ét system logges én gang. Systemet markeres med `failed`, og resten af spillet kører videre.
- `src/game.js` indeholder det fælles `game`-objekt. Det har:
  - `scene`, `camera` og `state`. `state` har `bag` (råt vildt pr. type), `cooked`, `burnt`, `points` (som også er penge) og `trophies`.
  - `addToBag`, `takeFromBag`, `bagCount` og `foodName`
  - `targets`: alt der kan skydes. Hver har `findHits(ray, range, radius)` og `hit(target, gunId)`.
  - `pickups`: alt der kan samles op af hundene. Hver har `grounded()` og `take(item)`, og hvert item har `mesh` og `type`.
  - `colliders`: runde `{x,z,r}` eller firkantede `{minX,maxX,minZ,maxZ}`, som skubbes ud via `game.pushOut(pos, radius)`
  - events (`on`/`emit`) og `remember()` til at gemme ting
- `src/areas.js` deler verden i områder:
  - `home` (lejren, omkring 0,0)
  - `forest` (Storskoven)
  - `mountain` (Fjeldet, med et stort bjerg via `peak`)
  - `sea` (Havet, med vand af typen `sea` syd for kysten og en `pier`)
  - `moor` (Mosen, med små søer, der er markeret `mud`)

  Alle ligger i samme scene, men langt fra hinanden, så tågen skjuler de andre områder. Den giver:
  - `game.groundHeight`: bakker, der er flade ved bygninger, vand og veje. Den regner med is om vinteren og molen.
  - `isInWater`/`isInLake` (frossen vand tæller ikke), `isDeepWater` (havet, som man ikke kan gå ud i), `isOnIce` og `waterDistance`
  - `areaAt`, `game.area` (spillerens område), `distanceToRoad` og `clampToArea`
  - `game.frozen`, som sættes af `seasons`
- Hvert system er en fabrik `createX(game)`, der returnerer et objekt med `update(dt)`, og registreres med `game.add('navn', ...)`. Systemer kan bruge hinanden via `game.navn`.
- Rækkefølgen i `main.js` betyder noget:
  - `dayNight`, `shop` og `player` skal oprettes før de systemer, der bruger dem, når de oprettes.
  - `trophies` skal komme efter `shelter`.
  - `hud` opdateres altid sidst.
- Systemerne er:
  - `world`: bygger begge områder (jord med bakker, vand der bølger, grusvej, træer, buske, sten, græs og blomster) og skyer. Den eksporterer `sun`, `hemi` og `sunDirection`.
  - `dayNight`: tid på døgnet, himmelkugle med sol (shader), stjerner og måne, `isNight`, `light`, `skipToMorning()` og `skyUniforms`
  - `seasons`: årstiden ud fra dagen (`config.seasons.daysPerSeason`). Den farver blade (`materialsWithPattern('leaves')`) og jord, skjuler græs og blomster og fryser sø og å.
  - `ambience`: fugle, fårekyllinger, vand, vind og fodtrin. `sound.setLoop()` og `sound.startMusic()` står for musik og lyde i baggrunden.
  - `hunger`: mæthed (`state.hunger`), spis med F, og `speedFactor`, der gør én langsommere, når man er sulten
  - `stats`: tal og medaljer (`MEDALS` i filen). Siden vises fra pausemenuen.
  - `tips`: små opgaver for nye spillere
  - `photo`: fotomode (P)
  - `tracks`: spor på jorden
  - `fox`: ræven i lejren
  - `pot`: gryden med opskrifter (`config.recipes`). Retterne ligger i `state.dishes`.
  - `forage`: bærbuske (lejren) og svampe (Storskoven)
  - `sea`: mole og fiskekutter
  - `xp`: jægerniveau (`level`, `title`). Butiksvarer kan have `minLevel`.
  - `economy`: fanen "Marked" i butikken med sparegris og salg af råt vildt (`shop.addTab`)
  - `treasure`: skatte, der graves op med metaldetektoren (våben 6)
  - `traps`: fælder (T)
  - `nightVision`: natkikkert (N)
  - `farm`: hønsehus, køkkenhave, bistade og andedam
  - `decor`: gynge, hængekøje og lyskæder (pynt)
  - `cold`: varme og kulde (`state.warmth`) og varm jakke
  - `rides`: hest, ATV og snescooter. De kaldes med J, og bruger `showRider` på køretøjet.
  - `boats`: kano og speedbåd
  - `pets`: ugle, falk (Y) og hvalp
  - `moor`: Mosen med frøer, hejrer og myg. `moor.blocks()` bruges, så man ikke kan gå i mudderet uden gummistøvler.
  - `cave`: grotten på Fjeldet (`game.inCave` gør det mørkt)
  - `lighthouse`: fyrtårnet ved Havet
  - `weather`: regnbyger. Kører efter `dayNight` og gør himlen grå. `isRaining`.
  - `life`: ildfluer og sommerfugle
  - `shop`: bod og butiksvindue
  - `player`: figur, bevægelse og kamera.
    - Har `boost()`, `setHat()`, `setVestColor()` og `addYaw()`.
    - `setVehicle(v)` sætter spilleren i et "køretøj": båden og jagttårnet bruger `{ speed, seatHeight, constrain(pos) }`, og bilen bruger `{ drive(dt), cameraDistance }`.
  - `ducks`: flyver, rammes, falder og samles op. Om natten flyver de væk. `ducks.mods` styrer flyvningen (fløjte, lokkeænder, skjul). Der er en lille chance for den gyldne and.
  - `wildlife`: alle vilde dyr pr. område (`POPULATION` i filen): fasan, hare, gås, hjort, vildsvin, stenbuk, ørn og måge. Ørne og måger er fredede. Dyr opdateres kun i spillerens område.
  - `bear`: bjørnen i Storskoven. Kun `bigRifle` gør skade. Den vælter spilleren, som så mister indholdet af tasken.
  - `tower`: jagttårnet. `isOnTop` gør, at dyrene ikke bliver bange.
  - `ranger`: skovfogeden med opgaver (`MISSIONS` i filen)
  - `map`: kort (M) og kompas
  - `weapon`: gevær, haglgevær, riffel (3) og fiskestang (4), magasin og patroner (R), kikkert (højreklik eller Z), `zoom` og `current`
  - `gear`: andefløjte (Q), lokkeænder og lommelygte (L)
  - `fishing`: kast, vent på bid og klik
  - `campfire`: grillspyd for alle slags vildt (`slot.type`), hurtigere stegning, alarm, tag mod regn og en bunke (`pile`) fra hundene
  - `smokehouse`: røgeri, der selv tager fra bunken
  - `shelter`: hytte, seng, lampe, kiste, ekstra værelse og hundekurv. Om morgenen bliver halvdelen af den stegte mad dårlig, hvis man ikke har en kiste.
  - `trophies`: trofævæg i shelteret
  - `dogs`: Bobby og Molly. De følger, henter og afleverer: ved bålet i lejren og direkte i tasken i Storskoven. De sover i kurven. Uden trailer bliver de i lejren.
  - `camp`: jagtskjul, båd og flagstang
  - `car`: bil, benzin, trailer, horn (H), radio (R), lak (pynt) og firehjulstræk. Ved enden af vejen åbner en rejsemenu (`DESTINATIONS`).
  - `wardrobe`: hatte og vestefarver
  - `score`: point ud fra events. Har `cookedPoints(type)`.
  - `save`: gemmer i localStorage og omdanner ældre gem (fx `rawDucks` til `bag.duck`)
  - `hud`: tekst oven på spillet og `fade()`
- `src/catalog.js` har `makeCarcass(type)`, som er figurer af vildt, der ligger stille. Typerne og deres point står i `config.foods`.
- `src/screens.js` (ikke et system) styrer startskærm, pausemenu (Esc), indstillinger, fuld skærm og pointer lock.
  - Menuer som butikken åbnes med `game.screens.openMenu(el)` og lukkes med E eller Esc.
  - `addPauseButton`, `addStartButton` og `showPage(heading, text, fill, back)` bruges til ekstra sider.
- `src/settings.js` gemmer lyd, musik og grafik (`høj`/`lav`) pr. computer i `andejagt-indstillinger`.
- Tasten E: brug `input.consume('KeyE')`, så kun den første ting (efter rækkefølgen i `main.js`) reagerer. At klappe hunde kører sidst.
- Gem: hver spiller har sit eget gem. Listen ligger i `andejagt-spillere`, den aktive i `andejagt-aktiv`. Den første spiller bruger den gamle nøgle `andejagt-gem-v1`.
- Butikken: hvert system tilføjer selv sine varer med `game.shop.addItem(...)`. Se kommentaren ved `addItem` i `shop.js`. Der er tre slags varer:
  - **Opgraderinger** har `basePrice` og `levels`. Prisen ganges med et tal fra `config.shop.priceSteps` (1, 2, 6, 15 ...), så de sidste niveauer er meget dyre.
  - **Forbrugsvarer** har `consumable: true` og kan købes igen og igen.
  - **Pynt** har `cosmetic: true`. Det kan tages på og af, og `group` gør, at man kun kan have én hat ad gangen.
- Alle varer har en `category`, som er butikkens faner: `udstyr`, `hund`, `mad`, `lejr`, `skov` og `pynt`. `requires()` låser en vare med en tekst. `game.shop.has(id)` og `game.shop.level(id)` bruges i resten af koden.
- Når et gemt spil indlæses, kaldes `onBuy` igen for hvert købt niveau med `loading: true`. Varerne genskabes i den rækkefølge, de blev tilføjet, så noget der bygger videre på en anden vare (fx lampen på shelteret), skal tilføjes efter den. En fejl i én vare stopper ikke resten.
- Gem: et system der har noget at huske, kalder `game.remember('navn', { save(), load(data) })`. Spillet gemmer automatisk hvert 10. sekund, ved køb, om morgenen, når man pauser, og når siden lukkes. Ændres formatet, skal `load` kunne læse det gamle format, så ingen mister noget.
- Events, der bruges nu:
  - `shot`
  - `animalHit` `{ type, golden }`
  - `pickedUp` `{ type }`
  - `foodOnFire`, `foodCooked` og `foodBurnt` `{ type }`
  - `fishCaught` `{ weight }`
  - `traveled` `{ to }`
  - `missionDone`
  - `dishMade`, `ate`, `petted` og `shopOpened`
  - `levelUp`, `treasureFound` og `frogCaught`
  - `season` `{ id }`
  - `cameraMode`, `message`, `bought`, `sold`, `nightfall`, `morning`, `rainStart` og `rainStop`

  Nye features bør hellere lytte på events end ændre i eksisterende systemer.
- Retninger:
  - Figuren kigger mod −Z. Ænder, hunde, bjørn og dyr kigger mod +Z.
  - `yaw = atan2(-dx, -dz)` får spilleren til at kigge i retning (dx, dz).
  - Nord er −Z.
  - Bilen kører i retning `(sin heading, cos heading)`.

## Ny feature, typisk fremgangsmåde

1. Læg nye tal og priser i `config.js`.
2. Lav en ny fil `src/<ting>.js` med `createTing(game)`. Kan den købes, tilføjes den med `game.shop.addItem`, og har den noget at gemme, bruges `game.remember`. Nye dyr registreres i `game.targets` og `game.pickups`.
3. Tilføj `game.add('ting', createTing(game))` i `main.js`.
4. Reager på eksisterende events, eller udsend nye.
5. Kør syntakstjekket, test i browseren, opdater `IDEER.md`, og commit.
