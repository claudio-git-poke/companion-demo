/* ============================================================
   COMPANION — creature pixel art da compagnia
   Progetto: cardsync-pocket-repo
   Vanilla JS, nessuna dipendenza.

   Uso minimo:
     <link rel="stylesheet" href="companion.css">
     <script src="companion.js"></script>
     <script>Companion.init();</script>

   Il disegno delle creature "a codice" e' generato dal file stesso;
   le creature con spriteImages usano invece le GIF indicate.
   ============================================================ */

(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     1. CONFIGURAZIONE
     Valori modificabili passandoli a Companion.init({...})
     ---------------------------------------------------------- */

  var DEFAULTS = {
    corner: 'bottom-right',   // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    size: 4,                  // scala pixel: 4 => sprite 16x16 disegnato a 64x64
    offset: 16,               // distanza dai bordi in px
    autoStart: true,          // avvia subito animazione e widget d'angolo
    storageKey: 'cardsync.companion.v1',

    // --- Confine del giorno ---
    // Il giorno "di gioco" comincia alle 4 del mattino, non a mezzanotte:
    // chi coccola all'una di notte non perde la streak senza capire perche'.
    dayResetHour: 4,

    // --- Oggetti che si accumulano ---
    // Un'immagine per ogni coccola valida della giornata: metti qui i tuoi
    // cinque file (o quanti ne vuoi, vengono ripetuti in ordine). Lista
    // vuota = nessun oggetto mostrato, solo il comportamento della creatura.
    petTokenImages: [],
    petTokenSize: 16,         // lato in px di ogni oggetto

    // --- Miniature del deposito ---
    // Ogni miniatura e' un foglio con i fotogrammi in fila (di norma due),
    // tutti della stessa dimensione: 64x32 per due fotogrammi da 32x32.
    // Il nome predefinito e' <id del companion> + iconSuffix, quindi
    // bulbasaur.png. La velocita' dell'alternanza si regola in
    // companion-box.css, nell'animazione cbox-icon2.
    //
    // Nello stesso repository (consigliato):
    //   Companion.init({ iconBaseUrl: 'companion/icone/' });
    //
    // iconCase decide come viene scritto il nome del file a partire dall'id:
    //   'lower'  bulbasaur.png   (predefinito)
    //   'upper'  BULBASAUR.png
    //   'title'  Bulbasaur.png
    // Su GitHub Pages maiuscole e minuscole contano, quindi deve
    // corrispondere esattamente ai file che hai caricato. L'estensione la
    // decide iconSuffix: se anche quella e' maiuscola, usa '.PNG'.
    //
    // Da un altro repository, tramite jsDelivr:
    //   Companion.init({
    //     iconBaseUrl: 'https://cdn.jsdelivr.net/gh/nome/repo@main/icone/'
    //   });
    //
    // Senza iconBaseUrl si usa la GIF idle della creatura, come prima.
    iconBaseUrl: '',
    iconSuffix: '.png',
    iconCase: 'lower',
    iconFrames: 2,

    // GitHub Pages e le reti di distribuzione tengono le immagini in cache
    // a lungo: se sostituisci un foglio lasciando lo stesso nome, per un po'
    // si vede ancora quello vecchio. Alza questo numero a ogni aggiornamento
    // e l'indirizzo cambia, quindi la cache viene saltata.
    //   Companion.init({ iconBaseUrl: 'companion/icone/', iconVersion: 2 });
    iconVersion: '',

    // --- Scatole del deposito ---
    // Come nel PC dei giochi: piu' scatole, ciascuna con un nome e uno
    // sfondo, e un numero fisso di posti disposti in griglia.
    boxCount: 8,
    boxSize: 30,
    boxColumns: 6,
    wallpapers: ['Carta', 'Quadretti', 'Righe', 'Pois', 'Bosco', 'Onde'],

    // --- Companion del giorno ---
    // Con piu' di un companion posseduto, ogni giorno ne tocca uno diverso,
    // a meno che l'utente non ne fissi uno con Companion.pin(id).
    dailyCompanion: true,

    // --- Gettone di recupero ---
    // Copre un giorno saltato: se ne guadagna uno ogni recoveryTokenEvery
    // giorni di streak, fino a recoveryTokenMax. Copre un solo giorno per
    // volta: due giorni di fila senza coccole azzerano comunque la streak.
    recoveryTokens: true,
    recoveryTokenEvery: 5,
    recoveryTokenMax: 2,

    // --- Traguardi di streak ---
    // In aggiunta al bonus settimanale ricorrente. Si prendono una volta
    // per streak: se la streak si azzera e riparte, si riprendono.
    milestones: { 3: 10, 7: 20, 14: 40, 30: 80, 100: 250 },

    // --- Rientro dopo un'assenza ---
    // Il companion fa festa, non il broncio.
    welcomeBackAfterDays: 2,

    // --- Promemoria serale ---
    // Una sola volta al giorno e solo se mancano coccole. Funziona finche'
    // la pagina resta aperta: per la notifica vera aggancia l'evento
    // companion:reminder al tuo sistema di notifiche.
    reminderHour: 20,

    // --- Storico ---
    historyMaxDays: 180,      // giorni completati tenuti in memoria

    // --- Comparsa a sfera ---
    // La sfera cade, rimbalza, tremola tre volte e si apre.
    // ballImage: se metti il percorso di una tua immagine, sostituisce
    // il disegno predefinito senza toccare l'animazione.
    ballImage: null,
    appearOnFirstRun: true,   // il primo companion arriva dentro la sfera
    nicknameMaxLength: 16,    // lunghezza massima del nomignolo

    // --- Comportamento del widget ---
    typewriter: true,         // testo che compare lettera per lettera
    typeSpeedMs: 18,
    dismissible: true,        // pulsante per togliere il companion dalla schermata
    preloadImages: true,      // scarica in anticipo GIF e oggetti
    statusRefreshMs: 20000,   // ogni quanto ricontrolla ricarica e postura

    // Richiamo: un sobbalzo ogni tanto, ma solo quando c'e' davvero
    // una coccola valida da fare.
    readyHopMinMs: 120000,
    readyHopMaxMs: 240000,

    // Passeggiata: ogni tanto si sposta di qualche pixel e torna.
    walk: true,
    walkMinMs: 18000,
    walkMaxMs: 45000,
    walkRange: 26,            // spostamento massimo dal centro, in px

    // Ore di silenzio: niente battute spontanee, niente sobbalzi, niente
    // passeggiate. Le coccole restano possibili.
    quietHours: true,
    quietStartHour: 22,
    quietEndHour: 8,

    // --- Coccole giornaliere ---
    // Servono dailyPetGoal coccole "valide" per completare la giornata.
    // Fra una coccola valida e la successiva deve passare petCooldownMs:
    // i click fatti durante la ricarica funzionano lo stesso (reazione e
    // battuta) ma non fanno avanzare il contatore. Cosi' le 5 coccole si
    // spalmano su almeno 3 ore e l'utente deve rientrare nell'app.
    dailyPetGoal: 5,
    petCooldownMs: 45 * 60 * 1000,   // 45 minuti

    // --- Punti affetto ---
    xpPerPet: 2,              // punti affetto per coccola valida
    maxXpPerDay: 10,          // tetto giornaliero (5 coccole x 2 punti)
    levelThresholds: [0, 20, 60, 140, 300], // soglie livelli 1..5

    // --- Polvere magica: crescita lineare con la streak ---
    // Giorno 1 = 5, giorno 2 = 10, giorno 3 = 15 ... fino al tetto.
    dustBase: 5,
    dustPerStreakDay: 5,
    dustCap: 40,

    // --- Bonus di fine settimana (ogni weeklyEvery giorni di streak) ---
    // La polvere e' garantita; oggetto e bustina sono rari.
    weeklyEvery: 7,
    weeklyDust: 25,
    weeklyItemChance: 0.18,
    weeklyPackChance: 0.05,
    weeklyItemPool: [
      { id: 'boost_polvere', name: 'Boost polvere' },
      { id: 'skin_bustina', name: 'Skin bustina' },
      { id: 'lente_fortuna', name: 'Lente della fortuna' }
    ],

    // --- Chiacchiere spontanee ---
    // Ogni tanto il companion dice qualcosa da solo: a volte una battuta,
    // a volte un suggerimento a fare qualcosa di vero nell'app.
    idleChatter: true,
    idleChatterMinMs: 150000,  // 2 min e mezzo
    idleChatterMaxMs: 420000,  // 7 min
    nudgeChance: 0.35,         // quota di battute che suggeriscono un'azione

    // Probabilita' di drop di una nuova creatura (usata da Companion.rollDrop())
    dropChance: 0.06,

    // Immagine di riserva, usata quando manca sia il file della posa corrente
    // sia quello di 'idle'. Percorso relativo alla pagina.
    fallbackImage: 'companion/bulbasaur/idle.gif'
  };

  /* ----------------------------------------------------------
     3. CREATURE
     Il roster contiene solo creature vere, con le proprie GIF per posa
     in spriteImages. L'ordine qui sotto e' anche il numero di catalogo
     mostrato nel box: la prima e' la N. 001.

     Per aggiungerne una:
       - crea la cartella companion/<nome>/ con idle.gif e happy.gif
       - copia una voce esistente e cambia id, name, rarity, weight,
         percorsi e battute
       - startingEligible: true la rende assegnabile come primo companion

     Piu' sotto (sezione 3d) resta il disegno a codice: serve solo se un
     giorno vorrai una creatura senza GIF, costruita con la griglia di
     pixel invece che con le immagini.
     ---------------------------------------------------------- */


  var ROSTER = [
    {
      // Bulbasaur: prima creatura reale con GIF per posa (idle, happy).
      // Sostituisci rarita'/battute quando vuoi affinarle.
      id: 'bulbasaur',
      name: 'Bulbasaur',
      rarity: 'comune',
      weight: 40,
      startingEligible: true,
      spriteImages: {
        idle: 'companion/bulbasaur/idle.gif',
        happy: 'companion/bulbasaur/happy.gif'
      },
      // Voce del catalogo: descrizione e indizio su dove si trova.
      dex: 'Sta al sole tutto il giorno e si muove il minimo indispensabile. Il bulbo sulla schiena cresce insieme al suo affetto per te.',
      where: 'Assegnato come primo companion.',
      lines: {
        idle:    ['...', 'sonnecchia al sole'],
        happy:   ['contento!', 'gli piace essere coccolato'],
        excited: ['evviva!', 'salta di gioia!']
      }
    },
    {
      // Jolteon: seconda creatura reale con GIF per posa (idle, happy).
      // I file vanno in companion/jolteon/. Finche' non ci sono, al suo
      // posto compare fallbackImage.
      //
      // Oggi si trova solo con i drop: per renderlo assegnabile anche come
      // primo companion, metti startingEligible a true.
      id: 'jolteon',
      name: 'Jolteon',
      rarity: 'raro',
      weight: 14,
      startingEligible: false,
      spriteImages: {
        idle: 'companion/jolteon/idle.gif',
        happy: 'companion/jolteon/happy.gif'
      },
      dex: 'Il pelo si carica da solo e resta dritto anche quando dorme. Se lo accarezzi troppo in fretta, prendi una piccola scossa.',
      where: 'Si trova aprendo bustine.',
      lines: {
        idle:    ['...', 'il pelo si rizza da solo', 'sente un ronzio nell\'aria'],
        happy:   ['sprizza scintille corte', 'ti fa la scossa, ma piano'],
        excited: ['parte come un fulmine!', 'e\' tutto elettrico!']
      }
    }
  ];

  /* ----------------------------------------------------------
     3b. POOL DI FRASI CONDIVISE
     Queste battute valgono per tutte le creature e si sommano a
     quelle scritte nel roster. Aggiungine quante vuoi: sono solo
     stringhe, non serve toccare altro.

       idle    battute a riposo, puramente comiche
       happy   reazione a una coccola
       excited reazione forte (livello, giornata completa)
       sated   quando e' in ricarica e la coccola non conta
       ready   quando manca una coccola valida ed e' disponibile
       nudge   battute che suggeriscono un'azione vera nell'app
     ---------------------------------------------------------- */

  var CHATTER = {
    idle: [
      'insegue una briciola invisibile',
      'mordicchia una scarpa che non c\'e\'',
      'fissa il muro con aria filosofica',
      'ha starnutito e si e\' spaventato da solo',
      'conta le mattonelle',
      'prova a nascondersi dietro niente',
      'si e\' incastrato in un pensiero',
      'gira in tondo per tre volte e si siede'
    ],
    happy: [
      'fa una capriola storta',
      'si rotola sulla schiena',
      'sorride con tutti i denti',
      'ha deciso che oggi e\' il suo giorno preferito',
      'salta come una molla'
    ],
    excited: [
      'gira su se stesso a razzo!',
      'non sta piu\' nella pelle!',
      'rimbalza dappertutto!'
    ],
    sated: [
      'e\' sazio di coccole e si sdraia',
      'pancia all\'aria, si riposa',
      'deve digerire tutto questo affetto',
      'ti guarda con gli occhi socchiusi, appagato'
    ],
    ready: [
      'ti fissa e non smette',
      'ti da\' un colpetto con la testa',
      'si mette in mezzo allo schermo',
      'batte la zampa, impaziente'
    ],
    welcome: [
      'ti salta addosso: sei tornato!',
      'ti gira intorno tre volte per la felicita\'',
      'e\' corso alla porta appena ti ha sentito',
      'ti fa vedere il suo posto preferito, come se non fossi mai andato via'
    ],
    nudge: [
      'forse vuole che controlli i prezzi?',
      'guarda in direzione dell\'album...',
      'annusa la bustina di oggi',
      'ti indica la polvere magica',
      'sembra curioso: hai doppioni da convertire?',
      'punta lo sguardo sulle carte mancanti'
    ]
  };

  /* ----------------------------------------------------------
     3c. PARTICELLE
     Ogni evento ha la sua particella: il tipo di effetto dice cosa
     e' successo prima ancora di leggere la nuvoletta.
       heart     coccola valida
       level     salita di livello
       dust      polvere magica guadagnata
       confetti  giornata o settimana completata
     ---------------------------------------------------------- */

  var PARTICLES = {
    heart:    { glyph: '\u2665', count: 4,  spread: 40 },
    level:    { glyph: '\u2726', count: 10, spread: 46 },
    dust:     { glyph: '\u2726', count: 12, spread: 54 },
    confetti: { glyph: '',        count: 14, spread: 60 }
  };

  var CONFETTI_COLORS = 4; // quante varianti .cmp-confetti-N ci sono nel CSS

  /* ----------------------------------------------------------
     4. UTILITY
     ---------------------------------------------------------- */

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function dayKeyFrom(d) {
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  // Data spostata indietro di dayResetHour: cosi' le ore piccole
  // appartengono ancora al giorno precedente.
  function gameDate() {
    var shift = (cfg.dayResetHour || 0) * 3600000;
    return new Date(nowMs() - shift);
  }

  function todayKey() {
    return dayKeyFrom(gameDate());
  }

  // Mezzogiorno come riferimento: evita i salti dell'ora legale.
  // offset -1 = ieri, -2 = l'altro ieri.
  function dayKeyOffset(offset) {
    var d = gameDate();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return dayKeyFrom(d);
  }

  function yesterdayKey() {
    return dayKeyOffset(-1);
  }

  // Ore di silenzio: il companion non prende iniziativa.
  function isQuietHour() {
    if (!cfg.quietHours) return false;
    var h = new Date().getHours();
    return cfg.quietStartHour > cfg.quietEndHour
      ? (h >= cfg.quietStartHour || h < cfg.quietEndHour)
      : (h >= cfg.quietStartHour && h < cfg.quietEndHour);
  }

  // Scarica in anticipo GIF e oggetti: evita il lampo al primo cambio posa.
  function preloadImages() {
    if (!cfg.preloadImages || typeof Image !== 'function') return;
    var list = [];
    var i, key;

    for (i = 0; i < ROSTER.length; i++) {
      var map = ROSTER[i].spriteImages;
      if (map) {
        for (key in map) {
          if (Object.prototype.hasOwnProperty.call(map, key)) list.push(map[key]);
        }
      }
    }
    if (cfg.fallbackImage) list.push(cfg.fallbackImage);
    list = list.concat(cfg.petTokenImages || []);

    for (i = 0; i < list.length; i++) {
      try {
        var img = new Image();
        img.src = list[i];
      } catch (e) { /* niente: il precaricamento e' solo un'ottimizzazione */ }
    }
  }

  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function weightedPick(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i].weight;
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) {
      r -= list[i].weight;
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  function getCreature(id) {
    for (var i = 0; i < ROSTER.length; i++) {
      if (ROSTER[i].id === id) return ROSTER[i];
    }
    return null;
  }

  function prefersReducedMotion() {
    return global.matchMedia &&
           global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function emit(name, detail) {
    var ev;
    try {
      ev = new CustomEvent(name, { detail: detail });
    } catch (e) {
      ev = document.createEvent('CustomEvent');
      ev.initCustomEvent(name, false, false, detail);
    }
    document.dispatchEvent(ev);
  }

  // Miniature assegnate a mano: id -> indirizzo del foglio. Servono quando
  // gli indirizzi non seguono uno schema fisso, per esempio con i link
  // firmati di Supabase. Hanno la precedenza su iconBaseUrl.
  var iconOverrides = {};

  // Indirizzo del foglio della miniatura per una creatura.
  // Una creatura puo' avere un campo icon con il nome del file o un
  // indirizzo completo; altrimenti si usa il suo id.
  // Come scrivere il nome del file a partire dall'id della creatura.
  function applyIconCase(id) {
    if (cfg.iconCase === 'upper') return id.toUpperCase();
    if (cfg.iconCase === 'title') return id.charAt(0).toUpperCase() + id.slice(1);
    if (cfg.iconCase === 'keep') return id;
    return id.toLowerCase();
  }

  function iconUrl(creature) {
    if (!creature) return null;

    // Gli indirizzi passati a mano restano intatti: possono gia' contenere
    // un token o una loro versione.
    if (iconOverrides[creature.id]) return iconOverrides[creature.id];

    var name = creature.icon || null;
    if (name && /^(https?:)?\/\//.test(name)) return name;
    if (!cfg.iconBaseUrl) return null;

    var base = cfg.iconBaseUrl;
    if (base.charAt(base.length - 1) !== '/') base += '/';

    var url = base + (name || (applyIconCase(creature.id) + cfg.iconSuffix));
    if (cfg.iconVersion !== '' && cfg.iconVersion !== null &&
        cfg.iconVersion !== undefined) {
      url += (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + cfg.iconVersion;
    }
    return url;
  }

  // Nome da mostrare: il nomignolo scelto dall'utente, se c'e'.
  function displayName(creature) {
    if (!creature) return 'Companion';
    var rec = state && state.owned ? state.owned[creature.id] : null;
    return (rec && rec.nickname) ? rec.nickname : creature.name;
  }

  // Lampo bianco su tutto lo schermo: per i momenti grossi.
  function screenFlash(ms) {
    if (prefersReducedMotion()) return;
    var el = document.createElement('div');
    el.className = 'cmp-flash';
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, ms || 420);
  }

  // Suggerimenti generati dai dati veri dell'app (prezzi, lista dei
  // desideri, doppioni). Impostati con Companion.setNudges([...]).
  var liveNudges = [];

  // Battuta a caso: unisce le frasi della creatura e il pool condiviso.
  function speakLine(creature, kind) {
    var own = (creature && creature.lines && creature.lines[kind]) || [];
    var shared = CHATTER[kind] || [];
    var pool = own.concat(shared);
    if (!pool.length) pool = CHATTER.idle;
    return pickRandom(pool);
  }

  // Pallini di avanzamento della giornata: ●●●○○
  function dotsFor(done, goal) {
    var s = '', i;
    for (i = 0; i < goal; i++) s += (i < done ? '\u25CF' : '\u25CB');
    return s;
  }

  function formatWait(ms) {
    var min = Math.ceil(ms / 60000);
    if (min < 1) return 'un attimo';
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '');
  }

  /* ----------------------------------------------------------
     5. PERSISTENZA
     Di default localStorage, con fallback in memoria.
     Per Supabase: Companion.configureStorage({ load, save }).
     ---------------------------------------------------------- */

  // Orologio: sostituibile con quello del server, cosi' spostare l'ora del
  // telefono non regala streak e polvere.
  // Companion.configureClock({ now: function () { return timestampDalServer; } });
  var clock = {
    now: function () { return Date.now(); }
  };

  function nowMs() {
    return clock.now();
  }

  var memoryStore = {};

  var storage = {
    load: function (key) {
      try {
        var raw = global.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return memoryStore[key] || null;
      }
    },
    save: function (key, value) {
      try {
        global.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        memoryStore[key] = value;
      }
    }
  };

  /* ----------------------------------------------------------
     6. STATO
     ---------------------------------------------------------- */

  var cfg = {};
  var state = null;
  var started = false;
  var pendingAppear = false;   // primo companion in attesa della comparsa
  var dev_offset = 0;          // scarto di tempo usato solo dalle prove
  var devBaseClock = null;     // orologio vero, prima dello scarto di prova

  function blankState() {
    return {
      activeId: null,
      owned: {},             // id -> { xp, pets, unlockedAt }
      xpToday: 0,
      xpDay: null,
      lastPetAt: null,       // ultimo click, valido o no

      // coccole della giornata
      petDay: null,          // giorno a cui si riferisce dailyPets
      dailyPets: 0,          // coccole valide di oggi
      lastCountedPetAt: null,// timestamp dell'ultima coccola valida
      goalDay: null,         // giorno in cui l'obiettivo e' stato completato

      // streak
      streak: 0,
      streakDay: null,       // ultimo giorno completato
      lastDust: 0,           // polvere assegnata l'ultima volta
      lastDustDay: null,     // giorno a cui si riferisce lastDust

      hidden: false,         // il companion e' stato tolto dalla schermata

      tokens: 0,             // gettoni di recupero disponibili
      milestonesDone: [],    // traguardi presi nella streak in corso
                             // (si azzerano quando la streak riparte)
      history: [],           // giorni completati, dal piu' vecchio
      longestStreak: 0,
      totalDays: 0,          // giornate completate in tutto
      lastWelcomeDay: null,  // ultimo giorno in cui ha fatto festa al rientro
      reminder: false,       // promemoria serale attivo

      boxSlots: {},          // id -> { box, slot } posto nel deposito
      boxNames: [],          // nome di ogni scatola
      boxWalls: [],          // sfondo di ogni scatola (indice in cfg.wallpapers)

      pinnedId: null,        // companion fissato dall'utente
      dayCompanionId: null,  // companion di oggi
      dayCompanionDay: null  // giorno a cui si riferisce
    };
  }

  // Riempie i campi nuovi sui salvataggi vecchi, senza toccare il resto.
  function migrateState(s) {
    var blank = blankState();
    var key;
    for (key in blank) {
      if (Object.prototype.hasOwnProperty.call(blank, key) && s[key] === undefined) {
        s[key] = blank[key];
      }
    }
    return s;
  }

  function ensureOwned(id) {
    if (!state.owned[id]) {
      state.owned[id] = { xp: 0, pets: 0, unlockedAt: nowMs() };
    }
    return state.owned[id];
  }

  function persist() {
    storage.save(cfg.storageKey, state);
  }

  // Toglie dai salvataggi le creature che non stanno piu' nel roster:
  // senza questo, un vecchio salvataggio terrebbe in vita companion
  // inesistenti nelle statistiche e nella rotazione.
  function pruneUnknown() {
    var removed = [];
    var id;

    for (id in state.owned) {
      if (Object.prototype.hasOwnProperty.call(state.owned, id) && !getCreature(id)) {
        delete state.owned[id];
        removed.push(id);
      }
    }

    if (state.boxSlots) {
      for (id in state.boxSlots) {
        if (Object.prototype.hasOwnProperty.call(state.boxSlots, id) && !getCreature(id)) {
          delete state.boxSlots[id];
        }
      }
    }

    if (state.pinnedId && !getCreature(state.pinnedId)) state.pinnedId = null;
    if (state.dayCompanionId && !getCreature(state.dayCompanionId)) {
      state.dayCompanionId = null;
      state.dayCompanionDay = null;
    }
    if (state.activeId && !getCreature(state.activeId)) state.activeId = null;

    if (removed.length) {
      persist();
      setTimeout(function () {
        emit('companion:pruned', { removed: removed });
      }, 0);
    }
    return removed;
  }

  function loadState() {
    var saved = storage.load(cfg.storageKey);
    state = saved && typeof saved === 'object' ? migrateState(saved) : blankState();
    if (!state.owned) state.owned = {};
    pruneUnknown();

    // Prima assegnazione: una creatura casuale fra le comuni/rare
    if (!state.activeId || !getCreature(state.activeId)) {
      var startingPool = ROSTER.filter(function (c) {
        return c.rarity !== 'leggendario' && c.startingEligible !== false;
      });
      var chosen = weightedPick(startingPool);
      state.activeId = chosen.id;
      ensureOwned(chosen.id);
      persist();
      pendingAppear = true;
      emit('companion:assigned', { id: chosen.id, name: chosen.name });
    }
    ensureOwned(state.activeId);
    assignMissingSlots();
    rollDay();
  }

  // Due schede aperte insieme: quando l'altra salva, questa si riallinea
  // invece di sovrascriverla al primo click.
  function attachStorageSync() {
    if (!global.addEventListener) return;
    global.addEventListener('storage', function (e) {
      if (!e || e.key !== cfg.storageKey || !e.newValue) return;
      var next;
      try {
        next = JSON.parse(e.newValue);
      } catch (err) {
        return;
      }
      if (!next || typeof next !== 'object') return;

      state = migrateState(next);
      if (!state.owned) state.owned = {};
      ensureOwned(state.activeId);

      if (widget) {
        widget.refresh();
        widget.syncStatus();
      }
      emit('companion:synced', {
        activeId: state.activeId,
        dailyPets: state.dailyPets,
        streak: state.streak
      });
    });
  }

  function levelFor(xp) {
    var lvl = 1;
    for (var i = 0; i < cfg.levelThresholds.length; i++) {
      if (xp >= cfg.levelThresholds[i]) lvl = i + 1;
    }
    return lvl;
  }

  // Posa di riposo. Se un giorno aggiungerai GIF per altri umori
  // (per esempio assonnato di notte), e' qui che si decide.
  function currentMood() {
    return 'idle';
  }

  /* ----------------------------------------------------------
     6b. CAMBIO GIORNO E STREAK
     ---------------------------------------------------------- */

  // Azzera i contatori quando cambia il giorno e spezza la streak se
  // l'ultimo giorno completato non e' ne' oggi ne' ieri.
  function rollDay() {
    var day = todayKey();
    var changed = false;

    if (state.petDay !== day) {
      state.petDay = day;
      state.dailyPets = 0;
      changed = true;
    }
    if (state.xpDay !== day) {
      state.xpDay = day;
      state.xpToday = 0;
      changed = true;
    }

    if (state.streak > 0 && state.streakDay &&
        state.streakDay !== day && state.streakDay !== yesterdayKey()) {

      // Un solo giorno saltato e un gettone in tasca: la streak si salva.
      if (cfg.recoveryTokens && state.tokens > 0 && state.streakDay === dayKeyOffset(-2)) {
        state.tokens -= 1;
        state.streakDay = yesterdayKey();
        changed = true;
        var salvata = state.streak;
        var rimasti = state.tokens;
        setTimeout(function () {
          emit('companion:recovered', { streak: salvata, tokensLeft: rimasti });
        }, 0);
      } else {
        var lost = state.streak;
        state.streak = 0;
        state.streakDay = null;
        state.milestonesDone = [];   // ricominciando si riprendono
        changed = true;
        // Ritardato di un tick: cosi' l'evento arriva anche a chi si
        // registra subito dopo Companion.init().
        setTimeout(function () {
          emit('companion:streakbroken', { lost: lost });
        }, 0);
      }
    }

    rotateDayCompanion();

    if (changed) persist();
  }

  /* ----------------------------------------------------------
     6c. DEPOSITO
     Ogni companion posseduto occupa un posto in una scatola. Chi e'
     attivo resta comunque nella sua casella: la squadra e' una vista,
     non un posto separato.
     ---------------------------------------------------------- */

  function ensureBoxState() {
    if (!state.boxSlots) state.boxSlots = {};
    if (!state.boxNames) state.boxNames = [];
    if (!state.boxWalls) state.boxWalls = [];

    for (var i = 0; i < cfg.boxCount; i++) {
      if (!state.boxNames[i]) state.boxNames[i] = 'Scatola ' + (i + 1);
      if (typeof state.boxWalls[i] !== 'number') {
        state.boxWalls[i] = i % cfg.wallpapers.length;
      }
    }
  }

  function slotTaken(box, slot) {
    var id;
    for (id in state.boxSlots) {
      if (Object.prototype.hasOwnProperty.call(state.boxSlots, id) &&
          state.boxSlots[id] && state.boxSlots[id].box === box &&
          state.boxSlots[id].slot === slot) {
        return id;
      }
    }
    return null;
  }

  // Primo posto libero, scorrendo le scatole in ordine.
  function assignSlot(id) {
    ensureBoxState();
    if (state.boxSlots[id]) return state.boxSlots[id];

    for (var b = 0; b < cfg.boxCount; b++) {
      for (var sIdx = 0; sIdx < cfg.boxSize; sIdx++) {
        if (!slotTaken(b, sIdx)) {
          state.boxSlots[id] = { box: b, slot: sIdx };
          return state.boxSlots[id];
        }
      }
    }
    return null;
  }

  // Da' un posto a chiunque sia posseduto e non ne abbia ancora uno.
  function assignMissingSlots() {
    ensureBoxState();
    var id, changed = false;
    for (id in state.owned) {
      if (Object.prototype.hasOwnProperty.call(state.owned, id) &&
          getCreature(id) && !state.boxSlots[id]) {
        assignSlot(id);
        changed = true;
      }
    }
    if (changed) persist();
  }

  // Numero stabile ricavato da una stringa: lo stesso giorno da' lo stesso
  // companion su tutti i dispositivi, senza doverlo sincronizzare.
  function hashString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  // Sceglie di chi e' il turno oggi. Il companion fissato vince sempre.
  function rotateDayCompanion() {
    if (!cfg.dailyCompanion) return;

    var day = todayKey();
    if (state.dayCompanionDay === day) return;

    var ids = [];
    for (var id in state.owned) {
      if (Object.prototype.hasOwnProperty.call(state.owned, id) && getCreature(id)) ids.push(id);
    }
    if (!ids.length) return;

    var previous = state.dayCompanionId;
    state.dayCompanionDay = day;

    if (state.pinnedId && state.owned[state.pinnedId]) {
      state.dayCompanionId = state.pinnedId;
    } else if (ids.length === 1) {
      state.dayCompanionId = ids[0];
    } else {
      // Evita di ripetere quello di ieri.
      var pool = ids.filter(function (x) { return x !== previous; });
      if (!pool.length) pool = ids;
      pool.sort();
      state.dayCompanionId = pool[hashString(day) % pool.length];
    }

    var switched = state.activeId !== state.dayCompanionId;
    state.activeId = state.dayCompanionId;

    if (switched) {
      var chosen = state.dayCompanionId;
      var pinned = !!state.pinnedId;
      setTimeout(function () {
        var c = getCreature(chosen);
        if (widget) widget.refresh();
        emit('companion:dayCompanion', {
          id: chosen,
          name: c ? c.name : chosen,
          displayName: c ? displayName(c) : chosen,
          pinned: pinned
        });
      }, 0);
    }
  }

  function isGoalDone() {
    return state.goalDay === todayKey();
  }

  function cooldownLeft() {
    if (!state.lastCountedPetAt) return 0;
    var left = cfg.petCooldownMs - (nowMs() - state.lastCountedPetAt);
    return left > 0 ? left : 0;
  }

  // Quanti giorni varrebbe la streak completando la giornata di oggi.
  function projectedStreak() {
    if (isGoalDone()) return state.streak;
    return (state.streakDay === yesterdayKey()) ? state.streak + 1 : 1;
  }

  function dustForStreak(streak) {
    return Math.min(cfg.dustBase + cfg.dustPerStreakDay * (streak - 1), cfg.dustCap);
  }

  // Chiude la giornata: alza la streak, calcola polvere e bonus settimanale.
  function completeDailyGoal() {
    var day = todayKey();
    if (state.goalDay === day) return null;

    state.goalDay = day;
    var continua = (state.streakDay === yesterdayKey());
    state.streak = continua ? state.streak + 1 : 1;
    state.streakDay = day;

    // Streak ripartita da capo: i traguardi si riprendono.
    if (!continua) state.milestonesDone = [];

    var dust = dustForStreak(state.streak);
    var weekly = null;


    if (cfg.weeklyEvery > 0 && state.streak % cfg.weeklyEvery === 0) {
      weekly = {
        dust: cfg.weeklyDust,
        item: null,
        pack: false,
        week: state.streak / cfg.weeklyEvery
      };
      if (cfg.weeklyItemPool.length && Math.random() < cfg.weeklyItemChance) {
        weekly.item = pickRandom(cfg.weeklyItemPool);
      }
      if (Math.random() < cfg.weeklyPackChance) weekly.pack = true;
      dust += weekly.dust;
    }

    // Traguardi una tantum: 3, 7, 14, 30, 100 giorni.
    var milestone = null;
    var msDust = cfg.milestones ? cfg.milestones[state.streak] : 0;
    if (!state.milestonesDone) state.milestonesDone = [];
    if (msDust && state.milestonesDone.indexOf(state.streak) === -1) {
      state.milestonesDone.push(state.streak);
      milestone = { days: state.streak, dust: msDust };
      dust += msDust;
    }

    // Gettone di recupero guadagnato.
    var token = false;
    if (cfg.recoveryTokens && cfg.recoveryTokenEvery > 0 &&
        state.streak % cfg.recoveryTokenEvery === 0 &&
        state.tokens < cfg.recoveryTokenMax) {
      state.tokens += 1;
      token = true;
    }

    // Storico e statistiche.
    if (!state.history) state.history = [];
    if (state.history[state.history.length - 1] !== day) state.history.push(day);
    if (state.history.length > cfg.historyMaxDays) {
      state.history = state.history.slice(-cfg.historyMaxDays);
    }
    state.totalDays = (state.totalDays || 0) + 1;
    if (state.streak > (state.longestStreak || 0)) state.longestStreak = state.streak;

    state.lastDust = dust;
    state.lastDustDay = day;

    return {
      streak: state.streak,
      dust: dust,
      weekly: weekly,
      milestone: milestone,
      token: token
    };
  }

  /* ----------------------------------------------------------
     8. SPRITE ANIMATO
     Istanza riutilizzabile: la usa il widget d'angolo e la puo'
     usare qualsiasi altra schermata (es. lo sbusto) via
     Companion.mount(elemento, opzioni).
     ---------------------------------------------------------- */

  function CompanionSprite(host, options) {
    options = options || {};
    this.host = host;
    this.scale = options.scale || cfg.size;
    this.creature = options.creature || getCreature(state.activeId);
    this.pose = 'idle';
    this.poseTimer = null;

    this.img = document.createElement('img');
    this.img.className = 'cmp-sprite-img';
    this.img.width = 16 * this.scale;
    this.img.height = 16 * this.scale;
    host.appendChild(this.img);

    this.setCreature(this.creature);
  }

  // Sceglie il file giusto per la posa corrente. Se manca quello della posa
  // si ricade su idle, e se manca anche quello su cfg.fallbackImage.
  CompanionSprite.prototype.applyImagePose = function () {
    var mappa = (this.creature && this.creature.spriteImages) || {};
    var src = mappa[this.pose] || mappa.idle || cfg.fallbackImage;
    var attuale = this.img.src || '';

    if (src && attuale.indexOf(src) === -1) this.img.src = src;
  };

  CompanionSprite.prototype.setCreature = function (creature) {
    this.creature = creature;
    this.img.alt = displayName(creature);
    this.applyImagePose();
  };

  CompanionSprite.prototype.setPose = function (pose, durationMs) {
    this.pose = pose;
    this.applyImagePose();

    if (this.poseTimer) clearTimeout(this.poseTimer);
    if (durationMs) {
      var self = this;
      this.poseTimer = setTimeout(function () {
        self.setPose(currentMood(), 0);
      }, durationMs);
    }
  };

  CompanionSprite.prototype.destroy = function () {
    if (this.poseTimer) clearTimeout(this.poseTimer);
    if (this.img.parentNode) this.img.parentNode.removeChild(this.img);
  };



  /* ----------------------------------------------------------
     9. WIDGET D'ANGOLO
     ---------------------------------------------------------- */

  var widget = null;

  function CornerWidget() {
    var root = document.createElement('div');
    root.className = 'cmp-widget cmp-' + cfg.corner;
    root.style.setProperty('--cmp-offset', cfg.offset + 'px');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'cmp-button';
    button.setAttribute('aria-label', 'Coccola il tuo compagno');

    var stage = document.createElement('div');
    stage.className = 'cmp-stage';

    var shadow = document.createElement('div');
    shadow.className = 'cmp-shadow';

    var fx = document.createElement('div');
    fx.className = 'cmp-fx';

    var bubble = document.createElement('div');
    bubble.className = 'cmp-bubble';
    bubble.setAttribute('aria-live', 'polite');

    var tokens = document.createElement('div');
    tokens.className = 'cmp-tokens';
    tokens.setAttribute('aria-hidden', 'true');

    stage.appendChild(shadow);
    button.appendChild(stage);
    root.appendChild(bubble);
    root.appendChild(button);
    root.appendChild(tokens);
    root.appendChild(fx);

    root.style.setProperty('--cmp-token-size', (cfg.petTokenSize || 16) + 'px');

    var dismiss = null;
    if (cfg.dismissible) {
      dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.className = 'cmp-dismiss';
      dismiss.setAttribute('aria-label', 'Togli il companion dalla schermata');
      dismiss.textContent = '\u00D7';
      root.appendChild(dismiss);
    }

    document.body.appendChild(root);

    this.root = root;
    this.button = button;
    this.stage = stage;
    this.fx = fx;
    this.bubble = bubble;
    this.tokens = tokens;
    this.dismiss = dismiss;
    this.bubbleTimer = null;
    this.typeTimer = null;
    this.chatterTimer = null;
    this.hopTimer = null;
    this.walkTimer = null;
    this.statusTimer = null;
    this.walkX = 0;

    this.sprite = new CompanionSprite(stage, { scale: cfg.size });

    var self = this;
    button.addEventListener('click', function () { self.pet(); });
    button.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        self.pet();
      }
    });
    if (dismiss) {
      dismiss.addEventListener('click', function (e) {
        e.stopPropagation();
        Companion.hideWidget();
      });
    }

    this.activeNudge = null;
    this.nudgeTimer = null;
    this.reminderTimer = null;

    bubble.addEventListener('click', function () {
      if (!self.activeNudge) return;
      emit('companion:nudgeaction', {
        id: self.activeNudge.id,
        text: self.activeNudge.text
      });
      self.bubble.classList.remove('is-actionable');
      self.activeNudge = null;
    });

    this.syncStatus();
    this.scheduleChatter();
    this.scheduleHop();
    this.scheduleWalk();
    this.statusTimer = setInterval(function () { self.syncStatus(); }, cfg.statusRefreshMs);
    this.scheduleReminder();
  }

  // Testo a macchina da scrivere, come le finestre di dialogo delle console
  // portatili. Con "riduci animazioni" attivo compare tutto insieme.
  CornerWidget.prototype.say = function (text, ms) {
    var self = this;
    var hold = ms || 2600;

    if (this.typeTimer) { clearInterval(this.typeTimer); this.typeTimer = null; }
    if (this.bubbleTimer) { clearTimeout(this.bubbleTimer); this.bubbleTimer = null; }
    this.bubble.classList.add('is-visible');

    function hideLater() {
      self.bubbleTimer = setTimeout(function () {
        self.bubble.classList.remove('is-visible');
      }, hold);
    }

    if (!cfg.typewriter || prefersReducedMotion()) {
      this.bubble.textContent = text;
      hideLater();
      return;
    }

    this.bubble.textContent = '';
    var i = 0;
    this.typeTimer = setInterval(function () {
      i += 1;
      self.bubble.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(self.typeTimer);
        self.typeTimer = null;
        hideLater();
      }
    }, cfg.typeSpeedMs);
  };

  // Suggerimento cliccabile: al tocco emette companion:nudgeaction, che il
  // tuo codice usa per portare l'utente dove serve.
  CornerWidget.prototype.sayNudge = function (nudge) {
    var text = typeof nudge === 'string' ? nudge : nudge.text;
    this.activeNudge = (typeof nudge === 'string') ? null : nudge;
    this.say(text, 5200);

    if (this.activeNudge) {
      this.bubble.classList.add('is-actionable');
      var self = this;
      if (this.nudgeTimer) clearTimeout(this.nudgeTimer);
      this.nudgeTimer = setTimeout(function () {
        self.bubble.classList.remove('is-actionable');
        self.activeNudge = null;
      }, 6400);
    }
    emit('companion:nudge', { id: this.activeNudge ? this.activeNudge.id : null, text: text });
  };

  // Rientro dopo un'assenza: festa, mai broncio. Una volta al giorno.
  CornerWidget.prototype.welcomeBack = function () {
    if (!state.lastPetAt) return;
    var days = (nowMs() - state.lastPetAt) / 86400000;
    if (days < cfg.welcomeBackAfterDays) return;
    if (state.lastWelcomeDay === todayKey()) return;

    state.lastWelcomeDay = todayKey();
    persist();

    var self = this;
    setTimeout(function () {
      self.sprite.setPose('excited', 1400);
      self.burst('heart');
      self.say(speakLine(getCreature(state.activeId), 'welcome'), 4200);
    }, 900);

    emit('companion:welcomeback', { days: Math.floor(days), streak: state.streak });
  };

  // Promemoria serale: scatta all'ora scelta e solo se mancano coccole.
  CornerWidget.prototype.scheduleReminder = function () {
    if (this.reminderTimer) clearTimeout(this.reminderTimer);
    if (!state.reminder) return;

    var now = new Date();
    var target = new Date();
    target.setHours(cfg.reminderHour, 0, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);

    var self = this;
    this.reminderTimer = setTimeout(function () { self.fireReminder(); },
                                    target.getTime() - now.getTime());
  };

  CornerWidget.prototype.fireReminder = function () {
    rollDay();
    if (!isGoalDone()) {
      var info = Companion.getStreak();
      var text = info.remaining + (info.remaining === 1 ? ' coccola' : ' coccole') +
                 ' e la giornata e\' completa';

      this.say(text, 5200);
      emit('companion:reminder', {
        remaining: info.remaining,
        streak: info.streak,
        text: text
      });

      try {
        if (global.Notification && global.Notification.permission === 'granted') {
          new global.Notification(displayName(getCreature(state.activeId)), { body: text });
        }
      } catch (e) { /* niente: il promemoria in pagina e' gia' partito */ }
    }
    this.scheduleReminder();
  };

  /* Postura e oggetti: rileggono lo stato e aggiornano le classi CSS.
       is-ready  c'e' una coccola valida da fare
       is-sated  in ricarica, sazio
       is-done   giornata completa, riposa                                */
  CornerWidget.prototype.syncStatus = function () {
    rollDay();

    var done = isGoalDone() || state.dailyPets >= cfg.dailyPetGoal;
    var cooling = !done && cooldownLeft() > 0;

    this.root.classList.toggle('is-done', done);
    this.root.classList.toggle('is-sated', cooling);
    this.root.classList.toggle('is-ready', !done && !cooling);

    this.renderTokens(false);
  };

  // Un oggetto per ogni coccola valida della giornata.
  CornerWidget.prototype.renderTokens = function (animateLast) {
    var imgs = cfg.petTokenImages || [];
    var n = Math.min(state.dailyPets, cfg.dailyPetGoal);

    if (!imgs.length) {
      if (this.tokens.firstChild) this.tokens.innerHTML = '';
      return;
    }
    if (!animateLast && this.tokens.childNodes.length === n) return;

    this.tokens.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var el = document.createElement('img');
      el.className = 'cmp-token' + (animateLast && i === n - 1 ? ' is-new' : '');
      el.src = imgs[i % imgs.length];
      el.alt = '';
      this.tokens.appendChild(el);
    }
  };

  // Sobbalzo di richiamo: solo quando c'e' davvero una coccola disponibile.
  CornerWidget.prototype.scheduleHop = function () {
    var self = this;
    var span = Math.max(0, cfg.readyHopMaxMs - cfg.readyHopMinMs);
    var wait = cfg.readyHopMinMs + Math.random() * span;
    if (this.hopTimer) clearTimeout(this.hopTimer);
    this.hopTimer = setTimeout(function () { self.hop(); }, wait);
  };

  CornerWidget.prototype.hop = function () {
    var quiet = document.hidden || isQuietHour() || prefersReducedMotion() ||
                this.root.classList.contains('is-hidden');
    if (!quiet) {
      this.syncStatus();
      if (this.root.classList.contains('is-ready')) {
        this.root.classList.remove('is-hop');
        void this.root.offsetWidth;
        this.root.classList.add('is-hop');
        var self = this;
        setTimeout(function () { self.root.classList.remove('is-hop'); }, 700);
      }
    }
    this.scheduleHop();
  };

  // Passeggiata: ogni tanto si sposta di qualche pixel lungo il bordo.
  CornerWidget.prototype.scheduleWalk = function () {
    if (!cfg.walk) return;
    var self = this;
    var span = Math.max(0, cfg.walkMaxMs - cfg.walkMinMs);
    var wait = cfg.walkMinMs + Math.random() * span;
    if (this.walkTimer) clearTimeout(this.walkTimer);
    this.walkTimer = setTimeout(function () { self.walk(); }, wait);
  };

  CornerWidget.prototype.walk = function () {
    var blocked = document.hidden || isQuietHour() || prefersReducedMotion() ||
                  this.root.classList.contains('is-hidden');
    if (!blocked) {
      var step = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.round(Math.random() * 18));
      this.walkX = clamp(this.walkX + step, -cfg.walkRange, cfg.walkRange);
      this.root.style.setProperty('--cmp-walk', this.walkX + 'px');
    }
    this.scheduleWalk();
  };

  CornerWidget.prototype.burst = function (kind) {
    if (prefersReducedMotion()) return;
    var type = PARTICLES[kind] || PARTICLES.heart;
    var name = PARTICLES[kind] ? kind : 'heart';
    var left = 50 - type.spread / 2;

    for (var i = 0; i < type.count; i++) {
      (function (index) {
        var p = document.createElement('span');
        p.className = 'cmp-particle cmp-particle--' + name;
        if (name === 'confetti') {
          p.className += ' cmp-confetti-' + (1 + Math.floor(Math.random() * CONFETTI_COLORS));
        }
        p.textContent = type.glyph;
        p.style.left = (left + Math.random() * type.spread) + '%';
        p.style.animationDelay = (index * 50) + 'ms';
        this.fx.appendChild(p);
        setTimeout(function () {
          if (p.parentNode) p.parentNode.removeChild(p);
        }, 1600 + index * 50);
      }).call(this, i);
    }
  };

  /* Comparsa a sfera: cade, rimbalza, tremola tre volte, si apre.
     Il disegno della sfera e' in companion.css (.cmp-ball) e si sostituisce
     con una tua immagine passando ballImage a Companion.init(). */
  CornerWidget.prototype.appear = function (done) {
    var self = this;
    if (this.appearing) return;
    this.appearing = true;

    var ball = document.createElement('div');
    ball.className = 'cmp-ball';
    if (cfg.ballImage) {
      ball.classList.add('is-image');
      ball.style.backgroundImage = 'url("' + cfg.ballImage + '")';
    }
    this.stage.appendChild(ball);
    this.root.classList.add('is-appearing');

    function finish(delay) {
      setTimeout(function () {
        if (ball.parentNode) ball.parentNode.removeChild(ball);
        self.root.classList.remove('is-appearing');
        self.root.classList.add('is-revealed');
        setTimeout(function () { self.root.classList.remove('is-revealed'); }, 560);

        self.appearing = false;
        self.burst('confetti');
        self.say('Ciao! Sono ' + displayName(getCreature(state.activeId)), 3600);
        emit('companion:appeared', { id: state.activeId });
        if (typeof done === 'function') done();
      }, delay);
    }

    if (prefersReducedMotion()) {
      finish(60);
      return;
    }

    ball.classList.add('is-drop');                       // caduta e rimbalzo
    setTimeout(function () {
      ball.classList.add('is-wobble');                   // tre tremolii
    }, 640);
    setTimeout(function () {
      ball.classList.remove('is-wobble');
      ball.classList.add('is-open');                     // si apre
      screenFlash(420);
    }, 2740);

    finish(3060);
  };

  // Chiacchiere spontanee: ogni tanto dice qualcosa da solo.
  CornerWidget.prototype.scheduleChatter = function () {
    if (!cfg.idleChatter) return;
    var self = this;
    var span = Math.max(0, cfg.idleChatterMaxMs - cfg.idleChatterMinMs);
    var wait = cfg.idleChatterMinMs + Math.random() * span;
    if (this.chatterTimer) clearTimeout(this.chatterTimer);
    this.chatterTimer = setTimeout(function () { self.chatter(); }, wait);
  };

  CornerWidget.prototype.chatter = function () {
    // Niente battute a scheda nascosta, widget nascosto o di notte.
    if (document.hidden || this.root.classList.contains('is-hidden') || isQuietHour()) {
      this.scheduleChatter();
      return;
    }
    rollDay();

    var creature = getCreature(state.activeId);
    var kind = 'idle';
    var readyForPet = !isGoalDone() && cooldownLeft() === 0;

    if (readyForPet && Math.random() < 0.45) {
      kind = 'ready';
    } else if (Math.random() < cfg.nudgeChance) {
      kind = 'nudge';
    }

    // Se ci sono suggerimenti veri, hanno la precedenza su quelli generici
    // e la nuvoletta diventa cliccabile.
    if (kind === 'nudge' && liveNudges.length) {
      var n = pickRandom(liveNudges);
      this.sayNudge(n);
    } else {
      this.say(speakLine(creature, kind), 3400);
    }
    this.scheduleChatter();
  };

  CornerWidget.prototype.pet = function () {
    var r = petActive();

    this.sprite.setPose(r.excited ? 'excited' : 'happy', 900);
    this.root.classList.remove('is-squash');
    void this.root.offsetWidth;
    this.root.classList.add('is-squash');

    if (r.weekly) { this.burst('confetti'); this.burst('dust'); }
    else if (r.goalJustCompleted) { this.burst('confetti'); this.burst('dust'); }
    else if (r.leveledUp) this.burst('level');
    else if (r.counted) this.burst('heart');

    var progress = dotsFor(r.dailyPets, r.goal);

    if (r.milestone) {
      this.say('Traguardo: ' + r.milestone.days + ' giorni di fila! +' + r.dust +
               ' polvere', 4600);
      this.scheduleChatter();
      this.scheduleHop();
      return;
    }

    if (r.weekly) {
      var extra = [];
      if (r.weekly.item) extra.push(r.weekly.item.name);
      if (r.weekly.pack) extra.push('una bustina extra');
      this.say('Settimana completa! +' + r.dust + ' polvere' +
               (extra.length ? ' e ' + extra.join(' e ') : ''), 4600);
    } else if (r.goalJustCompleted) {
      this.say(progress + '  Giornata completa: +' + r.dust +
               ' polvere (streak ' + r.streak + ')' +
               (r.tokenEarned ? ' · gettone di recupero!' : ''), 4200);
    } else if (r.leveledUp) {
      this.say('Livello affetto ' + r.level + '!', 3200);
    } else if (r.counted) {
      this.say(progress + '  ' + speakLine(r.creature, 'happy'), 3000);
    } else if (r.cooling) {
      this.say(speakLine(r.creature, 'sated') +
               ' — prossima coccola tra ' + formatWait(r.cooldownMs), 3400);
    } else {
      this.say(speakLine(r.creature, 'happy'), 2800);
    }

    this.renderTokens(r.counted);
    this.syncStatus();
    this.scheduleChatter();
    this.scheduleHop();
  };

  CornerWidget.prototype.refresh = function () {
    this.sprite.setCreature(getCreature(state.activeId));
  };

  // Crea il widget se serve e applica la scelta dell'utente sulla visibilita'.
  function mountWidget() {
    if (!widget) widget = new CornerWidget();
    if (state.hidden) widget.root.classList.add('is-hidden');
    else widget.root.classList.remove('is-hidden');

    if (pendingAppear && cfg.appearOnFirstRun && !state.hidden) {
      pendingAppear = false;
      widget.appear();
    } else if (!state.hidden) {
      widget.welcomeBack();
    }
    return widget;
  }

  /* ----------------------------------------------------------
     10. LOGICA COCCOLE
     Ogni click fa reagire il companion. Solo le coccole "valide"
     (fuori ricarica e finche' l'obiettivo del giorno non e' pieno)
     danno punti affetto e fanno avanzare la giornata.
     ---------------------------------------------------------- */

  function petActive() {
    var now = nowMs();

    // Prima il cambio giorno: puo' far ruotare il companion del giorno.
    // Solo dopo si legge chi e' l'attivo, altrimenti la prima coccola
    // dopo mezzanotte finirebbe a quello di ieri.
    rollDay();

    var creature = getCreature(state.activeId);
    var rec = ensureOwned(state.activeId);

    var result = {
      creature: creature,
      counted: false,
      cooling: false,
      cooldownMs: 0,
      xpGained: 0,
      dust: 0,
      weekly: null,
      level: levelFor(rec.xp),
      leveledUp: false,
      excited: false,
      dailyPets: state.dailyPets,
      goal: cfg.dailyPetGoal,
      goalJustCompleted: false,
      goalDone: isGoalDone(),
      milestone: null,
      tokenEarned: false,
      streak: state.streak,
      pets: rec.pets + 1
    };

    rec.pets += 1;
    state.lastPetAt = now;

    var left = cooldownLeft();

    if (isGoalDone() || state.dailyPets >= cfg.dailyPetGoal) {
      // Obiettivo gia' raggiunto: coccole extra a volonta', senza premi.
      result.goalDone = true;
    } else if (left > 0) {
      // In ricarica: la coccola non conta, ma il companion reagisce.
      result.cooling = true;
      result.cooldownMs = left;
    } else {
      // Coccola valida.
      result.counted = true;
      state.dailyPets += 1;
      state.lastCountedPetAt = now;

      var beforeLevel = levelFor(rec.xp);
      var gain = Math.min(cfg.xpPerPet, Math.max(0, cfg.maxXpPerDay - state.xpToday));
      rec.xp += gain;
      state.xpToday += gain;
      result.xpGained = gain;

      var afterLevel = levelFor(rec.xp);
      result.level = afterLevel;
      result.leveledUp = afterLevel > beforeLevel;

      if (state.dailyPets >= cfg.dailyPetGoal) {
        var done = completeDailyGoal();
        if (done) {
          result.goalJustCompleted = true;
          result.goalDone = true;
          result.dust = done.dust;
          result.weekly = done.weekly;
          result.streak = done.streak;
          result.milestone = done.milestone;
          result.tokenEarned = done.token;
        }
      }
    }

    result.dailyPets = state.dailyPets;
    result.streak = state.streak;
    result.excited = result.leveledUp || result.goalJustCompleted || (rec.pets % 7 === 0);

    persist();

    emit('companion:pet', {
      id: creature.id,
      name: creature.name,
      pets: rec.pets,
      xp: rec.xp,
      level: result.level,
      counted: result.counted,
      cooling: result.cooling,
      cooldownMs: result.cooldownMs,
      dailyPets: result.dailyPets,
      goal: result.goal,
      goalDone: result.goalDone
    });

    if (result.goalJustCompleted) {
      emit('companion:streak', {
        streak: result.streak,
        dust: result.dust,
        weekly: result.weekly,
        companionId: creature.id
      });

      // Il tuo codice ascolta questo evento e accredita la polvere su Supabase.
      emit('companion:reward', {
        amount: result.dust,
        currency: 'polvere_magica',
        reason: result.weekly ? 'bonus_settimanale' : 'coccola_giornaliera',
        streak: result.streak,
        companionId: creature.id
      });

      if (result.milestone) {
        emit('companion:milestone', {
          days: result.milestone.days,
          dust: result.milestone.dust,
          companionId: creature.id
        });
      }

      if (result.tokenEarned) {
        emit('companion:token', { tokens: state.tokens, max: cfg.recoveryTokenMax });
      }

      if (result.weekly && (result.weekly.item || result.weekly.pack)) {
        // Oggetti e bustina extra: accreditali tu lato app.
        emit('companion:bonus', {
          week: result.weekly.week,
          streak: result.streak,
          item: result.weekly.item,
          pack: result.weekly.pack,
          companionId: creature.id
        });
      }
    }

    if (result.leveledUp) {
      emit('companion:levelup', {
        id: creature.id,
        name: creature.name,
        level: result.level
      });
    }

    return result;
  }

  /* ----------------------------------------------------------
     11. API PUBBLICA
     ---------------------------------------------------------- */

  var Companion = {

    /* --- avvio --- */

    init: function (options) {
      options = options || {};
      var key;
      cfg = {};
      for (key in DEFAULTS) {
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
          cfg[key] = options[key] !== undefined ? options[key] : DEFAULTS[key];
        }
      }
      loadState();
      preloadImages();
      if (!started) attachStorageSync();

      if (cfg.autoStart) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function () {
            mountWidget();
          });
        } else {
          mountWidget();
        }
      }
      started = true;
      return Companion.getActive();
    },

    /* Orologio del server: impedisce di guadagnare polvere spostando
       l'ora del telefono.
       Companion.configureClock({ now: function () { return msDalServer; } }); */
    configureClock: function (adapter) {
      if (adapter && typeof adapter.now === 'function') clock.now = adapter.now;
      if (started && widget) widget.syncStatus();
    },

    /* Rilegge lo stato dall'archivio configurato: chiamalo dopo aver
       scaricato i dati dall'altro dispositivo. */
    sync: function () {
      loadState();
      if (widget) { widget.refresh(); widget.syncStatus(); }
      emit('companion:synced', {
        activeId: state.activeId,
        dailyPets: state.dailyPets,
        streak: state.streak
      });
      return Companion.getStreak();
    },

    /* Suggerimenti costruiti sui dati veri dell'app. Accetta stringhe o
       oggetti { id, text }: con l'id la nuvoletta diventa cliccabile ed
       emette companion:nudgeaction, cosi' puoi portare l'utente sulla
       schermata giusta.
         Companion.setNudges([
           { id: 'prezzi', text: 'una carta della lista e\' scesa del 12%' }
         ]); */
    setNudges: function (list) {
      liveNudges = [];
      if (!list || !list.length) return 0;
      for (var i = 0; i < list.length; i++) {
        var n = list[i];
        if (typeof n === 'string') liveNudges.push({ id: null, text: n });
        else if (n && n.text) liveNudges.push({ id: n.id || null, text: n.text });
      }
      return liveNudges.length;
    },

    /* Promemoria serale. Chiedi il permesso alle notifiche solo dopo un
       gesto dell'utente, altrimenti i browser lo rifiutano. */
    enableReminder: function () {
      state.reminder = true;
      persist();
      try {
        if (global.Notification && global.Notification.permission === 'default') {
          global.Notification.requestPermission();
        }
      } catch (e) { /* niente: il promemoria in pagina funziona lo stesso */ }
      if (widget) widget.scheduleReminder();
      return true;
    },

    disableReminder: function () {
      state.reminder = false;
      persist();
      if (widget && widget.reminderTimer) clearTimeout(widget.reminderTimer);
      return false;
    },

    getReminder: function () {
      return { enabled: !!state.reminder, hour: cfg.reminderHour };
    },

    /* Giorni completati, dal piu' vecchio: pronto per il calendario. */
    getHistory: function () {
      return (state.history || []).slice();
    },

    /* Statistiche del collezionista. */
    getStats: function () {
      var owned = 0, pets = 0, xp = 0, id;
      for (id in state.owned) {
        if (Object.prototype.hasOwnProperty.call(state.owned, id)) {
          owned += 1;
          pets += state.owned[id].pets || 0;
          xp += state.owned[id].xp || 0;
        }
      }
      return {
        owned: owned,
        total: ROSTER.length,
        pets: pets,
        xp: xp,
        streak: state.streak,
        longestStreak: state.longestStreak || 0,
        daysCompleted: state.totalDays || 0,
        tokens: state.tokens || 0,
        milestones: (state.milestonesDone || []).slice(),
        since: state.owned[state.activeId] ? state.owned[state.activeId].unlockedAt : null
      };
    },

    configureStorage: function (adapter) {
      if (adapter && typeof adapter.load === 'function') storage.load = adapter.load;
      if (adapter && typeof adapter.save === 'function') storage.save = adapter.save;
      if (started) loadState();
    },

    /* --- widget d'angolo --- */

    /* Rimette il companion in schermata e ricorda la scelta. */
    showWidget: function () {
      state.hidden = false;
      persist();
      var w = mountWidget();
      emit('companion:visibility', { hidden: false });
      return w;
    },

    /* Toglie il companion dalla schermata e ricorda la scelta:
       resta nascosto anche ricaricando la pagina. */
    hideWidget: function () {
      state.hidden = true;
      persist();
      if (widget) widget.root.classList.add('is-hidden');
      emit('companion:visibility', { hidden: true });
    },

    isHidden: function () {
      return !!state.hidden;
    },

    say: function (text, ms) {
      if (widget) widget.say(text, ms);
    },

    /* --- uso in altre schermate (es. sbusto) --- */

    /* Disegna il companion attivo dentro un elemento qualsiasi.
       Ritorna l'istanza: usa .setPose('excited', 1200) e .destroy(). */
    mount: function (element, options) {
      options = options || {};
      var creature = options.creatureId
        ? getCreature(options.creatureId)
        : getCreature(state.activeId);
      return new CompanionSprite(element, {
        scale: options.scale || cfg.size,
        creature: creature
      });
    },

    /* Fa reagire il companion d'angolo: 'happy' o 'excited', o qualsiasi
       posa per cui la creatura abbia la GIF in spriteImages. */
    react: function (pose, ms) {
      if (widget) widget.sprite.setPose(pose, ms || 1200);
    },

    /* Rigioca la comparsa a sfera. Con creatureId fa comparire quella
       creatura (deve essere posseduta). onDone viene chiamata alla fine. */
    appear: function (options) {
      options = options || {};
      if (options.creatureId && state.owned[options.creatureId]) {
        Companion.setActive(options.creatureId);
      }
      var w = mountWidget();
      w.appear(options.onDone);
      return w;
    },

    /* Fissa un companion: da oggi in poi resta lui, niente rotazione. */
    pin: function (id) {
      if (!getCreature(id) || !state.owned[id]) return false;
      state.pinnedId = id;
      state.dayCompanionDay = null;   // forza il ricalcolo
      rotateDayCompanion();
      state.activeId = id;
      persist();
      if (widget) widget.refresh();
      emit('companion:pinned', { id: id, pinned: true });
      return true;
    },

    /* Torna alla rotazione giornaliera. */
    unpin: function () {
      state.pinnedId = null;
      state.dayCompanionDay = null;
      rotateDayCompanion();
      persist();
      if (widget) widget.refresh();
      emit('companion:pinned', { id: null, pinned: false });
      return true;
    },

    getPinned: function () {
      return state.pinnedId || null;
    },

    /* Di chi e' il turno oggi. */
    getDayCompanion: function () {
      rollDay();
      var c = getCreature(state.dayCompanionId || state.activeId);
      if (!c) return null;
      return {
        id: c.id,
        name: c.name,
        displayName: displayName(c),
        pinned: state.pinnedId === c.id
      };
    },

    /* Ultimi N giorni con l'indicazione di quelli completati: pronto da
       disegnare come calendario. Il piu' recente e' l'ultimo. */
    getCalendar: function (days) {
      var n = days || 35;
      var done = {};
      var history = state.history || [];
      for (var h = 0; h < history.length; h++) done[history[h]] = true;

      var out = [];
      for (var i = n - 1; i >= 0; i--) {
        var key = dayKeyOffset(-i);
        out.push({ key: key, done: !!done[key], today: i === 0 });
      }
      return out;
    },

    /* Disegna il companion su un canvas qualsiasi: serve per la cartolina.
       Passa un'immagine gia' caricata in options.image, altrimenti usa
       quella del widget. Il percorso e' in getActive().image. */
    drawTo: function (ctx, options) {
      options = options || {};
      var creature = getCreature(options.creatureId || state.activeId);
      if (!ctx || !creature) return false;

      var scale = options.scale || 4;
      var x = options.x || 0;
      var y = options.y || 0;

      ctx.imageSmoothingEnabled = false;

      var img = options.image || (widget && widget.sprite && widget.sprite.img);
      if (!img || img.complete === false) return false;

      try {
        ctx.drawImage(img, x, y, 16 * scale, 16 * scale);
        return true;
      } catch (e) {
        return false;
      }
    },

    /* Nomignolo scelto dall'utente. Stringa vuota = torna al nome originale. */
    setNickname: function (id, nickname) {
      var creature = getCreature(id);
      if (!creature || !state.owned[id]) return false;

      var clean = String(nickname === null || nickname === undefined ? '' : nickname)
        .replace(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, cfg.nicknameMaxLength);

      if (clean) state.owned[id].nickname = clean;
      else delete state.owned[id].nickname;

      persist();
      if (widget) widget.refresh();
      emit('companion:renamed', { id: id, name: creature.name, nickname: clean || null });
      return true;
    },

    getNickname: function (id) {
      var rec = state.owned[id];
      return (rec && rec.nickname) || null;
    },

    /* Coccola da codice (stessa logica del click sul widget). */
    pet: function () {
      if (widget) {
        widget.pet();
        return Companion.getStreak();
      }
      petActive();
      return Companion.getStreak();
    },

    /* --- dati --- */

    getActive: function () {
      var creature = getCreature(state.activeId);
      var rec = ensureOwned(state.activeId);
      return {
        id: creature.id,
        name: creature.name,
        nickname: rec.nickname || null,
        displayName: displayName(creature),
        image: creature.spriteImages ? (creature.spriteImages.idle || null) : null,
        icon: iconUrl(creature),
        pinned: state.pinnedId === creature.id,
        rarity: creature.rarity,
        xp: rec.xp,
        pets: rec.pets,
        level: levelFor(rec.xp),
        mood: currentMood()
      };
    },

    /* Stato della giornata e della streak: usalo per disegnare la tua UI. */
    getStreak: function () {
      rollDay();
      var done = isGoalDone();
      var left = cooldownLeft();
      var next = projectedStreak();
      return {
        streak: state.streak,
        goal: cfg.dailyPetGoal,
        dailyPets: state.dailyPets,
        remaining: Math.max(0, cfg.dailyPetGoal - state.dailyPets),
        completedToday: done,
        cooling: !done && left > 0,
        nextPetInMs: done ? 0 : left,
        progress: dotsFor(state.dailyPets, cfg.dailyPetGoal),
        dustToday: (done && state.lastDustDay === todayKey() &&
                    typeof state.lastDust === 'number') ? state.lastDust : 0,
        dustIfCompleted: dustForStreak(next) +
          ((cfg.weeklyEvery > 0 && next % cfg.weeklyEvery === 0) ? cfg.weeklyDust : 0),
        tokens: state.tokens || 0,
        tokensMax: cfg.recoveryTokenMax,
        nextMilestone: (function () {
          var days = Object.keys(cfg.milestones || {}).map(Number).sort(function (a, b) { return a - b; });
          for (var i = 0; i < days.length; i++) {
            if (days[i] > state.streak) return days[i];
          }
          return null;
        })(),
        daysToWeeklyBonus: cfg.weeklyEvery > 0
          ? (cfg.weeklyEvery - (next % cfg.weeklyEvery)) % cfg.weeklyEvery
          : null
      };
    },

    /* Tutte le creature con lo stato di possesso. A differenza di getDex,
       nome e rarita' restano visibili anche per quelle che non hai:
       serve dove vuoi mostrare l'elenco completo. */
    getRoster: function () {
      var dex = Companion.getDex();
      return ROSTER.map(function (c, i) {
        var voce = dex[i];
        return {
          id: c.id,
          number: voce.number,
          name: c.name,
          rarity: c.rarity,
          nickname: voce.nickname,
          displayName: voce.displayName || c.name,
          image: voce.image,
          icon: voce.icon,
          status: voce.status,
          owned: voce.owned,
          active: voce.active,
          pinned: voce.pinned,
          level: voce.level,
          pets: voce.pets,
          unlockedAt: voce.unlockedAt
        };
      });
    },


    setActive: function (id) {
      if (!getCreature(id) || !state.owned[id]) return false;
      state.activeId = id;
      persist();
      if (widget) widget.refresh();
      emit('companion:changed', { id: id });
      return true;
    },

    /* --- sblocchi e drop --- */

    unlock: function (id) {
      var creature = getCreature(id);
      if (!creature) return null;
      if (state.owned[id]) return { id: id, name: creature.name, duplicate: true };
      ensureOwned(id);
      assignSlot(id);
      persist();
      if (creature.rarity === 'leggendario') screenFlash(560);
      emit('companion:unlocked', { id: id, name: creature.name, rarity: creature.rarity });
      return { id: id, name: creature.name, duplicate: false };
    },

    /* Tira per un drop. Chiamalo alla fine di una bustina.
       Ritorna null se non esce nulla. */
    rollDrop: function (chance) {
      var p = typeof chance === 'number' ? chance : cfg.dropChance;
      if (Math.random() > p) return null;

      var locked = ROSTER.filter(function (c) { return !state.owned[c.id]; });
      if (!locked.length) return null;

      var chosen = weightedPick(locked);
      return Companion.unlock(chosen.id);
    },

    /* Indirizzo del foglio della miniatura, o null se non configurato. */
    getIconUrl: function (id) {
      return iconUrl(getCreature(id));
    },

    /* Assegna le miniature una per una, quando gli indirizzi non seguono
       uno schema fisso (per esempio i link firmati di Supabase):
         Companion.setIcons({ bulbasaur: 'https://.../abc.png?token=...' });
       Passa null per un id per tornare all'indirizzo automatico. */
    setIcons: function (map) {
      if (!map) { iconOverrides = {}; return 0; }
      for (var id in map) {
        if (Object.prototype.hasOwnProperty.call(map, id)) {
          if (map[id]) iconOverrides[id] = map[id];
          else delete iconOverrides[id];
        }
      }
      if (widget) widget.syncStatus();
      emit('companion:icons', { count: Object.keys(iconOverrides).length });
      return Object.keys(iconOverrides).length;
    },

    /* Elenco delle scatole: nome, sfondo e quanti companion contiene. */
    getBoxes: function () {
      ensureBoxState();
      var counts = [];
      var i, id;
      for (i = 0; i < cfg.boxCount; i++) counts[i] = 0;
      for (id in state.boxSlots) {
        if (Object.prototype.hasOwnProperty.call(state.boxSlots, id) && state.owned[id]) {
          counts[state.boxSlots[id].box] += 1;
        }
      }
      return state.boxNames.slice(0, cfg.boxCount).map(function (name, index) {
        return {
          index: index,
          name: name,
          wallpaper: state.boxWalls[index],
          wallpaperName: cfg.wallpapers[state.boxWalls[index]] || '',
          count: counts[index],
          size: cfg.boxSize
        };
      });
    },

    /* Il contenuto di una scatola: tutti i posti, vuoti compresi. */
    getBox: function (index) {
      ensureBoxState();
      var b = clamp(index || 0, 0, cfg.boxCount - 1);
      var slots = [];

      for (var i = 0; i < cfg.boxSize; i++) {
        var id = slotTaken(b, i);
        var creature = id && state.owned[id] ? getCreature(id) : null;
        slots.push(creature ? {
          slot: i,
          id: creature.id,
          name: creature.name,
          displayName: displayName(creature),
          image: creature.spriteImages ? (creature.spriteImages.idle || null) : null,
          icon: iconUrl(creature),
          iconFrames: cfg.iconFrames,
          level: levelFor(state.owned[creature.id].xp),
          rarity: creature.rarity,
          active: state.activeId === creature.id,
          pinned: state.pinnedId === creature.id
        } : { slot: i, id: null });
      }

      var occupati = 0;
      for (var k = 0; k < slots.length; k++) {
        if (slots[k].id) occupati += 1;
      }

      return {
        index: b,
        name: state.boxNames[b],
        wallpaper: state.boxWalls[b],
        wallpaperName: cfg.wallpapers[state.boxWalls[b]] || '',
        columns: cfg.boxColumns,
        size: cfg.boxSize,
        count: occupati,
        slots: slots
      };
    },

    /* Rinomina una scatola. */
    setBoxName: function (index, name) {
      ensureBoxState();
      var b = clamp(index || 0, 0, cfg.boxCount - 1);
      var clean = String(name || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 14);
      state.boxNames[b] = clean || ('Scatola ' + (b + 1));
      persist();
      emit('companion:box', { index: b, name: state.boxNames[b] });
      return state.boxNames[b];
    },

    /* Cambia lo sfondo di una scatola. */
    setBoxWallpaper: function (index, wallpaper) {
      ensureBoxState();
      var b = clamp(index || 0, 0, cfg.boxCount - 1);
      state.boxWalls[b] = clamp(wallpaper || 0, 0, cfg.wallpapers.length - 1);
      persist();
      emit('companion:box', { index: b, wallpaper: state.boxWalls[b] });
      return state.boxWalls[b];
    },

    /* Sposta un companion in un altro posto. Se il posto e' occupato,
       i due si scambiano, come quando trascini una miniatura sull'altra. */
    moveCompanion: function (id, box, slot) {
      ensureBoxState();
      if (!state.owned[id]) return false;

      var b = clamp(box, 0, cfg.boxCount - 1);
      var sIdx = clamp(slot, 0, cfg.boxSize - 1);
      var other = slotTaken(b, sIdx);
      var from = state.boxSlots[id];

      if (other === id) return true;
      if (other && from) state.boxSlots[other] = { box: from.box, slot: from.slot };
      else if (other) delete state.boxSlots[other];

      state.boxSlots[id] = { box: b, slot: sIdx };
      persist();
      emit('companion:moved', { id: id, box: b, slot: sIdx, swappedWith: other || null });
      return true;
    },

    /* Il catalogo completo, pronto da disegnare. Ogni voce ha:
         number      numero di catalogo (1, 2, 3...)
         status      'trovato' | 'sconosciuto'
         name        null finche' non l'hai trovata
         dex, where  testo della voce e indizio, solo se e' tua
         image       percorso della GIF, solo se e' tua                  */
    getDex: function () {
      return ROSTER.map(function (c, i) {
        var rec = state.owned[c.id];
        var owned = !!rec;

        return {
          id: c.id,
          number: i + 1,
          status: owned ? 'trovato' : 'sconosciuto',
          owned: owned,
          name: owned ? c.name : null,
          displayName: owned ? displayName(c) : null,
          nickname: owned ? (rec.nickname || null) : null,
          rarity: owned ? c.rarity : null,
          dex: owned ? (c.dex || null) : null,
          where: owned ? (c.where || null) : null,
          image: owned ? (c.spriteImages ? (c.spriteImages.idle || null) : null) : null,
          icon: owned ? iconUrl(c) : null,
          iconFrames: cfg.iconFrames,
          level: owned ? levelFor(rec.xp) : 0,
          pets: owned ? (rec.pets || 0) : 0,
          active: state.activeId === c.id,
          pinned: state.pinnedId === c.id,
          unlockedAt: owned ? (rec.unlockedAt || null) : null
        };
      });
    },

    /* Riepilogo del catalogo: quante ne hai trovate sul totale. */
    getDexProgress: function () {
      var owned = 0;
      ROSTER.forEach(function (c) {
        if (state.owned[c.id]) owned += 1;
      });
      return { owned: owned, total: ROSTER.length };
    },

    /* --- manutenzione --- */

    reset: function () {
      state = blankState();
      persist();
      loadState();
      if (widget) widget.refresh();
    },

    /* --- scorciatoie di prova (solo per il banco di prova) --- */

    dev: {
      /* Toglie la ricarica: la prossima coccola conta subito. */
      clearCooldown: function () {
        state.lastCountedPetAt = null;
        persist();
        if (widget) { widget.renderTokens(false); widget.syncStatus(); }
        return Companion.getStreak();
      },
      /* Imposta le coccole valide di oggi (0..goal). */
      setDailyPets: function (n) {
        rollDay();
        state.dailyPets = clamp(n, 0, cfg.dailyPetGoal);
        state.lastCountedPetAt = null;
        if (state.dailyPets < cfg.dailyPetGoal) state.goalDay = null;
        else completeDailyGoal();
        persist();
        if (widget) { widget.renderTokens(false); widget.syncStatus(); }
        return Companion.getStreak();
      },
      /* Finge N giorni di streak chiusi ieri: la prossima giornata vale N+1. */
      setStreak: function (n) {
        state.streak = Math.max(0, n);
        state.streakDay = n > 0 ? yesterdayKey() : null;
        state.goalDay = null;
        state.dailyPets = 0;
        state.petDay = todayKey();
        state.lastCountedPetAt = null;
        persist();
        if (widget) { widget.renderTokens(false); widget.syncStatus(); }
        return Companion.getStreak();
      },
      /* Gettoni di recupero in tasca. */
      setTokens: function (n) {
        state.tokens = clamp(n, 0, cfg.recoveryTokenMax);
        persist();
        return Companion.getStreak();
      },
      /* Finge un giorno saltato: l'ultima giornata chiusa e' l'altro ieri.
         Con un gettone in tasca la streak si salva da sola. */
      skipDay: function () {
        state.streakDay = dayKeyOffset(-2);
        state.goalDay = null;
        state.dailyPets = 0;
        state.petDay = todayKey();
        persist();
        return Companion.getStreak();
      },
      /* Finge un'assenza di N giorni, per provare il rientro. */
      awayDays: function (n) {
        state.lastPetAt = nowMs() - n * 86400000;
        state.lastWelcomeDay = null;
        persist();
        if (widget) widget.welcomeBack();
        return n;
      },
      /* Lampo a schermo intero, per provarlo senza avere un leggendario. */
      flash: function () {
        screenFlash(560);
      },
      /* Fa passare un giorno: utile per vedere la rotazione del companion
         del giorno senza aspettare domani. */
      nextDay: function () {
        if (!devBaseClock) devBaseClock = clock.now;
        dev_offset += 86400000;
        clock.now = function () { return devBaseClock() + dev_offset; };
        rollDay();
        if (widget) { widget.refresh(); widget.syncStatus(); }
        return Companion.getDayCompanion();
      },
      /* Fa scattare subito il promemoria serale. */
      fireReminder: function () {
        if (widget) widget.fireReminder();
      },
      /* Spezza la streak come se avessi saltato un giorno. */
      breakStreak: function () {
        state.streak = 0;
        state.streakDay = null;
        state.goalDay = null;
        state.dailyPets = 0;
        state.milestonesDone = [];   // come nella rottura vera
        persist();
        if (widget) { widget.renderTokens(false); widget.syncStatus(); }
        return Companion.getStreak();
      }
    },

    _state: function () { return state; }
  };

  global.Companion = Companion;

})(window);
