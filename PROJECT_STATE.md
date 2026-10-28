# PROJECT_STATE – Tafel Rush

> Overdrachtsdocument voor een volgend (Claude-)contextvenster. Houd dit bij bij iedere wijziging.
> Laatste update: 2026-10-28 — v1.4.0: accounts (Supabase, gebruikersnaam + wachtwoord): schema tafelrush (supabase/tafelrush_schema.sql, door gebruiker uitgevoerd), Edge Function tafelrush-signup, AccountService + syncLogic + AccountPanel, knop INLOGGEN rechtsboven (L). Staat UIT tot CONFIG.accounts.url/anonKey zijn ingevuld.
> (v1.3.0: anonieme teller GoatCounter (meesterdanny.goatcounter.com, geen cookies): paginabezoek + events tafelrush/geopend/{website|app|rechtstreeks}, run-gestart/{modus}, boss-verslagen/{wereld}, run-gestopt, wereld-vrijgespeeld/{id}, voortgang-opgehaald (`js/systems/Analytics.js`, niet op localhost).
> (v1.2.0: Esc heeft geen game-functie meer (beter in iframe, geen krimpend scherm). P = pauze/verder, T = TERUG/stoppen (T was nog vrij); pauzescherm met knoppen VERDER/STOPPEN; elk scherm een klikbare < TERUG (T); knop PAUZE (P) rechtsboven onder de geluidsknoppen (alle apparaten); focus-pauze heeft dezelfde knoppen; Keyboard Lock verwijderd.
> (v1.1.2: plak-/kopieervenster met echte HTML-knoppen (iOS gaf geen "Plakken"), `js/ui/ClipboardPanel.js`.)
> (v1.1.1: iPhone: QR geopend in Safari → knop KOPIEER VOOR DE APP (beginscherm-app heeft eigen opslag) + tip in de lege app.)
> (v1.1.0: VOORTGANG meenemen met QR-code of code (zonder account/database).)
> (v1.0.0: telefoon/tablet-geschikt + web-app (beginscherm, offline, altijd dwars); pc-versie ongewijzigd.)
> (v0.9.1: knop VOLLEDIG SCHERM rechtsboven (en toets F); geluidsknoppen iets naar links.)
> (v0.9.0: UITLEG-scherm (H) met 7 hoofdstukken + korte tips op het juiste moment.)
> (v0.8.0: wereld-exclusieve pets (15, 5 per wereld) + wereldkisten (alleen via de boss van die wereld) + petboek met pagina's.)
> (v0.7.0: derde wereld STORMRIJK, vrijgespeeld na De IJsreus.)
> (v0.6.0: tweede wereld Frostpeak.)
> (v0.5.0: pets als verzamelobjecten uit kisten + petboek.)
> (v0.4.1: tafelkaart met dag-progressie + pet/vuur-fix. v0.4.0: tafelkaart + pets.)
> (v0.3.0: wapens per held, power-ups en UITRUSTING-scherm.)
> (v0.2.0: 3 speelbare characters + enemy-HP/damage-systeem.)
> (v0.1.0 op 2026-10-07: eerste vertical slice.)

## Huidige status

**Speelbaar en getest in Chromium.** Drie werelden (Greenwood, Frostpeak, Stormrijk) met elk 4 fases + boss, volledige adaptieve tafeltrainer, lokale opslag, titelscherm, tutorial, resultaatscherm, audio, touch-ondersteuning en iframe-geschiktheid.

- 74/74 unit-tests slagen (`node tests/run-tests.js`), o.a. HP 1/2/3, geen dubbele hits, spawn-balans, profielmigraties v1→v6, werelden compleet + vrijspelen, character-unlocks, wapens/perks/boss-immuniteit/power-ups, pets + kisten (kansen, snoepjes, verdienen), tafelkaart.
- Geen console-errors tijdens volledige runs (titel → run → 4 fases → boss → resultaten → nog een run).
- Gemeten (Chromium, built-in browser): antwoord verwerken ≈ 0,4 ms; **Enter → nieuwe som zichtbaar ≈ 13 ms** (binnen één frame); rekenwerk ≈ 1 ms per frame.

## Wat er gebouwd is

| Onderdeel | Status | Bestanden |
|---|---|---|
| PixelArt-pipeline (eigen generator, PNG-encoder, palet) | ✅ | `tools/lib/*`, `tools/art/*`, `tools/build-assets.js` |
| Gedeelde character-rig (zelfde frame 48×56, voetpunt, animaties idle 4 / run 8 / sprint 8 / attack 6 / hit 4 / victory 6, zelfde fps) | ✅ | `tools/art/rig.js` |
| Kai (hero01, zwaard), Mila (ranger01, boog + pijlen), Nova (tech01, arm-kanon + plasma) | ✅ | `tools/art/hero.js`, `ranger.js`, `tech.js` → `assets/characters/*` |
| Characterkeuze (compacte selector links op het startscherm, ↑/↓ of klik) | ✅ | `js/ui/CharacterSelector.js`, `TitleScene` |
| CharacterRegistry + unlock-regels (free/coins/achievement/progress) | ✅ | `js/systems/CharacterRegistry.js`, `js/data/characters.js` |
| Enemy-HP 1-3 + boss-HP 18 via één Health-systeem; HP-pips; multi-hit | ✅ | `js/systems/Health.js`, `js/data/enemies.js`, `Enemy.js`, `Boss.js` |
| DamageSystem met upgrade-hooks (modifiers); PERFECT = visuele CRITICAL | ✅ | `js/systems/DamageSystem.js`, `Player.getAttackDamage` |
| SpawnDirector: HP-klassen over de run (`CONFIG.spawn.hpCurve`) | ✅ | `js/systems/SpawnDirector.js` |
| Nieuwe vijand Schildkever (3 HP, gepantserd) + projectiel-effecten pijl/plasma | ✅ | `tools/art/enemies.js`, `tools/art/effects.js` |
| Wapens: 4 tiers per held (800 / 2.000 / 5.000), zichtbaar op de held + eigen aanvalskleur; perks PERFECT ×2 en +1 (niet op de boss) | ✅ | `js/data/weapons.js`, `js/systems/Equipment.js`, `tools/art/*` (`*_WEAPON_STYLES`) |
| Power-ups: COINBONUS (1.200), COMBOSCHILD (2.500), DOORBOORDER (3.500) | ✅ | `js/data/weapons.js`, `RunScene` (tryPierce, onWrong, finishRun) |
| UITRUSTING-scherm met tabs WAPENS / POWER-UPS (preview met aanvalsdemo + gekozen pet, kopen met bevestiging) | ✅ | `js/scenes/EquipmentScene.js`, knop in `CharacterSelector` |
| 10 pets in 4 zeldzaamheden (gewoon → legendarisch steeds groter/spectaculairder: framemaat, frames, gloed/spoor/juich-effect) – volgen de held, geen gameplay-effect | ✅ | `tools/art/pets.js`, `js/data/pets.js`, `js/entities/Pet.js`, `js/entities/PetFx.js` |
| Kisten: houten (400 coins), tafelkist (10 kaart-stapjes + boss), gouden kist (5× nieuw goud + hele tafel goud); kansen zichtbaar; dubbel = snoepjes; pet lokken met snoepjes | ✅ | `js/data/chests.js`, `js/systems/Chests.js`, `tools/art/chests.js` |
| PETBOEK-scherm (B): verzameling met teaser achter slotje, NIEUW!-badge, kisten openen met show, melding op resultaatscherm, teller op het startscherm | ✅ | `js/scenes/PetboekScene.js`, `ResultsScene.drawLoot`, `TitleScene` |
| Tafelkaart: 10×10 overzicht met **dag-progressie** (Leitner: max. 1 stap per dag, goud ≥ 4 dagen, traag max. groen, fout −1, dof goud na 14 dagen), details + "nog X dagen tot goud", voortgang per tafel, Enter = tafel trainen, melding op resultaatscherm | ✅ | `js/scenes/TafelkaartScene.js`, `js/training/MasteryMap.js`, `AdaptiveTrainer` (roept `applyMapAnswer` aan) |
| 8 vijandtypes + schatkist (move/attack/hurt) | ✅ | `tools/art/enemies.js` |
| Boss De Woudwachter (idle/attack/hurt/death, kalm + boos) | ✅ | `tools/art/boss.js` |
| Effecten: munt, 4 slash-varianten, sparks, poof, stof, glinster, vlammen | ✅ | `tools/art/effects.js` |
| Wereld: 4 biomen × 5 parallax-lagen + grondtegels met bruggen/beekjes + 25 props | ✅ | `tools/art/world.js`, `js/world/World.js` |
| **Frostpeak** (wereld 2): bevroren meer, ijsgrotten, bergpas met sneeuwstorm, top met live noorderlicht; 15 props (sneeuwpop, iglo, ijskristallen …); 6 vijanden (sneeuwslijm, ijsvleer, ijsslijm, pinguïn, yeti-jong, ijsklomp); boss De IJsreus; eigen muziek | ✅ | `tools/art/frostpeak.js`, `frost_enemies.js`, `boss.js` (`BOSS_STYLES.frost`), `js/data/worlds.js`, `AudioManager` (`frost`, `frostBoss`) |
| **Stormrijk** (wereld 3): verdorde vlakte, bliksemwoud, stormtorens, oog van de storm (kolkende draaikolk); 13 props; 6 nieuw getekende vijanden (stroomslak, vonkje, stormkraai, donderpad, onweerswolkje, stormkreeft); boss De Donderdraak (eigen tekening) met bliksemstraal-aanval; live regen/vonken/bliksem (zacht, niet flitsend); donkere muziek + donder | ✅ | `tools/art/stormrijk.js`, `storm_enemies.js`, `dragon.js`, `js/data/worlds.js`, `js/entities/Boss.js` (`attack: 'breath'`), `js/world/World.js` (`lightning`, `makeStrike`) |
| **Wereld-exclusieve pets** (v0.8.0): 15 pets, 5 per wereld (2 gewoon, zeldzaam, episch, legendarisch; zeldzamer = groter/spectaculairder), alleen uit de Boskist / Sneeuwkist / Stormkist die je krijgt door de boss van die wereld te verslaan (keuze gebruiker); lokken pas na die boss; petboek met pagina's per wereld + tab WERELDKISTEN | ✅ | `tools/art/world_pets.js`, `tools/art/chests.js`, `js/data/pets.js`, `js/data/chests.js`, `js/systems/Chests.js`, `js/scenes/PetboekScene.js` |
| **Uitleg** (v0.9.0): scherm UITLEG (H / knop op het startscherm / ?-knopjes) met 7 hoofdstukken en plaatjes; **tips** op het juiste moment (één keer per onderwerp, nooit tijdens het rekenen, max. 1 per scherm) | ✅ | `js/data/help.js`, `js/scenes/UitlegScene.js`, `js/systems/Tips.js`, `Game.openHelp` |
| **Telefoon/tablet + web-app** (v1.0.0): automatische touch-stand op touchapparaten (grote cijferbalk, pauze- en stopknop), "draai je telefoon" rechtop (run pauzeert), manifest + iconen + service worker (offline), blijvende opslag, iOS-geluid/zoom; pc/laptop ongewijzigd (keuze gebruiker: beide moeten werken, altijd dwars) | ✅ | `index.html`, `css/style.css`, `manifest.webmanifest`, `sw.js`, `js/main.js` (`setupWebApp`), `Input.isTouchDevice`, `RunScene` (cijferbalk/pauze), `tools/art/appicon.js` |
| Volledig scherm (v0.9.1): knop rechtsboven op het startscherm en in de run (geluid + muziek ernaast, iets naar links), toets F overal; lukt het niet (iframe zonder allow="fullscreen", sommige ingebouwde browsers) dan een korte melding "PROBEER F11" | ✅ | `Game.toggleFullscreen`, `Game.drawFullscreenButton`, iconen `fullscreen` / `fullscreen_exit` in `tools/art/ui.js` |
| Wereldkeuze (W / pijltjes) met teaser voor vergrendelde wereld; vrijspelen na De Woudwachter met grote melding op het resultaatscherm | ✅ | `js/systems/Worlds.js`, `TitleScene.drawWorldPicker`, `ResultsScene.drawUnlock` |
| UI: 9-slice panelen/knoppen, 17 iconen, eigen bitmap-fonts (5×7, Scale2x, 9×13 cijfers) | ✅ | `tools/art/ui.js`, `js/ui/*` |
| Adaptieve trainer (mastery per som, reactietijd, omgekeerde som) | ✅ | `js/training/AdaptiveTrainer.js` |
| Opgavenselectie (spacing, patroonvermijding, succesmomenten) | ✅ | `js/training/QuestionEngine.js` |
| Modi: Training, Mix, Powertraining, Mijn moeilijke sommen | ✅ | `js/scenes/TitleScene.js` |
| Combo-systeem (5/10/20/30 + mijlpalen) | ✅ | `js/systems/ComboSystem.js` |
| Voortgang/fases/boss-trigger | ✅ | `js/systems/Progression.js` |
| Bossfight (18 HP, crits visueel, tegenaanval met schokgolf, overwinning) | ✅ | `js/entities/Boss.js`, `js/scenes/RunScene.js` |
| Resultaatscherm (stats, records, 5 oefensommen) | ✅ | `js/scenes/ResultsScene.js` |
| Opslaglaag (ProfileService + adapters + schema/migraties) | ✅ | `js/storage/*` |
| Coins + records + totale statistieken + run-geschiedenis | ✅ | `js/storage/ProfileService.js` |
| Unlock-datamodel (nog geen shop-UI) | ✅ | `js/data/catalog.js`, `profileSchema.js` |
| Audio: 21 chiptune-SFX (incl. boog, plasma, pantser) + adaptieve muziek (run/boss/menu), mute | ✅ | `js/audio/AudioManager.js` |
| Toetsenbord (cijfers, numpad, Backspace, Enter; shortcuts onderdrukt) | ✅ | `js/core/Input.js` |
| Touch-cijferbalk + vangnet voor schermtoetsenborden | ✅ | `RunScene.drawKeypad`, `#kbd` in `index.html` |
| Pauze bij focusverlies (iframe) — telt niet mee in reactietijd | ✅ | `RunScene.onBlur/resume` |
| Automatische kwaliteitsverlaging (particles/props) | ✅ | `Game.trackPerformance` |
| Debug-overlay `?debug` | ✅ | `Game.drawDebug` |

## Architectuurkeuzes

- **Geen libraries, geen build-stap.** Vanilla ES-modules + Canvas 2D. Reden: kleinste download, werkt direct op GitHub Pages, geen onderhoud aan dependencies. Een engine (Phaser e.d.) zou voor deze schaal weinig toevoegen.
- **Pixel-canvas 480×270** → integer opgeschaald naar een display-canvas → CSS-letterbox. Scherp op ieder scherm en in iframes.
- **Assets als code** (`tools/art`): consistente 16-bit stijl, één palet, reproduceerbaar. De game leest alleen `atlas.json` + PNG's; sprites kunnen 1-op-1 vervangen worden door handgemaakte versies.
- **Input wordt synchroon in `keydown` verwerkt**; de volgende som wordt direct gekozen. Geen enkele animatie blokkeert de som. Na een fout is de som 1000 ms "op slot" zodat het juiste antwoord goed leesbaar is (`CONFIG.answer.wrongFeedbackMs`).
- **Didactiek is puur JS** (`js/training`), zonder DOM of opslag → testbaar in Node.
- **Opslag via één centrale laag**: `Game → ProfileService → StorageAdapter → localStorage`. Async adapter-contract, versieerbaar profiel met migraties. Zie README "Opslag, accounts en cloud".
- **Voortgang = tijd + goede antwoorden**: houdt runs rond 3-5 min; snelle rekenaars maken meer sommen in dezelfde tijd (powertraining).
- **De speler stopt vóór een vijand** als er niet geantwoord wordt (gevechtshouding). Snel antwoorden = vijanden op afstand verslaan = continu doorrennen. Zo stuurt het rekenen letterlijk de snelheid.
- **Content als data**: `js/data/worlds.js` (biomen, props, vijand-gewichten), `enemies.js` (EnemyConfig: HP, sprites), `characters.js`, `catalog.js`. Tuning in `js/config.js` (`combat`, `spawn`).
- **Characters zijn cosmetisch.** Zelfde damage, snelheid, coins, mastery en animatie-timing; alleen sprite, aanvalseffect en kleuren verschillen. Nergens `if (character === …)` in de game-code: `Player`, `EnemyManager.launchAttack` en de selector werken met de character-data.
- **Twee lagen HP**: `hp` (logisch, direct bij het antwoord) en `shownHp` (visueel, bij de inslag). Daardoor geen dubbele hits bij spam, snelle antwoorden mikken automatisch op de volgende vijand, en geen animatie blokkeert de volgende som.
- **Eén damage-pad** voor vijanden én boss: `damage = player.getAttackDamage(tier)` → `target.takeDamage(damage)` → projectiel → `RunScene.onImpact` → `target.showHit(result)`.
- **Boss-damage voorspelbaar gemaakt**: voorheen afhankelijk van snelheid/combo (5-9 per hit, HP 100); nu 1 per goed antwoord, HP 18. Gevecht = 18 goede antwoorden voor iedereen.
- **Profielversie 2**: `selectedCharacter` + `unlocks.characters`. Migratie v1→v2 zet `kai` om naar `hero01` en behoudt alle voortgang (getest).
- **Profielversie 3**: `unlocks.weapons`, `unlocks.equippedWeapons`, `unlocks.powerups`. Aankopen worden direct opgeslagen (flush).
- **Upgrades zonder minder oefening**: de runlengte hangt niet af van damage, en de boss is immuun voor wapen-perks → het bossgevecht blijft 18 goede antwoorden. Perk "PERFECT ×2" beloont juist snel (geautomatiseerd) rekenen.
- **Wapens per held, maar gelijk sterk**: iedere held heeft dezelfde 4 tiers met dezelfde prijzen/perks, alleen het uiterlijk verschilt.
- **Kopen vraagt bevestiging** (tweede Enter/klik), tegen per ongeluk uitgeven.
- **Twee soorten "beheersing"**: de snelle interne mastery (voor de sommenkeuze, reageert binnen een run) en het langzame tafelkaart-niveau (onthouden over dagen). Zo blijft de oefening adaptief, maar is goud op de kaart echt verdiend.
- **Pets uit kisten, niet uit de shop**: kisten koppelen verzamelen aan oefenen (tafelkaart-stapjes, nieuw goud, boss); alleen de houten kist is te koop. Kansen staan in beeld, nooit echt geld, en dubbele pets geven snoepjes om zelf een pet te lokken (geen eindeloos geluk-zoeken). Gouden kist = verhoogde kans op legendarisch, geen garantie (keuze gebruiker).
- **Werelden zijn beloning, geen moeilijkheid**: zelfde tafels, run-lengte, boss-HP en coins. Fases staan per wereld in `WORLDS[id].phases`; Greenwood gebruikt nog `CONFIG.run.phases`.
- **Profielversie 6**: `worlds = { unlocked, bosses }`; Frostpeak open na één overwinning op De Woudwachter (keuze gebruiker). Migratie v5→v6 geeft hem meteen aan wie al won.
- **Game-loop robuuster**: een fout in één frame zet de game niet meer stil (volgende frame wordt eerst aangevraagd, fout één keer gelogd).
- **Profielversie 5**: `collection` (kisten, snoepjes, voortgang). Migratie v4→v5: gekochte pets blijven + één houten kist.
- **Profielversie 4**: `mastery[key].map`. Migratie v3→v4 geeft bestaande voortgang hooguit oranje (geen gratis goud).

## Belangrijkste bestanden

1. `js/scenes/RunScene.js` – de kern-loop: antwoorden → acties, fases, boss, einde.
2. `js/training/QuestionEngine.js` + `AdaptiveTrainer.js` – welke som, en hoe goed beheerst.
3. `js/config.js` – alle balans-knoppen.
4. `js/storage/ProfileService.js` + `profileSchema.js` – alle persoonlijke data.
5. `tools/build-assets.js` + `tools/art/*` – alle graphics.
6. `js/core/Game.js` – scenes, loop, performance, focus/visibility.
7. `js/systems/Health.js`, `DamageSystem.js`, `SpawnDirector.js`, `CharacterRegistry.js` – HP/damage, spawn-balans, characters.
8. `tools/art/rig.js` – gedeelde character-rig (schaal/ground/timing voor alle characters).

## Gewijzigde/nieuwe bestanden in v0.9.0

- **Nieuw**: `js/data/help.js`, `js/scenes/UitlegScene.js`, `js/systems/Tips.js`.
- **Aangepast**: `js/core/Game.js` (`tips`, `openHelp`, tips boven de scene), `js/core/Input.js` (H), `js/ui/UI.js` (`helpButton`), `js/scenes/TitleScene.js` (knop "? UITLEG (H)", tips), `ResultsScene.js` (tips na de beloningen), `PetboekScene.js` / `TafelkaartScene.js` / `EquipmentScene.js` (?-knopje + H), `js/storage/profileSchema.js` (`settings.tipsSeen`), `tests/run-tests.js`, `README.md`.

## Gewijzigde/nieuwe bestanden in v0.8.0

- **Nieuw**: `tools/art/world_pets.js`; assets `pets/pet_{squirrel,hedgehog,hummingbird,deer,butterfly,bunny,polarbear,reindeer,narwhal,mammoth,gecko,anglerfish,bee,griffin,phoenix}.png`, `ui/chest_{bos,sneeuw,storm}.png`; `docs/concepts/` (concepten van de gebruiker).
- **Aangepast**: `tools/art/pets.js` (wereld-pets ingevoegd), `tools/art/chests.js` (3 wereldkisten), `js/data/pets.js`, `js/data/chests.js`, `js/systems/Chests.js` (wereldkist bij boss, `rollPet` per wereld, `canLure`), `js/scenes/PetboekScene.js` (pagina's, tab WERELDKISTEN, teasers, onthulling van grote pets lager), `js/scenes/RunScene.js` + `ResultsScene.js` (wereldkist als beloning), `js/storage/profileSchema.js` (kisttellers), `tests/run-tests.js`, `README.md`.
- **Gedrag veranderd**: een verslagen boss geeft nu de wereldkist van die wereld in plaats van een tafelkist. Tafelkisten komen alleen nog van stapjes op de tafelkaart.

## Gewijzigde/nieuwe bestanden in v0.7.0

- **Nieuw**: `tools/art/stormrijk.js`, `tools/art/storm_enemies.js`, `tools/art/dragon.js`, `tools/preview/preview-stormrijk.js`, `preview-storm-enemies.js`, `preview-dragon.js`; assets `world/stormrijk/*`, `enemies/{storm_snail,vonkje,storm_crow,thunder_toad,storm_cloud,storm_crab,boss_thunderdragon}.png`.
- **Aangepast**: `tools/build-assets.js` (Stormrijk; stopt nu bij dubbele sheet-namen – de vijand "spark" botste met het effect "spark" en heet nu "vonkje"), `js/data/worlds.js` (Stormrijk, wereldkleur), `js/data/enemies.js` (6 vijanden, De Donderdraak met `attack`/`mouth`/`beam`), `js/entities/Boss.js` (bliksemstraal), `js/world/World.js` (regen, vonken, statisch, bliksem + flits, `onThunder`), `js/core/Game.js` (donder-geluid), `js/audio/AudioManager.js` (`thunder`, `zapBig`, muziek `storm`/`stormBoss`), `js/scenes/TitleScene.js` (wereldkleur uit data), `js/storage/profileSchema.js` (`bosses.stormrijk`), `tests/run-tests.js`, `README.md`.

## Gewijzigde/nieuwe bestanden in v0.6.0

- **Nieuw**: `tools/art/frostpeak.js`, `tools/art/frost_enemies.js`, `js/systems/Worlds.js`, `tools/preview/preview-frostpeak.js`, `tools/preview/preview-frost-enemies.js`; assets `world/frostpeak/*`, `enemies/{slime_snow,slime_ice,bat_ice,penguin,yeti,ice_rock,boss_icegiant}.png`.
- **Aangepast**: `tools/art/boss.js` (`BOSS_STYLES`; De Woudwachter pixel-gelijk gebleven), `tools/art/world.js` (hulpfuncties geëxporteerd), `tools/build-assets.js`, `tools/preview/preview-boss.js` (stijl-argument), `js/data/worlds.js` (Frostpeak, `phases`, `unlock`, bioomkleuren, `WORLD_ORDER`), `js/data/enemies.js` (6 vijanden, De IJsreus, boss-`fx`), `js/world/World.js` (`setWorld`, sneeuw/sneeuwstorm/glinsters/noorderlicht), `js/entities/Boss.js` (kleuren uit data), `js/ui/HUD.js` (bioomkleuren uit de wereld), `js/scenes/RunScene.js` (wereld uit run-opties, fases per wereld, `checkUnlocks`), `js/scenes/TitleScene.js` (wereldkeuze), `js/scenes/ResultsScene.js` (boss-naam, vrijspeel-melding, "nog een run" in dezelfde wereld), `js/storage/profileSchema.js` (v6), `js/storage/ProfileService.js` (werelden), `js/core/Game.js` (robuuste loop, `runOptions(…, world)`), `js/core/Input.js` (W), `js/audio/AudioManager.js` (Frostpeak-muziek), `tests/run-tests.js`, `README.md`.

## Gewijzigde/nieuwe bestanden in v0.5.0

- **Nieuw**: `js/data/chests.js`, `js/systems/Chests.js`, `js/scenes/PetboekScene.js`, `js/entities/PetFx.js`, `tools/art/chests.js`, `tools/preview/preview-pets-zoom.js`; assets `pets/pet_{slime,wisp,cat,turtle,star,wolf}.png`, `ui/chest_{wood,tafel,gold}.png`, iconen chest_*/treat/book.
- **Aangepast**: `tools/art/pets.js` (10 pets, `PET_SPECS`; luchtuil blauw, draakje rood "gloeidraakje", robo nieuw ontwerp), `tools/build-assets.js`, `js/data/pets.js` (zeldzaamheden, fx, geen prijzen), `js/entities/Pet.js` (effecten), `js/systems/Equipment.js` (geen pet-aankoop meer), `js/scenes/EquipmentScene.js` (tab PETS weg), `js/scenes/TitleScene.js` (knop PETBOEK + teller), `js/scenes/ResultsScene.js` (verdiende kisten), `js/scenes/RunScene.js` (`Chests.awardForRun`), `js/storage/profileSchema.js` (v5), `js/storage/ProfileService.js` (`collection`), `js/core/Game.js` (`openBook`), `js/core/Input.js` (B), `js/audio/AudioManager.js` (kist-geluiden), `tests/run-tests.js`, `tools/preview/preview-pets.js`, `README.md`.

## Gewijzigde/nieuwe bestanden in v0.4.1

- **Aangepast**: `js/training/MasteryMap.js` (dag-niveaus, `applyMapAnswer`, `MAP_RULES`, dof goud), `js/training/AdaptiveTrainer.js` + `QuestionEngine.js` (kaartniveau per antwoord, `mapUp`/`newGold`), `js/training/SessionStats.js` (`mapUps`, `newGolds`), `js/scenes/TafelkaartScene.js` (dof goud, "vandaag omhoog", dagen tot goud), `js/scenes/ResultsScene.js` (melding tafelkaart), `js/storage/profileSchema.js` (v4 + migratie), `js/entities/Player.js` (vuur: spoor bij rennen, aura bij stilstaan), `js/entities/Pet.js` (extra afstand bij ON FIRE/ULTRA), `tests/run-tests.js`, `README.md`.

## Gewijzigde/nieuwe bestanden in v0.4.0

- **Nieuw**: `tools/art/pets.js`, `tools/preview/preview-pets.js`, `js/data/pets.js`, `js/entities/Pet.js`, `js/training/MasteryMap.js`, `js/scenes/TafelkaartScene.js`; assets `pets/pet_{fox,owl,robo,dragon}.png`.
- **Aangepast**: `tools/build-assets.js` (pets), `js/systems/Equipment.js` (pets + `loadout.pet`), `js/scenes/EquipmentScene.js` (tabs + pets), `js/scenes/RunScene.js` (pet volgt/juicht), `js/scenes/TitleScene.js` (knop TAFELKAART, toets K; de regel "snelste gemiddelde" is daarvoor vervallen), `js/core/Game.js` (`openMap`, `openEquipment(tab)`), `js/core/Input.js` (K), `tests/run-tests.js`, `README.md`.

## Gewijzigde/nieuwe bestanden in v0.3.0

- **Nieuw**: `js/data/weapons.js`, `js/systems/Equipment.js`, `js/scenes/EquipmentScene.js`, `tools/preview/preview-weapons.js`; assets `characters/*_w1..w3.png` (9), `effects/{slash,arrow,plasma}_w1..w3.png` (9), schild-icoon in `ui/ui.png`.
- **Aangepast**: `tools/art/hero.js`, `ranger.js`, `tech.js` (wapen-stijlen), `tools/art/ui.js` (schild), `tools/build-assets.js`, `js/systems/DamageSystem.js` (`appliesTo`/`targetKind`), `js/entities/Player.js` (loadout), `js/entities/EnemyManager.js` (`nextAfter`, vertraagde schoten), `js/scenes/RunScene.js` (loadout, boss-immuniteit, doorboorder, comboschild, coinbonus), `TitleScene.js`, `ResultsScene.js`, `js/ui/CharacterSelector.js` (knop + wapen-preview), `js/ui/HUD.js` (schild-icoon), `js/ui/fontData.js` (`*`), `js/core/Game.js`, `js/core/Input.js` (U), `js/training/SessionStats.js` (coinBonus), `js/storage/profileSchema.js` (v3), `js/storage/ProfileService.js`, `tests/run-tests.js`, `README.md`.

## Gewijzigde/nieuwe bestanden in v0.2.0

- **Nieuw**: `tools/art/rig.js`, `tools/art/ranger.js`, `tools/art/tech.js`, `tools/preview/preview-characters.js`, `js/data/enemies.js`, `js/systems/Health.js`, `js/systems/DamageSystem.js`, `js/systems/SpawnDirector.js`, `js/systems/CharacterRegistry.js`, `js/ui/CharacterSelector.js`; assets `characters/ranger_mila.png`, `characters/tech_nova.png`, `enemies/beetle_armored.png`, `effects/arrow.png`, `effects/plasma.png`.
- **Aangepast**: `tools/art/hero.js` (Kai op de rig), `tools/art/enemies.js` (+ schildkever), `tools/art/effects.js` (+ pijl/plasma), `tools/build-assets.js`, `js/config.js` (`combat`, `spawn`; `boss.damage` vervallen), `js/data/characters.js`, `js/data/worlds.js` (vijandpools; types verhuisd naar enemies.js), `js/data/catalog.js`, `js/entities/Player.js`, `Enemy.js`, `EnemyManager.js`, `Boss.js`, `js/scenes/RunScene.js`, `TitleScene.js`, `ResultsScene.js`, `js/ui/HUD.js` (boss-balk per HP), `js/ui/fontData.js` (pijltjes), `js/audio/AudioManager.js`, `js/storage/profileSchema.js` (v2 + migratie), `js/storage/ProfileService.js`, `tests/run-tests.js`, `README.md`.

## Verwerkte feedback (2026-10-09)

1. **Boss-arm vóór het gezicht** – opgelost in `tools/art/boss.js`: het hoofd staat nu bovenop de romp, de schouder van de voorarm zit links-onder aan de romp, en in de aanvalsframes gaat de opgeheven vuist náást het hoofd omhoog. Het gezicht is in alle frames vrij. Boomkroon 3px omlaag (raakte de framerand).
2. **Juiste antwoord langer tonen na een fout** – `CONFIG.answer.wrongFeedbackMs` van 650 → 1000 ms (gemeten: ±1,0 s, daarna direct de volgende som).

## Gepland (gekozen door de gebruiker, nog te bouwen)

- (Wereld-exclusieve pets zijn gebouwd in v0.8.0 – zie hieronder.)
- ~~**Wereld-exclusieve pets**~~ (gebouwd): per wereld een paar pets die je alleen in die wereld kunt vrijspelen (bijv. een eigen wereld-kist die je daar verdient; ideeën: pinguïn-pet in Frostpeak, vonkje-pet in Stormrijk). Doel: werelden krijgen meerwaarde (een reden om er te spelen) en verzamelen en werelden versterken elkaar. Aanhaakpunten: `js/data/pets.js` (bijv. veld `world`), `js/data/chests.js` + `Chests.awardForRun` (wereld-kist per wereld), `PetboekScene` (pets per wereld tonen, teaser "TE VINDEN IN FROSTPEAK"), `Worlds`.
  - Concept van de gebruiker (5 per wereld): `docs/concepts/wereld-pets-concept.webp`. Greenwood: Leaf Sprite, Forest Fox, Owl Companion, Moss Turtle, Butterfly Spirit · Frostpeak: Snow Bunny, Ice Owl, Polar Cub, Ice Spirit, Penguin Bot · Stormrijk: Shadow Wolf, Storm Raven, Void Cat, Thunder Wisp, Storm Dragon.
  - **Let op, te veel overlap → eerst duidelijk onderscheiden** (wens van de gebruiker): Moss Turtle ≈ Bosschildpad, Void Cat ≈ Schaduwkat, Forest Fox ≈ Vosje, Leaf Sprite ≈ Blaadjesslijm, Ice Owl / Owl Companion ≈ Luchtuil, Ice Spirit ≈ Dwaallichtje, Shadow Wolf ≈ IJswolf, Storm Dragon ≈ Gloeidraakje / De Donderdraak; lijken op vijanden: Storm Raven ≈ Stormkraai, Thunder Wisp ≈ Onweerswolkje, Penguin Bot ≈ pinguïn. Duidelijk nieuw: Butterfly Spirit, Snow Bunny, Polar Cub.
- Ook besproken, nog niet gekozen: strenger vrijspelen gekoppeld aan tafelkaart-goud (wat open is blijft open), 3 sterren per wereld (boss / 90% goed / snel), wereldkaart met hoofdstukken.

## Ideeën (nog niet besloten – eerst overleggen met de gebruiker)

- **Kunnen "af gaan"?** Nu kun je niet doodgaan (bewuste keuze: oefenen zonder frustratie). Mogelijke varianten: levens/hartjes, een schild dat breekt (verlies van coins/bonus, run gaat door), of een aparte optionele "Survival"-modus. Gebruiker weet nog niet óf dit moet – niet zelf implementeren.
- **Meer characters** (deels gedaan in v0.2.0: Kai, Mila, Nova): nog mogelijk is bijv. een magiër (vuurbal/bliksem → nieuw effect-sheet + `attack.effect`). Zie README "Een nieuw character toevoegen".
- **Player upgrades**: gebouwd in v0.3.0 als wapens + power-ups (zie README "Uitrusting"). Mogelijke uitbreidingen: tijdelijke boosts, crit-kans, meer power-ups, skins/trails/pets.
- **App voor telefoon/tablet**: makkelijkste route is een PWA (manifest + service worker → "installeren" op beginscherm, offline spelen); later eventueel in app stores via Capacitor. Aandachtspunt: in portretstand is het 16:9-canvas klein → layout voor portret of "draai je scherm"-melding.
- **Touchbesturing-optie op laptops met touchscreen**: er is al een on-screen cijferbalk die verschijnt zodra je het scherm aanraakt (`Input.usingTouch`, `RunScene.drawKeypad`). Idee: daarnaast een expliciete aan/uit-instelling (bijv. knop op het titelscherm) die onthouden wordt in `profile.settings`, zodat de balk ook zonder eerst aanraken zichtbaar is.

## Wat nog NIET gebouwd is

- Shop-UI (datamodel + coins zijn klaar).
- Meer werelden (structuur voor wereld 3+ staat; zie README "Een nieuwe wereld toevoegen"), skins, trails, hoverboards. Unlock-UI voor vergrendelde characters (structuur + `CharacterRegistry.tryUnlock` zijn klaar; de UITRUSTING-scene is een logische plek).
- Accounts/cloud-sync/leerkrachtdashboard (architectuur is voorbereid, zie README).
- Instellingenmenu (alleen mute-knoppen + `M`). Bijv. "lagere snelheidsdrempels" of "muziek standaard uit" voor de klas.
- Tutorial is één compact scherm bij de eerste run (bewust kort).
- Lokalisatie (alles is Nederlands, hoofdletter-font zonder diakrieten).
- Deeltafels / andere sommen.

## Bekende beperkingen / bugs

- **Alleen getest in Chromium** (built-in browser). Niet getest op een echte Chromebook, Firefox of Safari. Verwacht wel goed te werken (standaard Canvas/Web Audio/ES-modules).
- **Audio is technisch geverifieerd, maar niet beluisterd** tijdens ontwikkeling. Volumes zijn conservatief gezet (`AudioManager`: sfx-bus 0,55, muziek-bus 0,22). Muziek staat standaard aan; even naluisteren en eventueel standaard uit zetten voor klassengebruik (`profileSchema.js → settings.music`).
- **localStorage in cross-origin iframes** kan in Safari/strenge privacy-instellingen geblokkeerd zijn → game werkt, maar onthoudt niets (valt terug op `MemoryAdapter`).
- **Run-lengte is ingeschat, niet met leerlingen getest.** Schatting: ~2,5 s per som → ±3,7 min tot de boss + ±45 s boss. Zeer trage rekenaars (5 s/som) zitten rond 6-7 min. Bijstellen via `CONFIG.run` en `CONFIG.boss`.
- Bij extreem snelle invoer (tientallen antwoorden per seconde, alleen in tests) kunnen banners en popups even overlappen.
- In de tafel-pools zitten ook ×1-sommen (1×7, 7×1). Ze krijgen een lage oefenbehoefte, maar verschijnen wel.
- De characters zijn ±38 px hoog op een 480×270-canvas: goed leesbaar, maar grotere/gedetailleerdere sprites zouden nog meer "wow" geven.
- De characterkeuze is getest in Chromium op een smal browserpaneel; op een echt laptopscherm nog even visueel nalopen.
- Vijanden met meer HP laten de held bij trage rekenaars vaker stilstaan (gevechtshouding). De runlengte verandert niet (voortgang = tijd + antwoorden), maar het beeld voelt iets meer "stop-and-go". Bijstellen via `CONFIG.spawn.hpCurve`.

## Mogelijke vervolgstappen

1. **Playtest met leerlingen** → `CONFIG.run.progressPerSecond/progressPerCorrect`, `BOSSES.guardian.maxHp`, `CONFIG.spawn.hpCurve`, tijdsgrenzen bijstellen.
2. Shop-scherm (characters, trails, pets) met de bestaande `catalog` + `spendCoins/unlock/equip`.
3. Vierde wereld (bijv. "Lava Caves", "Zonnige kust" of "Wolkenkastelen") volgens het recept in de README.
4. Instellingen: muziek standaard uit, kleurenblind-vriendelijke feedback, grotere tekst.
5. Leerkrachtmodus: export van het profiel (JSON/CSV) als tussenstap naar een dashboard (`ProfileService.exportData()` bestaat al).
6. Accounts + `CloudAdapter` volgens het stappenplan in de README.
7. Dagelijkse doelen / streaks / "nieuw record"-meldingen op het titelscherm voor "nog één run".

## Testen (checklist die is uitgevoerd)

Startscherm ✅ · specifieke tafel ✅ · Mix ✅ · Powertraining ✅ · Mijn moeilijke sommen (vergrendeld + ontgrendeld) ✅ · juiste antwoorden ✅ · foute antwoorden ✅ · zeer snelle antwoorden (40 in één frame) ✅ · trage antwoorden (speler stopt vóór vijand) ✅ · Enter-spam (lege Enter genegeerd, resultaatscherm 1 s lock) ✅ · Backspace ✅ · max 3 cijfers ✅ · numpad zonder NumLock ✅ · typen tijdens fout-feedback genegeerd ✅ · adaptive repetition (unit-tests + live) ✅ · combo + combo break ✅ · alle combo-tiers incl. ULTRA ✅ · coins (incl. fix dubbele bonus) ✅ · bossfight + tegenaanval + overwinning ✅ · resultaten + records ✅ · localStorage + herladen ✅ · schermbreedtes (812×375 touch, 1366×768, 800×600) ✅ · iframe (focus, pauze bij focusverlies, hervatten) ✅ · console errors: geen ✅

**v0.9.0** – alle 7 uitleghoofdstukken passen in het paneel ✅ · H en ?-knopjes openen het juiste hoofdstuk, terug gaat naar het scherm waar je was ✅ · na de eerste overwinning: eerst de wereld-melding, dan de boskist-tip ✅ · startscherm: maar één tip tegelijk ✅ · dubbele pet → snoepjes-tip direct ✅ · testprofiel teruggezet ✅ · console errors: geen ✅

**v0.8.0** – petboek-pagina's (kist-pets + 3 werelden) met teasers en "!" bij nieuwe pets ✅ · vergrendelde wereld: "SPEEL EERST FROSTPEAK VRIJ" ✅ · boss Greenwood → "+1 BOSKIST" op het resultaatscherm ✅ · boskist openen → Elfenvlinder (legendarisch) ✅ · sneeuwkist → Mammoetje, onthulling onder de titel (fix) ✅ · Mammoetje loopt mee in Frostpeak ✅ · testprofiel daarna teruggezet ✅ · console errors: geen ✅

**v0.7.0** – alle 4 Stormrijk-fases in een run (regen, vonken, statisch, bliksemflitsen) ✅ · nieuwe vijanden in beeld (o.a. stroomslak, vonkje, stormkraai, onweerswolkje) ✅ · bug gevonden en opgelost: vonkje-sheet overschreven door effect "spark" ✅ · De Donderdraak: bliksemstraal bij fout (geel, in fase 2 paars), verslaan, "DE DONDERDRAAK IS VERSLAGEN!" ✅ · testprofiel daarna exact teruggezet ✅ · console errors: geen ✅

**v0.6.0** – migratie v5→v6 (eerdere overwinning → Frostpeak open) ✅ · wereldkeuze W, onthouden na herladen ✅ · vergrendelde wereld: teaser + START uit ✅ · alle 4 Frostpeak-fases in een run (sneeuw, grot, sneeuwstorm, noorderlicht) ✅ · nieuwe vijanden in beeld ✅ · De IJsreus: tegenaanval bij fout, verslaan, "DE IJSREUS IS VERSLAGEN!" ✅ · vrijspeel-melding na De Woudwachter ✅ · De Woudwachter pixel-gelijk (md5 van alle frames) ✅ · console errors: geen ✅

**v0.5.0** – migratie v4→v5 in de browser (gekocht draakje behouden, houten kist cadeau) ✅ · houten kist openen (wiebelen/openspringen/onthulling) ✅ · legendarische onthulling (gouden stralen, schud, fanfare) ✅ · dubbele pet → +10 snoepjes ✅ · kopen met bevestiging (Spatie 2×) ✅ · petboek: teaser achter slotje, NIEUW!, gebruiken ✅ · IJswolf volgt de held in een run met gloed/spoor ✅ · resultaatscherm "VERDIEND: +1 TAFELKIST" ✅ · teller op het startscherm ✅ · console errors: geen ✅

**v0.4.1** – 20× snel goed op één dag blijft rood ✅ · goud na precies 4 dagen ✅ · traag max. groen ✅ · fout −1 (max. 1/dag) en blokkeert die dag ✅ · dof goud na 14 dagen, snel = weer goud, traag = groen ✅ · migratie v3→v4 in de browser: oud goud → max. oranje ✅ · ON FIRE + stilstaan: vuur als aura, pet op 48 px afstand ✅

**v0.4.0** – tafelkaart openen (knop + K) ✅ · kleuren kloppen met voorbeelddata (goud voor ×1/×2/×5/×10, rood in de 6–9-hoek) ✅ · Enter op rij 7 → training tafel van 7 ✅ · pet kopen via toetsenbord (8.000 → 5.000, meteen gekozen) ✅ · draakje volgt de held (27 px) en juicht bij combo ×5 en ×40 ✅ · volledige run tot overwinning met pet zonder errors ✅

**v0.2.0** – Hero/Ranger/Tech selecteren ✅ · herladen: keuze blijft ✅ · alle animatie-states (contact-sheet met grondlijn) ✅ · exact dezelfde ground position/ankerpunt ✅ · geen clipping (beetle-hoorn gefixt) ✅ · 1 HP: 1 antwoord ✅ · 2 HP: 2→1→0 ✅ · 3 HP: 3→2→1→0 ✅ · fout: geen HP-verlies ✅ · spam 6 antwoorden in één tick → exact 6 hits (1+2+3), 12 lege Enters genegeerd, 6 verschillende sommen ✅ · boss 18 HP = 18 antwoorden, extra antwoord doet niets, overwinning bij laatste inslag ✅ · volledige run met bot zonder errors, 60 fps ✅ · migratie v1→v2 ✅

**v0.3.0** – UITRUSTING openen (knop + U) ✅ · kopen met bevestiging (966 → 166 coins, meteen uitgerust) ✅ · volgorde tiers + "nog X coins nodig" ✅ · alle 12 wapensprites visueel gecontroleerd (preview-weapons) ✅ · in run: snel = 2 dmg, PERFECT = 3 dmg met tier 3 ✅ · boss blijft 1 per antwoord, 18 antwoorden ✅ · comboschild 1× per run ✅ · doorboorder alleen vanaf ON FIRE ✅ · coinbonus +10% op resultaatscherm ✅ · migratie v2→v3 met behoud van voortgang (966 coins) ✅ · console errors: geen ✅
