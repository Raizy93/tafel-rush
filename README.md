# Tafel Rush

**Tafel Rush** is een snelle PixelArt endless runner waarin basisschoolleerlingen (±9-12 jaar) de tafels van vermenigvuldiging *powertrainen*.

> **De tafels zijn de game. De gamewereld is de visuele beloning voor het rekenen.**

Het personage rent automatisch. Er staat altijd een som in beeld (`7 × 8 = [ ]`). Typ het antwoord en druk op **Enter** → de volgende som staat er direct. Goed en snel rekenen = harder rennen, vijanden verslaan, coins verzamelen, combo's opbouwen en uiteindelijk de boss verslaan.

- Geen server, geen account, geen betaalde API's, geen externe libraries.
- Draait vanaf statische hosting (GitHub Pages) en in een `<iframe>`.
- Gemaakt voor Chromebooks: toetsenbord eerst, ~1 ms rekenwerk per frame.

---

## Snel starten (lokaal)

ES-modules werken niet via `file://`, dus gebruik een lokale webserver:

```bash
node tools/serve.js
```

Open daarna `http://localhost:8080`. (Python kan ook: `python -m http.server 8080`.)

Handige extra's:

| Wat | Hoe |
|---|---|
| Debug-overlay (fps, werk per frame, Enter→nieuwe-som latentie, mastery van de huidige som) | `http://localhost:8080/?debug` |
| Iframe-test | `http://localhost:8080/tests/iframe-test.html` |
| Unit-tests (rekenlogica + opslag) | `node tests/run-tests.js` |
| Assets opnieuw genereren | `node tools/build-assets.js` |

## Publiceren via GitHub Pages

1. Zet de map in een GitHub-repository (alles in de root: `index.html`, `css/`, `js/`, `assets/`).
2. Repository → **Settings → Pages** → *Deploy from a branch* → branch `main`, map `/ (root)`.
3. Na ±1 minuut staat de game op `https://<gebruiker>.github.io/<repo>/`.

Het bestand `.nojekyll` zorgt dat GitHub alle bestanden ongewijzigd serveert.

### Insluiten op je eigen website

```html
<div style="position:relative;width:100%;max-width:960px;aspect-ratio:16/9">
  <iframe src="https://<gebruiker>.github.io/<repo>/" title="Tafel Rush"
          style="width:100%;height:100%;border:0" allow="autoplay; fullscreen" allowfullscreen></iframe>
</div>
```

De game schaalt zichzelf (letterbox) naar elk formaat. Leerlingen klikken één keer in de game om toetsenbordfocus te geven. Verliest de iframe de focus, dan pauzeert de game automatisch ("klik om verder te spelen") en telt die tijd niet mee voor de reactietijd.

> **Let op localStorage in iframes:** de voortgang wordt opgeslagen onder het domein van de game (bijv. `github.io`). Sommige browsers (Safari, of strenge privacy-instellingen) blokkeren opslag in iframes van een ander domein. De game speelt dan gewoon, maar onthoudt niets na herladen. Wil je dat volledig uitsluiten, host de game dan op hetzelfde domein als je website.

---

## Besturing

| Toets | Tijdens een run | In het menu |
|---|---|---|
| `0`-`9` (ook numpad, ook zonder NumLock) | antwoord typen | tafel kiezen (`0` = 10) |
| `Backspace` | cijfer wissen | – |
| `Enter` | antwoord indienen | START RUN |
| `←` `→` | – | modus wisselen |
| `↑` `↓` | – | held kiezen (of klik op een held) |
| `U` | – | UITRUSTING openen (wapens, power-ups) |
| `B` | – | PETBOEK openen (pets + kisten) |
| `W` | – | andere wereld kiezen (Greenwood / Frostpeak / Stormrijk) |
| `F` | – | volledig scherm aan/uit (ook de knop rechtsboven). `Esc` heeft in de game **geen** functie: Esc sluit alleen het volledige scherm (zoals de browser altijd doet; tijdens een run pauzeert de game dan mee). Zo werkt het ook goed in een iframe. |
| `H` | – | UITLEG openen (ook via "? UITLEG" op het startscherm en het ?-knopje in petboek, tafelkaart en uitrusting) |
| `K` | – | TAFELKAART openen |
| `P` | pauze / verder (pauzescherm heeft knoppen VERDER en STOPPEN) | – |
| `T` | in de pauze: stoppen (naar de uitslag, alles blijft bewaard) | TERUG op elk scherm (ook altijd een klikbare knop **< TERUG**) |
| `M` | geluid aan/uit | geluid aan/uit |

Op touchscreens verschijnt automatisch een cijferbalk (1-9, 0, ⌫, OK) onderin beeld. Een onzichtbaar invoerveld vangt ook schermtoetsenborden op.

---

## Projectstructuur

```
index.html              één canvas + onzichtbaar invoerveld
css/style.css
js/
  main.js               opstarten: profiel → assets → game
  config.js             ALLE tuning (tijdsgrenzen, snelheid, combo's, combat/damage, spawn-balans, coins)
  core/                 Game (loop/scenes), Renderer, Assets, Input, Sprite, Particles, util
  training/             facts, AdaptiveTrainer, QuestionEngine, SessionStats, MasteryMap   ← didactiek, puur JS
  storage/              StorageAdapter, ProfileService, profileSchema           ← opslaglaag
  systems/              ComboSystem, Progression, Health, DamageSystem, SpawnDirector, CharacterRegistry, Equipment
  entities/             Player, Pet, Enemy, EnemyManager, Boss
  world/                World (parallax, grond, props, sfeer)
  ui/                   PixelFont + fontData, UI (panelen/knoppen), HUD, QuestionPanel, CharacterSelector
  scenes/               TitleScene, RunScene, ResultsScene, EquipmentScene (UITRUSTING), TafelkaartScene
  audio/                AudioManager (gesynthetiseerde chiptune SFX + muziek)
  data/                 worlds, enemies (EnemyConfig), characters, weapons (wapens + power-ups), pets, catalog   ← content als data
assets/
  atlas.json            frame-maten, animaties, atlas-rechthoeken (gegenereerd)
  characters/           hero_kai(_w1..3).png, ranger_mila(_w1..3).png, tech_nova(_w1..3).png – per wapen-tier één sheet
  enemies/              slimes, paddo, goblin, vleermuizen, steenkruiper, schildkever, kist, boss
  pets/                 10 pets, framemaat per pet (idle/run/cheer)
  ui/chest_*.png        houten kist, tafelkist, gouden kist (idle/shake/open)
  effects/              coin, slash/arrow/plasma (+ _w1.._w3 per wapen), spark, poof, dust, twinkle, flame
  world/greenwood/      edge/ deep/ ruins/ dark/ (sky, clouds, far, mid, near, ground) + props.png (props van alle werelden)
  world/frostpeak/      lake/ caves/ pass/ summit/ (zelfde lagen)
  world/stormrijk/      plain/ charred/ towers/ eye/ (zelfde lagen)
  ui/                   ui.png (panelen, knoppen, iconen), favicon.png
tools/
  build-assets.js       genereert ALLE PixelArt-assets (Node, geen dependencies)
  lib/raster.js         mini-tekenbibliotheek + PNG-encoder
  lib/palette.js        gedeeld kleurenpalet
  art/                  rig (gedeelde character-rig), hero, ranger, tech, enemies, frost_enemies, storm_enemies, boss (stijlen guardian/frost), dragon (Donderdraak), effects, world, frostpeak, stormrijk, pets, chests, ui
  preview/              preview-scripts (vergrote contact-sheets om assets te beoordelen)
  serve.js              lokale statische server
tests/
  run-tests.js          tests voor mastery, selectie, spacing, opslag, HP/damage, spawn-balans, characters
  iframe-test.html      voorbeeldpagina met de game in een iframe
```

### Over de PixelArt

Alle graphics zijn **origineel** en worden gegenereerd door `tools/build-assets.js`: echte PNG-sprite sheets met outlines, ramp-shading en ordered dithering (16-bit stijl). Alle speelbare characters gebruiken één gedeelde pixel-rig (`tools/art/rig.js`: hand-gepixelde hoofd/romp-matrices + kinematische ledematen). Daardoor hebben ze automatisch dezelfde schaal (frame 48×56), hetzelfde voetpunt (21,52) en exact dezelfde animatie-rijen, frame-aantallen en fps. Controleren kan met `node tools/preview/preview-characters.js uit.png [animatie]` (grondlijn + ankerpunt in beeld). Omdat de game alleen `atlas.json` + PNG's leest, kun je ieder bestand later vervangen door handgetekende of met een PixelArt-tool gemaakte sprites — zolang frame-maat en rijvolgorde kloppen.

---

## Hoe de tafellogica werkt

### Feiten en pools (`js/training/facts.js`)
- Een **feit** is een geordende som: `6x7` en `7x6` zijn twee feiten (beide vormen komen voor).
- **Training** (één tafel): alle `k × T` en `T × k` voor k = 1…10 (19 feiten).
- **Mix**: de vereniging van de gekozen tafels.
- **Powertraining**: tafels 2 t/m 10 door elkaar.
- **Mijn moeilijke sommen**: de zwakste sommen uit de eigen geschiedenis (aangevuld tot ≥ 12), plus af en toe een sterke som. Pas beschikbaar na ≥ 40 antwoorden én ≥ 4 echt lastige sommen.

### Reactietijd (`CONFIG.answer.tiers`)
| Tijd | Label | Kwaliteit voor mastery |
|---|---|---|
| < 1,6 s | PERFECT | 1,00 |
| 1,6-3 s | SNEL | 0,86 |
| 3-5 s | GOED | 0,66 |
| > 5 s | GOED (rustig) | 0,50 (> 9 s: 0,40) |

Een langzaam goed antwoord is **nooit fout**: het telt als goed, verlengt de combo, levert coins op. Snelheid bepaalt alleen hoeveel de *automatisering* (mastery) stijgt. De 1,6 s-grens is iets ruimer dan 1,5 s omdat de meettijd het typen van twee cijfers + Enter bevat.

### Adaptieve mastery (`js/training/AdaptiveTrainer.js`)
Per som wordt bijgehouden: `seen, correct, wrong, avgRt` (EMA), `recentRts` (laatste 5), `recent` (laatste 8 uitkomsten), `lastSeen, lastWrong, streak, mastery`.

- **Goed** → mastery beweegt naar de snelheidskwaliteit toe (omhoog met α = 0,34, omlaag slechts 0,14 — een traag antwoord kost dus weinig).
- **Fout** → mastery × 0,58.
- **Omgekeerde som** (`7x6` bij `6x7`) krijgt een zwakke, gekoppelde update (α ≈ 0,1). Beheersing van de ene zegt iets over de andere, maar ze blijven aparte oefeningen; de omgekeerde som telt niet als "gezien".
- **Startinschatting** voor nooit geoefende sommen: didactische prior (×1 en ×10 makkelijk, ×2/×5 redelijk, 6/7/8/9 onderling het lastigst), of 75% van de mastery van de omgekeerde som.

### Opgavenselectie (`js/training/QuestionEngine.js`)
1. **Gespreide herhaling**: een fout beantwoorde som komt na 3-5 andere sommen terug, en (als hij dan goed gaat) nog eens na 7-12 sommen. Bij herhaalde fouten groeit de pauze. Ook de omgekeerde som komt later een keer langs. Een traag-goed antwoord wordt later nog één keer gecontroleerd.
2. **Maximaal 1 op de 3 vragen** is zo'n herhaling, zodat zwakke sommen niet gaan overheersen.
3. **Succesmomenten**: ~10% (hard-modus 16%) een som die al goed beheerst wordt.
4. Anders: **gewogen trekking** op oefenbehoefte `need = 0,14 + (1−mastery)^1,6 × 1,7` (+ bonus voor weinig data of recent fout).
5. **Patroonvermijding**: nooit exact dezelfde som binnen de laatste paar vragen; reeksen zoals `2×3 → 2×4 → 2×5` worden sterk afgestraft; in Mix/Power geen clusters van dezelfde tafel; niet direct de omgekeerde som of hetzelfde antwoord.

De tests in `tests/run-tests.js` controleren o.a.: geen directe herhaling (2000 vragen), spacing na een fout, < 6% voorspelbare reeksen, en dat een gesimuleerde leerling met moeite met 6×7/7×8 die sommen vaker (maar niet overheersend) krijgt.

---

## Gameplay-opbouw

- **Voortgang** (0-100) groeit met de tijd én met goede antwoorden (`CONFIG.run`). Daardoor duurt een run voor vrijwel iedere leerling ±3-5 minuten, en maakt een snelle rekenaar in die tijd veel méér sommen.
- **Fases**: Bosrand → Dieper bos → Oude ruïnes → Donker bos → **Boss: De Woudwachter**.
- **Goed antwoord**: aanval (zwaardslag, pijl of plasma – afhankelijk van je held), **1 hit** op de vijand, coins vliegen naar de teller, speler versnelt. PERFECT = visuele CRITICAL (gouden effect), géén extra damage.
- **Vijanden met HP**: 1, 2 of 3 HP (compacte pips ■■□ boven de vijand). Iedere goede som = één hit; de volgende som staat er direct. Begin vooral 1 HP, richting de boss meer 2/3 HP.
- **Fout**: combo breekt, struikel-animatie, juiste antwoord ±1 s in beeld, dan direct de volgende som. Geen modals, geen wachtschermen.
- **Combo's**: ×5 COMBO (coins ×2) · ×10 SPEED UP (sprint-animatie) · ×20 ON FIRE (vuurspoor, coins ×3) · ×30 ULTRA MODE (paarse na-beelden, coins ×4) · daarna mijlpalen per 10. Muziek wordt intenser per tier.
- **Boss**: 18 HP = 18 goede antwoorden, via hetzelfde damage-systeem als gewone vijanden (HP-balk met één segment per hit); een fout geeft een onschuldige tegenaanval (schokgolf). Je kunt niet verliezen. Onder 50% HP wordt de boss "boos" (rode runen).
- **Resultaten**: sommen, goed, %, gemiddelde reactietijd, beste combo, PERFECT-antwoorden, coins, nieuwe records en max. 5 sommen die nog beter/sneller kunnen (positief geformuleerd, mét het juiste antwoord).

---

## Uitbreiden

### Telefoon en tablet (web-app)
Eén game voor alles: **op pc/laptop verandert er niets**, op een telefoon of tablet schakelt de game vanzelf naar de **touch-stand**.

- **Herkenning**: alleen een vinger als aanwijzer (`pointer: coarse` en geen muis/touchpad) = touchapparaat. Laptops met touchscreen houden de toetsenbordversie (de cijferbalk verschijnt daar pas na een aanraking, zoals altijd). Zie `Input.isTouchDevice()`.
- **Touch-stand**: grote cijferbalk onderin over de hele breedte (1-0, wissen, OK; beide duimen kunnen erbij en het spel blijft zichtbaar), een pauzeknop rechtsboven en in het pauzescherm een knop STOPPEN.
- **Geen toetsen in beeld op touch**: overal waar op pc een toets staat ("(B)", "ENTER = …", "← →" …) toont de touch-stand een tik-tekst of niets. Helpers: `ui.touch`, `ui.hint(toetsTekst, tikTekst)`, `ui.key(label, toets)`; uitleg en tips hebben een `touch`-variant (hoofdstuk TOETSEN heet op touch BEDIENING).
- **Altijd dwars** (keuze gebruiker): rechtop verschijnt "DRAAI JE TELEFOON" (`#rotate` in `index.html`, alleen via CSS op touchapparaten) en een lopende run pauzeert vanzelf.
- **Op het beginscherm zetten** (iPhone: Safari → Deel-knop → "Zet op beginscherm"; Android: menu → "Toevoegen aan startscherm"): de game opent dan schermvullend als app, met eigen icoon. In die stand is de knop "volledig scherm" weg (niet nodig).
- **Offline**: `sw.js` (service worker, "eerst netwerk, anders cache"): na één keer online spelen werkt alles offline; updates komen vanzelf door als je online bent. Werkt alleen via https (GitHub Pages) of localhost.
- **Voortgang bewaren**: de game vraagt de browser om blijvende opslag (`navigator.storage.persist()`), zodat Safari de voortgang niet na een tijdje opruimt.
- **iPhone-details**: geluid start na de eerste aanraking (iOS-regel), knijp-zoom en "bounce" staan uit, audio herstelt na een onderbreking.
- **Draaien**: na het draaien meet de game de schermmaat nog een paar keer opnieuw (Safari geeft de nieuwe maat soms te laat door) en de pagina staat vast, zodat het beeld niet verschuift (`Renderer.resize`, `body { position: fixed }`).
- Bestanden: `manifest.webmanifest`, `sw.js`, `assets/app/` (iconen 192/512/1024, apple-touch-icon; getekend in `tools/art/appicon.js`).
- **Nog niet getest op een echte iPhone/iPad** (alleen via de telefoon-weergave van de browser). Menuknoppen zijn op een telefoon bruikbaar maar aan de kleine kant; dat is het eerste om na te kijken bij een test op een echt toestel.

### Naar de App Store (volgende stap, nog niet gedaan)
De web-app is daar de basis van: met **Capacitor** wordt dezelfde game een echte iOS-app (WKWebView met de bestanden in de app, dus volledig offline), met de schermstand vast op dwars.
Nodig: Apple Developer-account ($99/jaar), een Mac met Xcode (of een online bouwdienst zoals Codemagic), app-icoon 1024×1024 (`assets/app/icon-1024.png` staat klaar), screenshots, een privacyverklaring ("verzamelt geen gegevens") en bij voorkeur TestFlight om eerst met kinderen te testen. Voor de categorie "Kids": geen advertenties, geen tracking, geen externe links zonder ouderslot – daar voldoet Tafel Rush al aan. De opslag kan dan via een eigen `StorageAdapter` naar de opslag van de app.

### Bezoekers en gebruik tellen (GoatCounter)
Dashboard: **meesterdanny.goatcounter.com** (alleen de eigenaar kan inloggen). Geen cookies, geen persoonsgegevens, geen voortgang; dus geen cookiebanner nodig.
- Paginabezoeken: het telscript in `index.html` telt met de domeinnaam ervoor (`tafelrush.meesterdanny.com/`), zodat meerdere games in één account uit elkaar te houden zijn.
- Events (`js/systems/Analytics.js`), allemaal onder `tafelrush/`: `geopend/website|app|rechtstreeks`, `run-gestart/<modus>`, `boss-verslagen/<wereld>`, `run-gestopt`, `wereld-vrijgespeeld/<wereld>`, `voortgang-opgehaald`.
- Op localhost wordt niets geteld. Offline of met een adblocker gebeurt er niets; de game speelt gewoon door.
- De voortgangscode zit achter `#` en gaat nooit mee met een telling.

### Voortgang meenemen (QR-code / code) – zonder account of database
Knop **VOORTGANG** (toets V) op het startscherm.
- **Meenemen**: een QR-code om te scannen met de camera van het andere apparaat (opent de game en biedt de voortgang aan), of **CODE KOPIEREN** (de link; zelf bewaren of versturen).
- **Ophalen**: de QR-link openen, of **CODE PLAKKEN**. Altijd eerst een overzicht (in de code ↔ op dit apparaat) en een bevestiging; ophalen **vervangt** de voortgang op dat apparaat.
- **Geen server, geen database**: de code ís de voortgang (compact ingepakt en gecomprimeerd, `js/storage/ProgressCode.js`). In de link staat hij achter `#`, dat deel stuurt een browser nooit naar een server. Er zitten geen persoonsgegevens in (geen naam/e-mail): sommen, scores, coins, pets, werelden en een willekeurig profielnummer. De run-geschiedenis gaat niet mee.
- Codelengte: nieuw profiel ±260 tekens, na veel oefenen ±1.000-1.750 (past ruim in een QR-code). De QR-generator is eigen code (`js/ui/QRCode.js`) en wordt in de tests gecontroleerd door een onafhankelijke lezer (`tests/qr-reader.js`).
- **iPhone-let op**: een web-app op het beginscherm heeft zijn eigen opslag, los van Safari. Scan je de QR-code met de camera, dan opent hij in **Safari**. Daarom toont het ophaalscherm op iPhone/iPad in Safari (geopend via de link) twee keuzes: **HIER OPHALEN** (in Safari) of **KOPIEER VOOR DE APP**. Die laatste zet de code op het klembord (dat wordt wél gedeeld) en toont de stappen: app openen via het icoon → VOORTGANG → CODE PLAKKEN → VERVANGEN. Opent iemand de app op het beginscherm met nog lege voortgang, dan verschijnt een tip die hiernaar verwijst (`TIPS.appImport`).
- **Plak-/kopieervenster** (`js/ui/ClipboardPanel.js`): iOS geeft het klembord alleen vrij bij een echte tik (click), niet bij pointerdown waarop de game reageert. Daarom opent CODE PLAKKEN op iPhone/iPad/touch meteen een HTML-venster met een echte **PLAK**-knop (iOS toont dan zijn knopje *Plakken*), plus een vak om zelf in te plakken. Een geldige code gaat meteen door. Lukt kopiëren niet direct, dan verschijnt hetzelfde soort venster met een **KOPIEER**-knop. Toetsen in het venster gaan niet naar de game (`Input.onKeyDown` slaat `.cbp` over).

### Uitleg en tips
- **UITLEG** (toets H, knop "? UITLEG (H)" linksboven op het startscherm): 7 hoofdstukken in kindertaal met echte plaatjes uit de game – zo speel je, oefenmodi, de tafelkaart, coins en uitrusting, pets en kisten, werelden, toetsen. Het ?-knopje in het petboek, de tafelkaart en de uitrusting opent meteen het juiste hoofdstuk, en "terug" gaat weer naar dat scherm.
- **Tips op het juiste moment**, ieder maar één keer (`settings.tipsSeen`): eerste kist, eerste wereldkist, eerste stapjes op de tafelkaart, genoeg coins voor iets leuks, nieuwe wereld open, eerste dubbele pet (snoepjes), de pagina's van het petboek, en dat er een uitleg is.
- Nooit tijdens het rekenen: alleen op het startscherm, het resultaatscherm (na de beloningen, nooit over de wereld-melding) en in het petboek (niet tijdens het openen van een kist). Hooguit één tip per schermbezoek, de belangrijkste eerst; alleen de "dubbele pet"-tip mag direct. Wegklikken kan pas na 0,6 s, zodat een kind hem niet per ongeluk wegtikt.
- Inhoud: `js/data/help.js` (`HELP_CHAPTERS`, `TIPS`) – tekst aanpassen kan daar. Een test controleert dat alle tekens in het pixelfont bestaan.
- Code: `js/scenes/UitlegScene.js`, `js/systems/Tips.js` (`game.tips.queue(id, urgent)`), `Game.openHelp(hoofdstuk, terug)`, `UI.helpButton()`.

### Werelden
| Wereld | Fases | Vijanden | Boss | Vrijspelen |
|---|---|---|---|---|
| **Greenwood** | Bosrand → Dieper bos → Oude ruïnes → Donker bos | slijmen, paddo, goblin, vleermuizen, steenkruiper, schildkever | De Woudwachter | altijd open |
| **Frostpeak** | Bevroren meer → IJsgrotten → Bergpas (sneeuwstorm) → Noorderlicht | sneeuwslijm (1), ijsvleer (1), ijsslijm (2), pinguïn (2), yeti-jong (2), ijsklomp (3, gepantserd) | De IJsreus | na het verslaan van De Woudwachter |
| **Stormrijk** | Verdorde vlakte (regen) → Bliksemwoud (gloeiende vonken) → Stormtorens → Oog van de storm | stroomslak (1), vonkje (1, vliegt), stormkraai (1, vliegt), donderpad (2), onweerswolkje (2, vliegt), stormkreeft (3, gepantserd) – allemaal nieuw getekend | De Donderdraak (eigen tekening, aanval = bliksemstraal) | na het verslaan van De IJsreus |

- Wereldkeuze bovenaan het startscherm (← → of **W**). Een vergrendelde wereld kun je al bekijken (teaser), maar niet starten. De gekozen wereld wordt onthouden (`settings.lastWorld`).
- Na de eerste overwinning op De Woudwachter verschijnt op het resultaatscherm de melding **"NIEUWE WERELD VRIJGESPEELD!"** met een bewegend kijkje in Frostpeak.
- De tafels, de run-lengte, de boss-HP (18) en de beloningen zijn in iedere wereld gelijk: een wereld is visuele beloning, geen moeilijkheidsgraad.
- Frostpeak heeft eigen muziek (met ijsklokjes), sneeuwval, een sneeuwstorm, glinsterende ijskristallen en live bewegend noorderlicht.
- Stormrijk heeft donkere muziek (zaagtand-bas), regen, opstijgende vonken, statische vonkjes en **bliksem**: een schicht achter de wolken met een zachte lichtflits en zacht gerommel. Bewust kindvriendelijk: de flits is hooguit ~12% lichter en kort, met minstens 3 seconden ertussen (`biome.lightning`), dus geen stroboscoop.
- De Donderdraak gebruikt `attack: 'breath'` in `BOSSES`: bij een fout antwoord laadt hij een bliksembol in zijn bek en vuurt een flikkerende bliksemstraal op de grond voor de held (in fase 2 paars). De andere bosses houden `'slam'` (vuistslag + schokgolf).
- Opslag (profiel v6): `worlds = { unlocked, bosses }` (bosses = aantal overwinningen per wereld). Migratie v5→v6: wie De Woudwachter al eens versloeg, krijgt Frostpeak meteen.
- Code: `js/data/worlds.js` (definities incl. `phases`, `unlock`, bioomkleur), `js/systems/Worlds.js` (`isUnlocked`, `selected`, `checkUnlocks`), `World.setWorld()`, bosses in `js/data/enemies.js` (`BOSSES`, met `fx`-kleuren).

### Een nieuwe wereld toevoegen
1. **Assets**: maak een bestand in `tools/art/` (zie `frostpeak.js`; hulpfuncties als `wrap`, `pineTree`, `trunk` komen uit `world.js`) met dezelfde lagen: `sky` (480×270), `clouds` / `far` / `mid` / `near` (960 breed, naadloos tegelend), `ground` (tegels van 32×48: 4 grondvarianten + 3 brugtegels). Props gaan in de gedeelde props-atlas (eigen prefix). Controleren: `node tools/preview/preview-frostpeak.js uit.png`.
2. Registreer ze in `tools/build-assets.js` onder `atlas.worlds.<id>.biomes` en draai `node tools/build-assets.js`.
3. Vijanden: tekenen (zie `tools/art/storm_enemies.js`), in de build zetten en in `js/data/enemies.js`. Zorg per bioom voor vijanden met 1, 2 én 3 HP. Sheet-namen moeten uniek zijn (de build stopt bij een dubbele naam).
4. Boss: een nieuwe tekening met dezelfde framemaat (128×112, voetpunt 66,108) en animaties `calm_/angry_` × `idle/attack/hurt/death` (zie `tools/art/dragon.js`), of een stijl in `BOSS_STYLES` (`tools/art/boss.js`). Dan een entry in `BOSSES` met `fx`-kleuren en eventueel `attack: 'breath'` + `mouth`. Preview: `node tools/preview/preview-dragon.js uit.png`.
5. Voeg in `js/data/worlds.js` de definitie toe (fases, biomen met kleur/vijanden/props/ambient, boss, muziek, `unlock`) en zet hem in `WORLD_ORDER`. Nieuwe ambient-soorten en muziek: `World.makeMote` en `TRACKS` in `AudioManager`.
6. `node tests/run-tests.js` controleert automatisch of iedere wereld compleet is (assets, vijanden, HP-klassen, props, boss).

### Characters (Kai, Mila, Nova)
| id | Naam | Rol | Aanval (effect) | Kenmerken |
|---|---|---|---|---|
| `hero01` | KAI | Zwaardheld | `slash` (melee) | rode sjaal, energiezwaard |
| `ranger01` | MILA | Ranger | `arrow` (pijl vliegt) | kap-cape, pijlkoker, boog die echt spant |
| `tech01` | NOVA | Tech Runner | `plasma` (energiebol) | koptelefoon + bril, arm-kanon, batterij-rugzak, gloeiende zolen |

Gameplay is voor alle drie **identiek** (damage, snelheid, coins, mastery, timing). De keuze is puur cosmetisch.

### Een nieuw character toevoegen
Characters zijn volledig data-driven; de game-code bevat geen `if (character === …)`.
1. **Sprite**: kopieer `tools/art/ranger.js` of `tech.js`. Pas de `HEAD`/`TORSO`-matrices, kleuren en tekenhaken aan (`back` = cape/rugzak, `weapon` = wapen in de hand, `frontArm` = eigen voorarm zoals een arm-kanon) en lever dezelfde pose-sets (idle, run, attack[6], hit[4], victory). De rig regelt schaal, ground position en timing.
2. **Registreer** het sheet in `tools/build-assets.js` (lijst "speelbare characters") en draai `node tools/build-assets.js`.
3. **Data**: entry in `js/data/characters.js` (naam, rol, sheet, `attack.effect` = `slash`/`arrow`/`plasma` of een nieuw effect-sheet met varianten normal/crit/ultra/fire, `attack.launch`, `unlock`, `order`). De selector toont hem automatisch.
4. Geef characters geen damage of snelheid – upgrades horen los van characters.

### Characterkeuze en unlocks
- Keuze: compacte selector links op het startscherm (`js/ui/CharacterSelector.js`), opgeslagen als `profile.selectedCharacter` via `ProfileService.selectCharacter()` (nooit direct localStorage).
- Unlock-status: `profile.unlocks.characters = { hero01: true, ranger01: true, tech01: true }`; regels in `js/systems/CharacterRegistry.js`.
- **Eén character vergrendelen, bijv. "Kosten: 1.500 coins":**
  1. `js/data/characters.js`: `unlock: { type: 'coins', price: 1500 }`.
  2. `js/storage/profileSchema.js`: default op `false` (bijv. `tech01: false`). Bestaande spelers houden hem (aanrader) of krijgen via een migratie `false`.
  3. De selector toont dan automatisch een silhouet, slotje en "1.500 COINS". Kopen = `CharacterRegistry.tryUnlock(id, profile)` (trekt coins af en zet de vlag) – een shop-knop hoeft alleen die functie aan te roepen.
  - Andere typen: `{ type: 'achievement', id }` of `{ type: 'progress', stat, value }`; een toekomstig achievement-systeem roept `profile.unlockCharacter(id)` aan.

## Uitrusting: wapens en power-ups

Open met de knop **UITRUSTING (U)** onder de gekozen held op het startscherm. Kopen gaat met coins en vraagt een tweede Enter/klik ("ZEKER?"), zodat kinderen niet per ongeluk coins uitgeven.

### Wapens (per held, voor alle helden even sterk)
| Tier | Kai | Mila | Nova | Prijs | Effect |
|---|---|---|---|---|---|
| 0 | Energiezwaard | Houten boog | Armkanon | gratis | startwapen |
| 1 | Ridderzwaard | Jachtboog | Kanon Mk II | 800 | alleen uiterlijk (nieuw wapen + aanvalskleur) |
| 2 | Kristalzwaard | Elfenboog | Plasmakanon | 2.000 | PERFECT-antwoorden doen 2 damage |
| 3 | Vlammenzwaard | Sterrenboog | Novakanon | 5.000 | PERFECT ×2 én +1 damage |

- Tier N kan pas als je tier N-1 hebt. Een gekocht wapen wordt meteen uitgerust; je kunt altijd terugwisselen.
- Het wapen is zichtbaar op de held (eigen sprite sheet per tier) én in de aanval (eigen projectielkleur).
- **De boss is immuun** voor wapen-perks ("oeroud pantser"): het bossgevecht blijft voor iedereen 18 goede antwoorden. Zo leveren upgrades nooit minder oefening op.
- PERFECT ×2 beloont snel rekenen: precies de automatisering die we willen trainen.

### Power-ups (één keer kopen, voor alle helden)
| Power-up | Prijs | Effect |
|---|---|---|
| COINBONUS | 1.200 | +10% coins aan het eind van iedere run (zichtbaar op het resultaatscherm) |
| COMBOSCHILD | 2.500 | 1× per run breekt een fout je combo niet (de fout telt wél gewoon mee voor de mastery en het juiste antwoord wordt getoond); schild-icoon naast de combo |
| DOORBOORDER | 3.500 | vanaf ON FIRE (combo 20) raakt je aanval ook de volgende vijand; werkt niet op de boss, geen extra coins |

### Technisch
- Data: `js/data/weapons.js` (prijzen, perks, sheets, effecten, power-ups). Regels: `js/systems/Equipment.js` (kopen, volgorde, uitrusten, `loadout()`).
- Een run start met `Equipment.loadout(profile)` → `{ character, weapon, sheet, attack, modifiers, powerups }`. `Player` krijgt de loadout; perks zijn DamageSystem-modifiers met `appliesTo: 'enemies'` (daarom geen effect op de boss).
- Profiel v3: `unlocks.weapons` (gekochte wapens per held), `unlocks.equippedWeapons`, `unlocks.powerups`. Migratie v2→v3 behoudt alle voortgang.
- Nieuw wapen toevoegen: stijl in `tools/art/hero.js`/`ranger.js`/`tech.js` (`*_WEAPON_STYLES`), sheet + effectkleur in `tools/build-assets.js`, entry in `js/data/weapons.js`. Controleren: `node tools/preview/preview-weapons.js uit.png`.

### Pets, kisten en het petboek (verzamelen, puur cosmetisch)
Pets zijn **niet te koop**: je vindt ze in **kisten**. Knop **PETBOEK (B)** op het startscherm (met een rood tellertje als er kisten klaarstaan). Pets rennen/vliegen achter je held aan en juichen bij combo-mijlpalen en de overwinning. Geen enkel gameplay-effect.

**Petboek** (tab PETBOEK): alle 10 pets als kaartjes. Gevonden = in kleur en bewegend; nog niet gevonden = **gedempt achter een slotje** (teaser), met de zeldzaamheid als bolletjes. Enter = gebruiken (nog eens = zonder pet). "NIEUW!" bij pets die je nog niet bekeken hebt.

| Zeldzaamheid | Pets | Hoe spectaculair |
|---|---|---|
| Gewoon | Vosje, Luchtuil, Blaadjesslijm | 24 px, simpele animatie |
| Zeldzaam | Gloeidraakje, Dwaallichtje, Schaduwkat | iets groter, eigen spoor (vonkjes, glinsters, schaduw) |
| Episch | Robo-maatje, Bosschildpad | 28-36 px, gloed + spoor, effect in de sprite (hologramring, blaadjes) |
| Legendarisch | Sterrenkoning, IJswolf | 34-46 px, 8 juich-frames, pulserende gloed, groot spoor, stralenring |

**Kisten** (tab KISTEN, kansen staan in de game):

| Kist | Hoe | Gewoon / Zeldzaam / Episch / Legendarisch |
|---|---|---|
| Houten kist | kopen: 400 coins (Spatie) | 72 / 23 / 4 / 1 % |
| Tafelkist | per 10 stapjes op de tafelkaart + iedere verslagen boss | 50 / 33 / 13 / 4 % |
| Gouden kist | per 5 nieuwe gouden vakjes + de eerste keer dat een hele tafel goud is | 22 / 36 / 27 / 15 % (verhoogd, geen garantie) |

**Wereld-exclusieve pets** (5 per wereld, alleen in de **wereldkist** van die wereld):

| Wereld | Gewoon | Gewoon | Zeldzaam | Episch | Legendarisch | Kist |
|---|---|---|---|---|---|---|
| Greenwood | Eekhoorntje | Egeltje | Kolibrie | Bloesemhert | Elfenvlinder | Boskist |
| Frostpeak | Sneeuwhaasje | IJsbeertje | Rendiertje | Luchtnarwal | Mammoetje | Sneeuwkist |
| Stormrijk | Bliksemgekko | Lantaarnvisje | Donderbij | Stormgriffioen | Stormfeniks | Stormkist |

- Een wereldkist krijg je **alleen door de boss van die wereld te verslaan** (in plaats van de tafelkist die je eerder bij een boss kreeg). Kansen: 55 / 28 / 12 / 5 %. Niet te koop.
- Er zitten alleen de 5 pets van die wereld in; ze komen nooit uit de houten, tafel- of gouden kist.
- Lokken met snoepjes kan bij wereld-pets pas na je **eerste overwinning op de boss van die wereld**.
- Bewust anders dan de 10 kist-pets en alle vijanden (concept van de gebruiker: `docs/concepts/wereld-pets-concept.webp`; te gelijkende ideeën zijn vervangen, bijv. geen tweede vos, uil, schildpad, kat of draak).
- Petboek: pagina's **KIST-PETS · GREENWOOD · FROSTPEAK · STORMRIJK** (W, klik, of ←/→ voorbij de rand) met uitleg per wereld; nog niet gevonden = "TE VINDEN IN …"; vergrendelde wereld = "SPEEL EERST … VRIJ". Wereldkisten staan in een eigen tab **WERELDKISTEN**.
- Code: `tools/art/world_pets.js` (tekeningen + `WORLD_PET_SPECS`), `js/data/pets.js` (`world`, `WORLD_PET_ORDER`, `ALL_PET_ORDER`), `js/data/chests.js` (`WORLD_CHESTS`, `CHEST_RULES.worldChestPerBoss`), `Chests.awardForRun(…, { world })`, `Chests.canLure`.

Iedereen begint met één houten kist cadeau. Openen: kist wiebelt → springt open (stralen in de kleur van de zeldzaamheid) → pet verschijnt; Enter slaat de spanning over. Een **pet die je al hebt** geeft **snoepjes** (10 / 25 / 60 / 150). Met snoepjes **lok** je zelf een pet die je mist (60 / 150 / 350 / 800) – zo zit je nooit eindeloos vast op die ene pet. Het resultaatscherm meldt verdiende kisten ("VERDIEND: +1 TAFELKIST", B = openen) of hoeveel stapjes je nog nodig hebt.

- Balans: `js/data/chests.js` (`CHESTS` kansen/prijs, `CHEST_RULES`, `TREATS` – ook de naam "snoepjes" staat daar op één plek). Pets + zeldzaamheden + live effecten: `js/data/pets.js`.
- Logica: `js/systems/Chests.js` (`awardForRun`, `open`, `buy`, `lure`, `rollPet`) – puur JS, getest (kansen over 20.000 trekkingen, dubbel = snoepjes, kisten verdienen, "hele tafel goud" maar één keer).
- Scherm: `js/scenes/PetboekScene.js`; live effecten: `js/entities/PetFx.js`; art: `tools/art/pets.js` (`PET_SPECS`: framemaat per pet) en `tools/art/chests.js`.
- Opslag (profiel v5): `collection = { chests, treats, progress, masterTables, found, newPets, opened }`; welke pets je hebt blijft `unlocks.owned.pets`. Migratie v4→v5: gekochte pets blijven van jou + één houten kist.
- Nieuwe pet: tekenen in `tools/art/pets.js` (+ `PET_SPECS`), toevoegen aan `PETS` en `PET_ORDER`. Controleren: `node tools/preview/preview-pets.js uit.png` of close-up `node tools/preview/preview-pets-zoom.js uit.png 6 wolf,star`.

## Tafelkaart
Knop **TAFELKAART (K)** op het startscherm. Een 10×10-raster (rij = eerste getal, kolom = tweede; 7×8 en 8×7 zijn aparte vakjes). De kaart meet **onthouden over meerdere dagen**, niet één goede run (Leitner-principe):

| Kleur | Niveau | Betekenis |
|---|---|---|
| grijs | 0 | nog niet geoefend |
| rood | 1 | net begonnen (de eerste dag) |
| oranje | 2 | op weg |
| groen | 3 | goed |
| goud | 4 | razendsnel, geautomatiseerd |
| dof goud | – | goud, maar 14 dagen niet geoefend: even opfrissen |

Regels (`js/training/MasteryMap.js`, `MAP_RULES`):
- **Maximaal één stap omhoog per som per dag**, alleen op een dag zonder fout met die som → goud kost **minimaal 4 verschillende dagen**. In één run kan het nooit.
- **Langzaam goed** (≥ 3 s) brengt je hooguit tot groen; goud vraagt snelheid.
- **Een fout kost één stap** (max. één per dag, nooit lager dan rood).
- **Onderhoud:** goud dat 14 dagen niet geoefend is wordt dof goud. Snel goed → weer goud; traag → terug naar groen.
- Een wit hoekje in een vakje = vandaag een stap hoger. Bij de gekozen som staat "NOG X DAGEN TOT GOUD". Het resultaatscherm meldt "+X STAPJES OP DE TAFELKAART!".
- Deze kaart staat los van de snelle interne mastery die de game gebruikt om sommen te kiezen (die mag binnen een run snel reageren).

- Rechts: aantal gouden sommen (x/100), details van de gekozen som (hoe vaak geoefend, hoe vaak goed, gemiddelde tijd), en per tafel hoeveel van de 19 sommen goud zijn. Een ster = alle sommen van die tafel goud.
- **Enter** (of de knop) start direct een training van de tafel van de gekozen rij.
- Logica: `js/training/MasteryMap.js` (`applyMapAnswer`, `levelFor`, `buildMasteryMap`) – puur JS en getest (o.a. "20× snel goed op dag 1 blijft rood", "goud na precies 4 dagen", vervagen na 14 dagen).
- Opslag: per som `mastery[key].map = { level, upDay, downDay, wrongDay }` (profielversie 4; migratie geeft bestaande voortgang hooguit oranje).

## Enemy-HP en damage-systeem
- **EnemyConfig** (`js/data/enemies.js`): per type `maxHp` (1-3), sprite, pips-hoogte, kleuren. Slimes/vleermuizen 1 HP · paddo/goblin/schaduwslijm 2 HP · schildkever/steenkruiper 3 HP (gepantserd, gouden pips). Boss: `maxHp: 18`.
- **Health** (`js/systems/Health.js`): gedeeld door `Enemy` én `Boss`. `takeDamage(damage)` verlaagt de HP **direct bij het antwoord** (logisch → nooit dubbele hits; snelle antwoorden gaan automatisch naar de volgende vijand). `showHit(result)` werkt de zichtbare HP bij op het moment dat de aanval inslaat.
- **DamageSystem** (`js/systems/DamageSystem.js`): `player.getAttackDamage(tier)` → `{ amount, crit, hits, tags }`. Nu altijd 1; PERFECT = `crit: true`, alleen visueel (`CONFIG.combat.critMultiplier = 1`).
- **Upgrade-hooks**: `player.modifiers` is een lijst met `{ id, appliesTo, apply(damage, ctx) }` – in gebruik voor de wapen-perks (zie Uitrusting). `appliesTo: 'enemies'` = niet op de boss. Meer voorbeelden in `EXAMPLE_MODIFIERS` (crit-kans); "double hit" kan via `damage.hits`.
- **SpawnDirector** (`js/systems/SpawnDirector.js`): kiest eerst een HP-klasse via `CONFIG.spawn.hpCurve` (begin ±85% 1 HP, richting boss ±30% 3 HP), daarna een soort uit het bioom. Nooit twee 3-HP vijanden achter elkaar; ongeveer elke 9-13 vijanden een schatkist.
- **Feedback per hit**: aanvals-animatie, hit-flits, terugslag, 1px indeuken, splinters, `-1`, CRITICAL!, pip die wit oplicht, metaalgeluid bij pantser. Screenshake alleen bij sterke hits. Niets hiervan blokkeert de volgende som.

### Nieuwe vijand
Teken hem in `tools/art/enemies.js` (rijen `move`, `attack`, `hurt`, kijkend naar links, 32×32, voeten op y=30), registreer in `build-assets.js`, voeg toe aan `ENEMY_TYPES` in `js/data/enemies.js` (met `maxHp` en `barY` = hoogte van de HP-pips) en aan de `enemies`-lijst van een bioom. De SpawnDirector zet hem automatisch in de juiste HP-klasse.

### Coins, shop en unlocks
Coins worden lokaal opgeslagen (`profile.currency`). `js/data/catalog.js` + `ProfileService.spendCoins()/unlock()/equip()` vormen de basis voor een shop (characters, skins, pets, trails, outfits, hoverboards, effecten). Er is bewust nog geen shop-UI.

### Nieuwe game-modus
Een modus is niets meer dan een **pool** van feiten + opties. Zie `TitleScene.runOptions()`. Bijvoorbeeld een "deeltafels"-modus vraagt om een eigen feit-type; de `QuestionEngine` werkt met sleutels en `parseKey`, dus dat is lokaal uit te breiden.

---

## Opslag, accounts en cloud (toekomst)

**Nu:** alles lokaal, geen account, geen persoonsgegevens.

```
Game → ProfileService → StorageAdapter → localStorage   (nu)
Game → ProfileService → CloudAdapter   → API/database   (later)
```

- **Alle** voortgang zit in één versieerbaar profielobject (`js/storage/profileSchema.js`):
  `version, meta{profileId, createdAt, updatedAt, revision}, stats, records, mastery, currency, unlocks, settings, history`.
- De game praat **nooit** direct met `localStorage`; alleen met `ProfileService` (synchroon lezen uit geheugen, gebundeld asynchroon opslaan).
- Adapters hebben een **async** contract (`read/write/remove`), zodat een netwerk-adapter er 1-op-1 in past. Als `localStorage` geblokkeerd is, valt de game terug op `MemoryAdapter`.
- **Migraties**: verhoog `PROFILE_VERSION` en voeg een stap toe aan `MIGRATIONS`. Ontbrekende velden worden automatisch aangevuld. Een onleesbaar profiel wordt als back-up bewaard (`profile.corrupt-<tijd>`), niet weggegooid.

### Stappenplan voor accounts
1. **Backend** (bijv. Supabase, Firebase of een eigen API) met tabellen `students`, `profiles (student_id, data jsonb, revision, updated_at)`, `classes`, `class_members`.
2. **CloudAdapter** die `read('profile')`/`write('profile', json)` naar de API stuurt met een sessie-token (inloggen via schoolaccount/SSO of een klascode + leerlingcode — géén wachtwoorden voor kinderen opslaan in de game zelf).
3. **Sync-strategie**: lokaal blijven schrijven (offline werkt altijd), en synchroniseren op `meta.revision` + `updatedAt`:
   - `stats`/`currency`: optellen per sessie (event-log) of last-write-wins;
   - `mastery`: **per som samenvoegen** — neem de record met de hoogste `lastSeen`, en tel `seen/correct/wrong` op als je per sessie delta's stuurt;
   - `records`: maximum per veld.
4. **Eerste koppeling**: bij inloggen het bestaande lokale profiel (met zijn `profileId`) uploaden/samenvoegen, zodat niets verloren gaat.
5. **Leerkrachtdashboard**: alles wat nodig is staat al in het profiel — `mastery` (per som: foutpercentage, reactietijd, mastery), `history` (per run: datum, modus, aantal, gem. tijd), `stats.totalPlayMs` (oefentijd). Een dashboard kan per klas de lastigste tafels en de ontwikkeling over tijd tonen.

---

## Credits

Ontwerp, code, PixelArt (gegenereerd) en audio (gesynthetiseerd): origineel voor Tafel Rush. Geen externe assets of libraries.
