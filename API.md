# Companion — guida di riferimento

Documentazione dei due moduli del companion. Non si legge dall'inizio alla
fine: si consulta cercando quello che serve.

- **companion.js** — la libreria: stato, coccole, streak, drop, widget d'angolo.
- **companion-box.js** — il box (Dex, Deposito, Diario). Opzionale, va caricato dopo.

Nessuna dipendenza esterna. Tutto lo stato vive in `localStorage` finché non
gli dai un archivio diverso.

---

## Indice

1. [Installazione](#1-installazione)
2. [I primi cinque minuti](#2-i-primi-cinque-minuti)
3. [Come funziona il gioco](#3-come-funziona-il-gioco)
4. [Opzioni di `Companion.init`](#4-opzioni-di-companioninit)
5. [Metodi](#5-metodi)
6. [Eventi](#6-eventi)
7. [Il box](#7-il-box)
8. [Aggiungere una creatura](#8-aggiungere-una-creatura)
9. [Immagini e file](#9-immagini-e-file)
10. [Dove tenere le immagini](#10-dove-tenere-le-immagini)
11. [Collegare Supabase](#11-collegare-supabase)
12. [Aiuti per le prove](#12-aiuti-per-le-prove)
13. [Cosa toccare per cambiare aspetto](#13-cosa-toccare-per-cambiare-aspetto)

---

## 1. Installazione

Nella pagina, nell'ordine:

```html
<link rel="stylesheet" href="companion.css">
<link rel="stylesheet" href="companion-box.css">   <!-- solo se usi il box -->

<script src="companion.js"></script>
<script src="companion-box.js"></script>           <!-- solo se usi il box -->
<script>
  Companion.init();
</script>
```

File nel repository:

```
companion.js            la libreria
companion.css           lo stile del widget d'angolo
companion-box.js        il box              (facoltativo)
companion-box.css       lo stile del box    (facoltativo)
companion/<nome>/       idle.gif e happy.gif di ogni creatura
companion/dex/          grafica del box + CREDITI.txt
```

---

## 2. I primi cinque minuti

```js
// avvio con le impostazioni predefinite
Companion.init();

// chi ho adesso
Companion.getActive();      // { id, name, displayName, level, xp, pets, ... }

// a che punto e' la giornata
Companion.getStreak();      // { dailyPets, goal, remaining, streak, cooling, ... }

// accreditare la polvere quando la giornata si chiude
document.addEventListener('companion:reward', function (e) {
  // e.detail = { amount, currency, reason, streak, companionId }
  accreditaPolvere(e.detail.amount);
});

// tirare per un drop alla fine di una bustina
var trovato = Companion.rollDrop();   // null oppure { id, name, duplicate }

// aprire il box da un tuo pulsante
CompanionBox.open();
```

---

## 3. Come funziona il gioco

**Coccole.** Ogni click sul companion lo fa reagire. Solo le coccole *valide*
contano: ne servono `dailyPetGoal` (5) al giorno, e tra una e l'altra devono
passare `petCooldownMs` (45 minuti). I click durante la ricarica danno
battuta e animazione ma non fanno avanzare il contatore.

**Punti affetto.** Ogni coccola valida vale `xpPerPet` (2 punti), con un
tetto giornaliero di `maxXpPerDay` (10). I livelli scattano alle soglie di
`levelThresholds`.

**Giornata completa.** Alla quinta coccola la giornata si chiude: la streak
sale di uno e arriva la polvere, pari a `dustBase + dustPerStreakDay × (streak − 1)`,
fino a `dustCap`. Cioe' 5 il primo giorno, 10 il secondo, fino a 40.

**Bonus settimanale.** Ogni `weeklyEvery` (7) giorni di streak si aggiungono
`weeklyDust` (25) garantiti, piu' una probabilita' di un oggetto
(`weeklyItemChance`, 18%) e una di una bustina (`weeklyPackChance`, 5%).

**Traguardi.** A 3, 7, 14, 30 e 100 giorni arriva un premio (`milestones`),
che si somma al bonus settimanale. Si prende una volta per streak: se la
streak si azzera e riparte da capo, i traguardi tornano disponibili.

**Gettoni di recupero.** Se ne guadagna uno ogni `recoveryTokenEvery`
(5) giorni, fino a `recoveryTokenMax` (2). Se salti **un** giorno solo e hai
un gettone, la streak si salva da sola. Due giorni di fila la azzerano.

**Il giorno comincia alle 4 del mattino** (`dayResetHour`), non a mezzanotte:
chi coccola all'una di notte lavora ancora sulla giornata precedente.

**Companion del giorno.** Con piu' di un companion posseduto, ogni giorno ne
tocca uno diverso, scelto in modo stabile a partire dalla data: lo stesso
giorno da' lo stesso companion su tutti i dispositivi. `Companion.pin(id)`
ferma la rotazione.

---

## 4. Opzioni di `Companion.init`

Tutte facoltative. Si passano insieme: `Companion.init({ size: 5, walk: false })`.

### Aspetto e posizione

| Opzione | Predefinito | Cosa fa |
|---|---|---|
| `corner` | `'bottom-right'` | Angolo del widget: `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `size` | `4` | Scala: 4 significa sprite 16×16 disegnato a 64×64 |
| `offset` | `16` | Distanza dai bordi, in pixel |
| `autoStart` | `true` | Mostra il widget appena la pagina e' pronta |
| `dismissible` | `true` | Crocetta per togliere il companion dalla schermata |

### Coccole e progressione

| Opzione | Predefinito | Cosa fa |
|---|---|---|
| `dailyPetGoal` | `5` | Coccole valide necessarie per chiudere la giornata |
| `petCooldownMs` | `2700000` | Ricarica tra due coccole valide (45 minuti) |
| `xpPerPet` | `2` | Punti affetto per coccola valida |
| `maxXpPerDay` | `10` | Tetto giornaliero di punti |
| `levelThresholds` | `[0,20,60,140,300]` | Soglie dei livelli 1..5 |
| `dayResetHour` | `4` | Ora in cui comincia il giorno di gioco |

### Ricompense

| Opzione | Predefinito | Cosa fa |
|---|---|---|
| `dustBase` | `5` | Polvere del primo giorno di streak |
| `dustPerStreakDay` | `5` | Polvere aggiuntiva per ogni giorno di streak |
| `dustCap` | `40` | Tetto della polvere giornaliera |
| `weeklyEvery` | `7` | Ogni quanti giorni scatta il bonus |
| `weeklyDust` | `25` | Polvere garantita del bonus |
| `weeklyItemChance` | `0.18` | Probabilita' di un oggetto |
| `weeklyPackChance` | `0.05` | Probabilita' di una bustina |
| `weeklyItemPool` | 3 oggetti | Oggetti sorteggiabili: sostituiscili con i tuoi id |
| `milestones` | `{3:10,7:20,14:40,30:80,100:250}` | Traguardi, una volta per streak |
| `recoveryTokens` | `true` | Attiva i gettoni di recupero |
| `recoveryTokenEvery` | `5` | Ogni quanti giorni se ne guadagna uno |
| `recoveryTokenMax` | `2` | Quanti se ne possono tenere |
| `dropChance` | `0.06` | Probabilita' predefinita di `rollDrop()` |

### Comportamento del companion

| Opzione | Predefinito | Cosa fa |
|---|---|---|
| `idleChatter` | `true` | Battute spontanee ogni tanto |
| `idleChatterMinMs` / `idleChatterMaxMs` | `150000` / `420000` | Intervallo tra due battute |
| `nudgeChance` | `0.35` | Quota di battute che suggeriscono un'azione |
| `readyHopMinMs` / `readyHopMaxMs` | `120000` / `240000` | Intervallo del sobbalzo di richiamo |
| `walk` | `true` | Passeggiata lungo il bordo |
| `walkMinMs` / `walkMaxMs` | `18000` / `45000` | Intervallo tra due passi |
| `walkRange` | `26` | Spostamento massimo dal centro, in pixel |
| `quietHours` | `true` | Ore di silenzio: niente iniziative |
| `quietStartHour` / `quietEndHour` | `22` / `8` | Fascia del silenzio |
| `typewriter` | `true` | Testo a macchina da scrivere |
| `typeSpeedMs` | `18` | Millisecondi per lettera |
| `statusRefreshMs` | `20000` | Ogni quanto ricontrolla ricarica e postura |
| `reminderHour` | `20` | Ora del promemoria serale |
| `welcomeBackAfterDays` | `2` | Giorni di assenza dopo cui fa festa al rientro |

### Immagini

| Opzione | Predefinito | Cosa fa |
|---|---|---|
| `fallbackImage` | `'companion/bulbasaur/idle.gif'` | Immagine usata quando manca il file di una posa |
| `preloadImages` | `true` | Scarica in anticipo GIF e oggetti |
| `petTokenImages` | `[]` | Oggetti che si accumulano a ogni coccola valida |
| `petTokenSize` | `16` | Lato in pixel di ogni oggetto |
| `ballImage` | `null` | Sostituisce il disegno della sfera nella comparsa |
| `appearOnFirstRun` | `true` | Il primo companion arriva dentro la sfera |
| `iconBaseUrl` | `''` | Cartella delle miniature del deposito (vedi §10) |
| `iconSuffix` | `'.png'` | Estensione dei file delle miniature (maiuscola: `'.PNG'`) |
| `iconCase` | `'lower'` | Come scrivere il nome: `lower`, `upper`, `title`, `keep` |
| `iconFrames` | `2` | Fotogrammi per foglio |
| `iconVersion` | `''` | Numero di versione accodato agli indirizzi, per saltare la cache |

### Deposito

| Opzione | Predefinito | Cosa fa |
|---|---|---|
| `boxCount` | `8` | Numero di scatole |
| `boxSize` | `30` | Posti per scatola |
| `boxColumns` | `6` | Colonne della griglia |
| `wallpapers` | 6 nomi | Nomi degli sfondi selezionabili |
| `dailyCompanion` | `true` | Rotazione giornaliera del companion attivo |

### Altro

| Opzione | Predefinito | Cosa fa |
|---|---|---|
| `storageKey` | `'cardsync.companion.v1'` | Chiave del salvataggio |
| `historyMaxDays` | `180` | Giorni completati tenuti in memoria |
| `nicknameMaxLength` | `16` | Lunghezza massima del nomignolo |

---

## 5. Metodi

### Avvio e collegamenti

| Metodo | Cosa fa |
|---|---|
| `init(opzioni)` | Avvia tutto. Ritorna `getActive()`. Si puo' richiamare per cambiare opzioni |
| `configureStorage({ load, save })` | Sostituisce `localStorage` con il tuo archivio |
| `configureClock({ now })` | Sostituisce l'orologio: usa quello del server (vedi §10) |
| `sync()` | Rilegge lo stato dall'archivio. Da chiamare dopo aver scaricato i dati |
| `reset()` | Azzera tutto e riparte da capo |

### Widget

| Metodo | Cosa fa |
|---|---|
| `showWidget()` | Mostra il companion e ricorda la scelta |
| `hideWidget()` | Lo toglie dalla schermata, anche dopo un ricaricamento |
| `isHidden()` | `true` se l'utente lo ha tolto |
| `say(testo, ms)` | Gli fa dire una frase |
| `react(posa, ms)` | Gli fa fare una posa: `'happy'`, `'excited'`, o qualsiasi posa per cui esista la GIF |
| `appear({ creatureId, onDone })` | Rigioca la comparsa a sfera |
| `mount(elemento, { scale, creatureId })` | Lo disegna dentro un altro elemento. Ritorna un oggetto con `setPose()` e `destroy()` |
| `drawTo(ctx, { x, y, scale, image })` | Lo disegna su un canvas: serve per la cartolina |

### Coccole e progressione

| Metodo | Ritorna |
|---|---|
| `pet()` | Coccola da codice, come il click. Ritorna `getStreak()` |
| `getStreak()` | `{ streak, goal, dailyPets, remaining, completedToday, cooling, nextPetInMs, progress, dustToday, dustIfCompleted, tokens, tokensMax, nextMilestone, daysToWeeklyBonus }` |
| `getStats()` | `{ owned, total, pets, xp, streak, longestStreak, daysCompleted, tokens, milestones, since }`. `milestones` sono quelli presi nella streak in corso |
| `getHistory()` | Elenco dei giorni completati, dal piu' vecchio |
| `getCalendar(giorni)` | `[{ key, done, today }]` per gli ultimi N giorni |

### Creature

| Metodo | Cosa fa |
|---|---|
| `getActive()` | La creatura attiva: `{ id, name, nickname, displayName, image, icon, rarity, level, xp, pets, pinned, mood }` |
| `getRoster()` | Tutte le creature con stato di possesso. Come `getDex()`, ma nome e rarita' restano visibili anche per quelle che non hai |
| `getDex()` | Il catalogo: `{ number, status, owned, name, dex, where, image, icon, level, pets, unlockedAt }`. I campi restano `null` finche' non la trovi |
| `getDexProgress()` | `{ owned, total }` |
| `setActive(id)` | Cambia il companion attivo (deve essere posseduto) |
| `unlock(id)` | Sblocca una creatura. Ritorna `{ id, name, duplicate }` |
| `rollDrop(probabilita)` | Tira per un drop. `null` se non esce nulla |
| `setNickname(id, nome)` | Nomignolo. Stringa vuota = torna al nome originale |
| `getNickname(id)` | Il nomignolo o `null` |
| `pin(id)` / `unpin()` / `getPinned()` | Ferma o riattiva la rotazione giornaliera |
| `getDayCompanion()` | Di chi e' il turno oggi |

### Deposito

| Metodo | Cosa fa |
|---|---|
| `getBoxes()` | Elenco scatole: `{ index, name, wallpaper, wallpaperName, count, size }` |
| `getBox(indice)` | Contenuto: `{ name, columns, size, count, slots: [...] }`, posti vuoti compresi |
| `setBoxName(indice, nome)` | Rinomina una scatola (max 14 caratteri) |
| `setBoxWallpaper(indice, n)` | Cambia sfondo |
| `moveCompanion(id, scatola, posto)` | Sposta. Se il posto e' occupato, i due si scambiano |
| `getIconUrl(id)` | Indirizzo del foglio della miniatura |
| `setIcons({ id: url })` | Assegna le miniature a mano (per i link firmati) |

### Suggerimenti e promemoria

| Metodo | Cosa fa |
|---|---|
| `setNudges(lista)` | Battute costruite sui dati veri. Stringhe o `{ id, text }`: con l'id la nuvoletta diventa cliccabile |
| `enableReminder()` | Attiva il promemoria serale (chiede il permesso alle notifiche) |
| `disableReminder()` / `getReminder()` | Spegne / legge lo stato |

---

## 6. Eventi

Si ascoltano su `document`, e i dati stanno in `e.detail`:

```js
document.addEventListener('companion:reward', function (e) {
  console.log(e.detail.amount);
});
```

### I tre che servono davvero

| Evento | Quando | Dati |
|---|---|---|
| `companion:reward` | Giornata completata | `{ amount, currency, reason, streak, companionId }` |
| `companion:bonus` | Oggetto o bustina del bonus settimanale | `{ week, streak, item, pack, companionId }` |
| `companion:unlocked` | Nuova creatura trovata | `{ id, name, rarity }` |

`reason` vale `'coccola_giornaliera'` o `'bonus_settimanale'`.

### Progressione

| Evento | Quando | Dati |
|---|---|---|
| `companion:pet` | Ogni click | `{ id, name, pets, xp, level, counted, cooling, cooldownMs, dailyPets, goal, goalDone }` |
| `companion:streak` | Giornata chiusa | `{ streak, dust, weekly, companionId }` |
| `companion:milestone` | Traguardo raggiunto | `{ days, dust, companionId }` |
| `companion:levelup` | Salita di livello | `{ id, name, level }` |
| `companion:token` | Gettone guadagnato | `{ tokens, max }` |
| `companion:recovered` | Gettone speso per salvare la streak | `{ streak, tokensLeft }` |
| `companion:streakbroken` | Streak persa | `{ lost }` |

### Creature e deposito

| Evento | Dati |
|---|---|
| `companion:assigned` | `{ id, name }` — primo companion assegnato |
| `companion:changed` | `{ id }` — cambiato l'attivo |
| `companion:dayCompanion` | `{ id, name, displayName, pinned }` |
| `companion:pinned` | `{ id, pinned }` |
| `companion:renamed` | `{ id, name, nickname }` |
| `companion:moved` | `{ id, box, slot, swappedWith }` |
| `companion:box` | `{ index, name }` o `{ index, wallpaper }` |
| `companion:pruned` | `{ removed }` — creature non piu' nel roster, tolte dal salvataggio |

### Interfaccia e sistema

| Evento | Dati |
|---|---|
| `companion:nudge` | `{ id, text }` — suggerimento mostrato |
| `companion:nudgeaction` | `{ id, text }` — l'utente ha toccato il suggerimento |
| `companion:reminder` | `{ remaining, streak, text }` — aggancialo alle notifiche vere |
| `companion:welcomeback` | `{ days, streak }` |
| `companion:visibility` | `{ hidden }` |
| `companion:synced` | `{ activeId, dailyPets, streak }` — altra scheda o altro dispositivo |
| `companion:appeared` | `{ id }` — finita la comparsa a sfera |
| `companion:icons` | `{ count }` |

---

## 7. Il box

```js
CompanionBox.open();          // apre sul Dex
CompanionBox.open('jolteon'); // apre con una creatura gia' scelta
CompanionBox.close();
CompanionBox.toggle();
CompanionBox.isOpen();
CompanionBox.refresh();       // ridisegna, se hai cambiato qualcosa da fuori
```

Tre sezioni:

- **Dex** — elenco numerato con il pallino di registrazione, e la scheda dati
  a fianco. Chi non hai trovato e' un punto interrogativo: non compaiono
  nome, rarita', descrizione ne' immagine.
- **Deposito** — scheda del selezionato a sinistra, scatola a destra. Primo
  tocco su una miniatura per guardarla, secondo per prenderla in mano, poi un
  posto per lasciarla (o un'altra miniatura per scambiarle).
- **Diario** — statistiche, calendario delle ultime cinque settimane, e la
  cartolina scaricabile.

Il box si aggiorna da solo quando arrivano gli eventi del companion. Legge
tutto dall'API pubblica: puoi riscriverne la grafica senza toccare la logica.

La plancia comandi funziona: la croce direzionale scorre l'elenco e cambia
sezione, il pulsante verde porta con te il selezionato, i tasti numerati
saltano alla voce corrispondente. Le frecce della tastiera fanno lo stesso.

---

## 8. Aggiungere una creatura

In `companion.js`, dentro `var ROSTER = [ ... ]`. L'ordine e' anche il numero
di catalogo: la prima e' la N. 001.

```js
{
  id: 'nomecreatura',           // minuscolo, senza spazi: e' anche il nome del file
  name: 'Nome Creatura',
  rarity: 'raro',               // 'comune' | 'raro' | 'leggendario'
  weight: 14,                   // peso nel sorteggio: piu' alto = piu' frequente
  startingEligible: false,      // true se puo' essere il primo companion assegnato
  spriteImages: {
    idle:  'companion/nomecreatura/idle.gif',
    happy: 'companion/nomecreatura/happy.gif'
  },
  dex: 'Due o tre righe di descrizione, che compaiono nel Dex.',
  where: 'Si trova aprendo bustine.',
  lines: {
    idle:    ['...', 'una battuta a riposo'],
    happy:   ['reazione alla coccola'],
    excited: ['reazione forte']
  }
}
```

Le battute si sommano al pool condiviso in cima al file (sezione 3b), che
vale per tutte le creature: `idle`, `happy`, `excited`, `sated`, `ready`,
`welcome`, `nudge`.

Se togli una creatura dal roster, chi ce l'aveva la perde: al caricamento
viene tolta dal salvataggio e viene emesso `companion:pruned`.

---

## 9. Immagini e file

**GIF delle pose.** Una cartella per creatura, con `idle.gif` e `happy.gif`.
Puoi aggiungere altre pose: basta metterle in `spriteImages` e richiamarle con
`react('nome')`. Se manca il file di una posa si ricade su `idle`, e se manca
anche quello su `fallbackImage`.

**Miniature del deposito.** Un foglio per creatura con i fotogrammi in fila,
tutti della stessa dimensione: 64×32 per due fotogrammi da 32×32. Il nome
corrisponde all'id della creatura, scritto secondo `iconCase`. Vanno in
`companion/icone/` (vedi §10).
L'animazione li alterna; la velocita' si regola in `companion-box.css`,
animazione `cbox-icon2`.

**Oggetti della giornata.** `petTokenImages` accetta i percorsi di immagini
quadrate, una per coccola valida. Lista vuota: non compare niente.

**Grafica del box.** In `companion/dex/`: `frame.png`, `card.png`,
`heading.png`, `messagebox.png`, `cursor.png`. Sono cornici a nove parti, si
allargano senza deformarsi. Il credito all'autore e' in
`companion/dex/CREDITI.txt` e va mantenuto.

---

## 10. Dove tenere le immagini

Le miniature del deposito possono stare ovunque: `iconBaseUrl` accetta sia un
percorso relativo sia un indirizzo completo.

### Nello stesso repository (consigliato)

Metti i fogli in `companion/icone/` accanto alle GIF e passa il percorso
relativo:

```js
Companion.init({ iconBaseUrl: 'companion/icone/' });
```

Cerchera' `companion/icone/bulbasaur.png`. Nessun token, nessun permesso fra
domini diversi: le immagini arrivano dalla stessa origine della pagina, come
gia' succede per le GIF. E hai un solo posto da aggiornare quando pubblichi.

**Maiuscole e minuscole contano.** Su GitHub Pages `BULBASAUR.png` e
`bulbasaur.png` sono due file diversi, e il nome viene costruito dall'id
della creatura, che e' minuscolo. Con `iconCase` dici come deve essere
scritto:

```js
Companion.init({
  iconBaseUrl: 'companion/icone/',
  iconCase: 'upper',        // BULBASAUR.png
  iconSuffix: '.PNG'        // solo se anche l'estensione e' maiuscola
});
```

| `iconCase` | Nome cercato |
|---|---|
| `'lower'` (predefinito) | `bulbasaur.png` |
| `'upper'` | `BULBASAUR.png` |
| `'title'` | `Bulbasaur.png` |
| `'keep'` | l'id cosi' com'e' |

Se un singolo file ha un nome fuori schema, mettilo nel campo `icon` della
creatura dentro `companion.js`: quello viene usato tale e quale.

### Da un altro repository

Non usare `raw.githubusercontent.com`: serve a guardare i file, non a
servirli a un sito, ha limiti di frequenza ed e' sconsigliato da GitHub
stesso. Usa jsDelivr, che legge direttamente da GitHub:

```js
Companion.init({
  iconBaseUrl: 'https://cdn.jsdelivr.net/gh/nome/repo@main/icone/'
});
```

### La cache, che ti fara' perdere un pomeriggio

GitHub Pages e le reti di distribuzione tengono le immagini in memoria a
lungo. Se sostituisci un foglio lasciando lo stesso nome, per un po'
continuerai a vedere quello vecchio e sembrera' che il codice sia rotto.
Alza `iconVersion` a ogni aggiornamento:

```js
Companion.init({
  iconBaseUrl: 'companion/icone/',
  iconVersion: 2                     // diventa bulbasaur.png?v=2
});
```

### Da un bucket Supabase

```js
Companion.init({
  iconBaseUrl: 'https://xxxx.supabase.co/storage/v1/object/public/icone/'
});
```

Se il bucket non e' pubblico e usi link firmati, passali a mano. Gli
indirizzi passati cosi' restano intatti: non ricevono `iconVersion`, perche'
contengono gia' i loro parametri.

```js
Companion.setIcons({
  bulbasaur: 'https://.../sign/icone/abc.png?token=...'
});
```

---

## 11. Collegare Supabase

### Salvataggio sul server

```js
Companion.configureStorage({
  load: function (key) { /* ritorna l'oggetto salvato, o null */ },
  save: function (key, value) { /* salva l'oggetto */ }
});
```

Dopo aver scaricato i dati da un altro dispositivo, chiama `Companion.sync()`
per farglieli rileggere.

### Orologio del server

Senza questo, spostando l'ora del telefono si guadagnano streak e polvere.

```js
Companion.configureClock({
  now: function () { return millisecondiDalServer; }
});
```

### Suggerimenti sui dati veri

```js
Companion.setNudges([
  { id: 'prezzi',   text: 'una carta della tua lista e\' scesa del 12%' },
  { id: 'doppioni', text: 'hai 14 doppioni da convertire' }
]);

document.addEventListener('companion:nudgeaction', function (e) {
  if (e.detail.id === 'prezzi') vaiAllaSchermataPrezzi();
});
```

---

## 12. Aiuti per le prove

Da console del browser, per non aspettare giorni veri:

| Comando | Cosa fa |
|---|---|
| `Companion.dev.clearCooldown()` | Toglie la ricarica: la prossima coccola conta subito |
| `Companion.dev.setDailyPets(n)` | Imposta le coccole di oggi |
| `Companion.dev.setStreak(n)` | Finge N giorni di streak chiusi ieri |
| `Companion.dev.setTokens(n)` | Gettoni in tasca |
| `Companion.dev.skipDay()` | Finge un giorno saltato |
| `Companion.dev.breakStreak()` | Azzera la streak |
| `Companion.dev.awayDays(n)` | Finge un'assenza, per vedere il rientro |
| `Companion.dev.nextDay()` | Fa passare un giorno (rotazione del companion) |
| `Companion.dev.fireReminder()` | Fa scattare subito il promemoria |
| `Companion.dev.flash()` | Lampo a schermo intero |
| `Companion._state()` | Lo stato grezzo, per curiosare |

---

## 13. Cosa toccare per cambiare aspetto

**Widget** (`companion.css`), variabili in cima a `.cmp-widget`:
`--cmp-z` sovrapposizione, `--cmp-font`, `--cmp-ink`, `--cmp-paper`,
`--cmp-offset`, `--cmp-token-size`.

Classi di stato utili: `.is-ready` coccola disponibile, `.is-sated` in
ricarica, `.is-done` giornata finita, `.is-hop` sobbalzo, `.is-squash` tocco,
`.is-appearing` comparsa in corso.

**Box** (`companion-box.css`), variabili in cima a `.cbox`:
`--cbox-shell` rosso della scocca, `--cbox-screen` e `--cbox-ink` schermo,
`--cbox-cyan`, `--cbox-teal`, `--cbox-deep`, `--cbox-sky` azzurri della
pagina dati, `--cbox-lens` lente.

Tutto rispetta la preferenza di sistema "riduci animazioni": con quella
attiva sparisce ogni movimento e i testi compaiono interi.
