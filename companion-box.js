/* ============================================================
   COMPANION BOX — deposito e scheda dei companion
   Progetto: cardsync-pocket-repo
   Vanilla JS, nessuna dipendenza. Va caricato DOPO companion.js.

   Uso:
     <link rel="stylesheet" href="companion.css">
     <link rel="stylesheet" href="companion-box.css">
     <script src="companion.js"></script>
     <script src="companion-box.js"></script>
     <script>
       Companion.init();
       // apri il box da un tuo pulsante:
       CompanionBox.open();
     </script>

   Legge tutto dall'API pubblica di companion.js: non tocca lo stato
   direttamente, quindi puoi riscriverne la grafica senza rischi.
   ============================================================ */

(function (global) {
  'use strict';

  if (!global.Companion) {
    if (global.console) global.console.warn('companion-box.js va caricato dopo companion.js');
    return;
  }

  var Companion = global.Companion;

  var root = null;      // contenitore dell'overlay
  var selectedId = null;
  var lastFocus = null;

  /* ----------------------------------------------------------
     1. UTILITY
     ---------------------------------------------------------- */

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  // 3 -> "003": il numero di catalogo si legge meglio a larghezza fissa.
  function padNumber(n) {
    var s = String(n);
    while (s.length < 3) s = '0' + s;
    return s;
  }

  function formatDate(ms) {
    if (!ms) return '—';
    var d = new Date(ms);
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  }

  // "2026-8-30" -> 30
  function dayNumber(key) {
    var parts = String(key).split('-');
    return parts[2] || '';
  }

  /* ----------------------------------------------------------
     2. COSTRUZIONE
     ---------------------------------------------------------- */

  function build() {
    root = el('div', 'cbox is-hidden');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Box dei companion');

    var backdrop = el('div', 'cbox-backdrop');
    var panel = el('div', 'cbox-panel');

    var head = el('div', 'cbox-head');

    var lens = el('div', 'cbox-lens');
    lens.setAttribute('aria-hidden', 'true');
    lens.appendChild(el('span', 'cbox-lens-glint'));
    head.appendChild(lens);

    var leds = el('div', 'cbox-leds');
    leds.setAttribute('aria-hidden', 'true');
    ['is-red', 'is-yellow', 'is-green'].forEach(function (c) {
      leds.appendChild(el('span', 'cbox-led ' + c));
    });
    head.appendChild(leds);

    head.appendChild(el('h2', 'cbox-title', 'Box'));

    var close = el('button', 'cbox-close', '\u00D7');
    close.type = 'button';
    close.setAttribute('aria-label', 'Chiudi il box');
    head.appendChild(close);

    var tabs = el('div', 'cbox-tabs');
    var tabNames = [
      { id: 'squadra', label: 'Dex' },
      { id: 'scheda', label: 'Deposito' },
      { id: 'diario', label: 'Diario' }
    ];
    tabNames.forEach(function (t) {
      var b = el('button', 'cbox-tab', t.label);
      b.type = 'button';
      b.setAttribute('data-tab', t.id);
      tabs.appendChild(b);
    });

    var body = el('div', 'cbox-body');
    var viewSquadra = el('div', 'cbox-view', '');
    viewSquadra.setAttribute('data-view', 'squadra');
    var viewScheda = el('div', 'cbox-view is-off', '');
    viewScheda.setAttribute('data-view', 'scheda');
    var viewDiario = el('div', 'cbox-view is-off', '');
    viewDiario.setAttribute('data-view', 'diario');

    body.appendChild(viewSquadra);
    body.appendChild(viewScheda);
    body.appendChild(viewDiario);

    // --- meta' sinistra: schermo, altoparlante, comandi ---
    var left = el('div', 'cbox-left');
    left.appendChild(head);
    left.appendChild(tabs);
    left.appendChild(body);

    var controls = el('div', 'cbox-controls');

    var pad = el('div', 'cbox-pad');
    [['up', '\u25B2', 'Su'], ['left', '\u25C0', 'Sinistra'],
     ['right', '\u25B6', 'Destra'], ['down', '\u25BC', 'Giu']].forEach(function (d) {
      var b = el('button', 'cbox-pad-btn is-' + d[0], d[1]);
      b.type = 'button';
      b.setAttribute('data-pad', d[0]);
      b.setAttribute('aria-label', d[2]);
      pad.appendChild(b);
    });
    pad.appendChild(el('span', 'cbox-pad-center'));
    controls.appendChild(pad);

    var grille = el('div', 'cbox-grille');
    grille.setAttribute('aria-hidden', 'true');
    for (var g = 0; g < 6; g++) grille.appendChild(el('span'));
    controls.appendChild(grille);

    var green = el('button', 'cbox-green', 'A');
    green.type = 'button';
    green.setAttribute('aria-label', 'Portalo con te');
    controls.appendChild(green);

    left.appendChild(controls);

    // --- meta' destra: schermo corto e dieci tasti azzurri ---
    var right = el('div', 'cbox-right');

    var sub = el('div', 'cbox-sub');
    sub.setAttribute('data-sub', '1');
    right.appendChild(sub);

    var keys = el('div', 'cbox-keys');
    for (var k = 1; k <= 10; k++) {
      var kb = el('button', 'cbox-key', String(k));
      kb.type = 'button';
      kb.setAttribute('data-key', String(k));
      kb.setAttribute('aria-label', 'Voce numero ' + k);
      keys.appendChild(kb);
    }
    right.appendChild(keys);

    var longs = el('div', 'cbox-longs');
    longs.setAttribute('aria-hidden', 'true');
    longs.appendChild(el('span', 'cbox-long is-red'));
    longs.appendChild(el('span', 'cbox-long is-white'));
    right.appendChild(longs);

    panel.appendChild(left);
    panel.appendChild(right);
    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);

    // croce direzionale: scorre le voci del Dex o cambia scatola
    pad.addEventListener('click', function (e) {
      var dir = e.target.getAttribute && e.target.getAttribute('data-pad');
      if (dir) movePad(dir);
    });

    green.addEventListener('click', function () {
      var id = selectedId || Companion.getActive().id;
      if (Companion.getActive().id === id) return;
      var owned = false;
      Companion.getDex().forEach(function (c) { if (c.id === id && c.owned) owned = true; });
      if (owned) Companion.setActive(id);
    });

    keys.addEventListener('click', function (e) {
      var n = e.target.getAttribute && e.target.getAttribute('data-key');
      if (!n) return;
      var entry = Companion.getDex()[Number(n) - 1];
      if (entry && entry.owned) {
        selectedId = entry.id;
        showTab('squadra');
        render();
      }
    });

    close.addEventListener('click', CompanionBox.close);
    backdrop.addEventListener('click', CompanionBox.close);

    tabs.addEventListener('click', function (e) {
      var id = e.target.getAttribute && e.target.getAttribute('data-tab');
      if (id) showTab(id);
    });

    document.addEventListener('keydown', function (e) {
      if (!root || root.classList.contains('is-hidden')) return;

      if (e.key === 'Escape') { CompanionBox.close(); return; }

      // Le frecce muovono come la croce, ma solo se non stai scrivendo.
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      if (map[e.key]) {
        e.preventDefault();
        movePad(map[e.key]);
      }
    });

    // Se il companion cambia mentre il box e' aperto, si riallinea.
    ['changed', 'renamed', 'unlocked', 'pinned', 'streak', 'pet', 'dayCompanion',
     'synced', 'box', 'moved']
      .forEach(function (name) {
        document.addEventListener('companion:' + name, function () {
          if (root && !root.classList.contains('is-hidden')) render();
        });
      });

    return root;
  }

  // Croce direzionale: nel Dex scorre l'elenco, nel Deposito cambia scatola.
  function movePad(dir) {
    var onDex = !root.querySelector('[data-view="squadra"]').classList.contains('is-off');

    if (onDex) {
      var dex = Companion.getDex().filter(function (c) { return c.owned; });
      if (!dex.length) return;
      var i = 0;
      dex.forEach(function (c, index) { if (c.id === selectedId) i = index; });
      if (dir === 'up' || dir === 'left') i -= 1;
      if (dir === 'down' || dir === 'right') i += 1;
      i = (i + dex.length) % dex.length;
      selectedId = dex[i].id;
      render();
      return;
    }

    var onBox = !root.querySelector('[data-view="scheda"]').classList.contains('is-off');
    if (onBox) {
      var total = Companion.getBoxes().length;
      if (dir === 'left' || dir === 'up') currentBox = (currentBox - 1 + total) % total;
      if (dir === 'right' || dir === 'down') currentBox = (currentBox + 1) % total;
      render();
    }
  }

  // Lo schermo corto di destra: il riepilogo sempre sotto gli occhi.
  function renderSub() {
    var sub = root.querySelector('[data-sub]');
    if (!sub) return;

    var dexProgress = Companion.getDexProgress();
    var streak = Companion.getStreak();

    sub.innerHTML = '';
    sub.appendChild(el('span', 'cbox-sub-label', 'Trovati'));
    sub.appendChild(el('b', 'cbox-sub-big', dexProgress.owned + '/' + dexProgress.total));
    sub.appendChild(el('span', 'cbox-sub-label', 'Streak'));
    sub.appendChild(el('b', null, String(streak.streak)));
    sub.appendChild(el('span', 'cbox-sub-label', 'Oggi'));
    sub.appendChild(el('b', null, streak.progress));

    // i tasti oltre il numero di voci restano spenti
    var dex = Companion.getDex();
    var keys = root.querySelectorAll('.cbox-key');
    for (var i = 0; i < keys.length; i++) {
      var entry = dex[i];
      var on = !!(entry && entry.owned);
      keys[i].disabled = !on;
      keys[i].classList.toggle('is-on', on);
    }
  }

  function showTab(id) {
    var tabs = root.querySelectorAll('.cbox-tab');
    var views = root.querySelectorAll('.cbox-view');
    var i;
    for (i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('is-on', tabs[i].getAttribute('data-tab') === id);
    }
    for (i = 0; i < views.length; i++) {
      views[i].classList.toggle('is-off', views[i].getAttribute('data-view') !== id);
    }
  }

  /* ----------------------------------------------------------
     3. SQUADRA
     ---------------------------------------------------------- */

  // Disegna la creatura dentro una cella: immagine se e' tua, punto
  // interrogativo se non l'hai ancora trovata.
  function artFor(entry) {
    var art = el('div', 'cbox-art');

    if (!entry.owned) {
      art.appendChild(el('span', 'cbox-art-unknown', '?'));
      return art;
    }

    var img = el('img', 'cbox-art-img');
    img.src = entry.image || '';
    img.alt = '';
    art.appendChild(img);
    return art;
  }

  /* ----------------------------------------------------------
     3. DEX
     Elenco numerato a sinistra, scheda dati a destra: la struttura
     dell'originale, dove la voce e' completa solo per chi hai davvero.
     ---------------------------------------------------------- */

  function renderSquadra(view) {
    view.innerHTML = '';

    var progress = Companion.getDexProgress();
    var bar = el('div', 'cbox-dexbar');
    bar.appendChild(el('span', null, 'Catalogo'));
    bar.appendChild(el('b', null, 'Trovati ' + progress.owned + ' su ' + progress.total));
    view.appendChild(bar);

    var split = el('div', 'cbox-split');
    var list = el('div', 'cbox-list');
    var detail = el('div', 'cbox-detail');

    var dex = Companion.getDex();
    if (!selectedId) selectedId = Companion.getActive().id;

    dex.forEach(function (c) {
      var row = el('button', 'cbox-listrow' + (c.owned ? ' is-owned' : ' is-unknown'));
      row.type = 'button';
      row.disabled = !c.owned;
      if (c.id === selectedId) row.classList.add('is-selected');

      row.appendChild(el('span', 'cbox-mark' + (c.owned ? ' is-on' : '')));
      row.appendChild(el('span', 'cbox-num', padNumber(c.number)));
      row.appendChild(el('span', 'cbox-listname', c.owned ? c.displayName : '----------'));

      row.addEventListener('click', function () {
        selectedId = c.id;
        render();
      });
      list.appendChild(row);
    });

    var entry = null;
    dex.forEach(function (c) { if (c.id === selectedId) entry = c; });
    renderEntry(detail, entry);

    split.appendChild(list);
    split.appendChild(detail);
    view.appendChild(split);
  }

  // La scheda dati: immagine, numero, nome, categoria, misure, descrizione.
  function renderEntry(detail, entry) {
    detail.innerHTML = '';

    if (!entry || !entry.owned) {
      var vuoto = el('div', 'cbox-card');
      vuoto.appendChild(artFor({ owned: false }));
      var vi = el('div', 'cbox-card-info');
      vi.appendChild(el('span', 'cbox-num', entry ? ('N. ' + padNumber(entry.number)) : ''));
      vi.appendChild(el('h3', null, '???'));
      vi.appendChild(el('p', 'cbox-note', 'Nessun dato. La voce si compila quando lo trovi.'));
      vuoto.appendChild(vi);
      detail.appendChild(vuoto);
      return;
    }

    var card = el('div', 'cbox-card');
    var art = el('div', 'cbox-card-art');
    art.appendChild(artFor(entry).firstChild);
    card.appendChild(art);

    var info = el('div', 'cbox-card-info');
    info.appendChild(el('span', 'cbox-num', 'N. ' + padNumber(entry.number)));
    info.appendChild(el('h3', null, entry.displayName));
    info.appendChild(el('p', 'cbox-species',
      (entry.nickname ? entry.name + ' · ' : '') + entry.rarity));
    card.appendChild(info);
    detail.appendChild(card);

    // Le "misure" della voce originale, tradotte in quello che qui conta.
    var misure = el('div', 'cbox-measures');
    [
      ['Affetto', 'livello ' + entry.level],
      ['Coccole', String(entry.pets)],
      ['Con te dal', formatDate(entry.unlockedAt)],
      ['Provenienza', entry.where || '—']
    ].forEach(function (row) {
      var r = el('div', 'cbox-measure');
      r.appendChild(el('span', 'cbox-stat-label', row[0]));
      r.appendChild(el('b', null, row[1]));
      misure.appendChild(r);
    });
    detail.appendChild(misure);

    if (entry.dex) detail.appendChild(el('p', 'cbox-dex', entry.dex));

    // Nomignolo
    var renameRow = el('div', 'cbox-row');
    var input = el('input', 'cbox-input');
    input.type = 'text';
    input.maxLength = 16;
    input.placeholder = 'nomignolo';
    input.value = entry.nickname || '';
    var save = el('button', 'cbox-btn', 'Salva il nome');
    save.type = 'button';
    save.addEventListener('click', function () { Companion.setNickname(entry.id, input.value); });
    renameRow.appendChild(input);
    renameRow.appendChild(save);
    detail.appendChild(renameRow);

    // Azioni
    var actions = el('div', 'cbox-row');
    var take = el('button', 'cbox-btn', 'Portalo con te');
    take.type = 'button';
    take.disabled = entry.active;
    take.addEventListener('click', function () { Companion.setActive(entry.id); });
    actions.appendChild(take);

    var pin = el('button', 'cbox-btn', entry.pinned ? 'Liberalo dalla rotazione' : 'Fissalo sempre');
    pin.type = 'button';
    pin.addEventListener('click', function () {
      if (entry.pinned) Companion.unpin();
      else Companion.pin(entry.id);
    });
    actions.appendChild(pin);
    detail.appendChild(actions);
  }

  /* ----------------------------------------------------------
     4. DEPOSITO
     Scatole con nome e sfondo, una griglia di posti fissi e la
     fascia della squadra in alto: preleva e deposita come nel PC.
     ---------------------------------------------------------- */

  var currentBox = 0;
  var holding = null;   // companion "in mano", in attesa di un posto
  // Miniatura animata: il foglio ha i fotogrammi in fila e l'animazione CSS
  // li alterna. Senza foglio si ripiega sulla GIF della creatura.
  function iconFor(entry, extraClass) {
    var box = el('div', 'cbox-icon' + (extraClass ? ' ' + extraClass : ''));

    if (entry.icon) {
      box.classList.add('is-sheet');
      box.style.backgroundImage = 'url("' + entry.icon + '")';
      box.style.backgroundSize = ((entry.iconFrames || 2) * 100) + '% 100%';
    } else if (entry.image) {
      box.style.backgroundImage = 'url("' + entry.image + '")';
      box.style.backgroundSize = 'contain';
    }
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', entry.displayName || '');
    return box;
  }

  function renderScheda(view) {
    view.innerHTML = '';

    var box = Companion.getBox(currentBox);
    var active = Companion.getActive();

    // il pannello di sinistra segue il companion scelto nella griglia
    var scelto = null;
    box.slots.forEach(function (s) { if (s.id && s.id === selectedId) scelto = s; });
    if (!scelto) box.slots.forEach(function (s) { if (!scelto && s.id) scelto = s; });

    var pc = el('div', 'cbox-pc');

    /* --- colonna sinistra: la scheda di chi e' selezionato --- */

    var side = el('div', 'cbox-pc-side');

    var nameBar = el('div', 'cbox-pc-name');
    nameBar.appendChild(el('span', null, scelto ? scelto.displayName : '\u2014'));
    if (scelto && scelto.active) nameBar.appendChild(el('span', 'cbox-pc-flag', 'squadra'));
    else if (scelto && scelto.pinned) nameBar.appendChild(el('span', 'cbox-pc-flag', 'fissato'));
    side.appendChild(nameBar);

    var portrait = el('div', 'cbox-pc-portrait');
    if (scelto && scelto.image) {
      var big = el('img', 'cbox-pc-sprite');
      big.src = scelto.image;
      big.alt = scelto.displayName;
      portrait.appendChild(big);
    }
    side.appendChild(portrait);

    var rows = el('div', 'cbox-pc-rows');

    var lvl = el('div', 'cbox-pc-row');
    lvl.appendChild(el('b', null, scelto ? ('Liv. ' + scelto.level) : '\u2014'));
    rows.appendChild(lvl);

    var tag = el('div', 'cbox-pc-row');
    if (scelto) tag.appendChild(el('span', 'cbox-chip', scelto.rarity));
    rows.appendChild(tag);

    var pos = el('div', 'cbox-pc-row is-dim');
    pos.appendChild(el('span', null, scelto
      ? (box.name + ' \u00B7 posto ' + (scelto.slot + 1))
      : 'nessuna selezione'));
    rows.appendChild(pos);

    side.appendChild(rows);
    pc.appendChild(side);

    /* --- colonna destra: la scatola --- */

    var main = el('div', 'cbox-pc-main');

    var head = el('div', 'cbox-boxhead');

    var prev = el('button', 'cbox-arrow', '\u25C0');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Scatola precedente');
    prev.addEventListener('click', function () {
      var total = Companion.getBoxes().length;
      currentBox = (currentBox - 1 + total) % total;
      render();
    });

    var nameInput = el('input', 'cbox-boxname');
    nameInput.type = 'text';
    nameInput.maxLength = 14;
    nameInput.value = box.name;
    nameInput.setAttribute('aria-label', 'Nome della scatola');
    nameInput.addEventListener('change', function () {
      Companion.setBoxName(currentBox, nameInput.value);
      render();
    });

    var next = el('button', 'cbox-arrow', '\u25B6');
    next.type = 'button';
    next.setAttribute('aria-label', 'Scatola successiva');
    next.addEventListener('click', function () {
      var total = Companion.getBoxes().length;
      currentBox = (currentBox + 1) % total;
      render();
    });

    head.appendChild(prev);
    head.appendChild(nameInput);
    head.appendChild(next);
    main.appendChild(head);

    var grid = el('div', 'cbox-boxgrid is-wall-' + box.wallpaper);
    grid.style.gridTemplateColumns = 'repeat(' + box.columns + ', 1fr)';

    box.slots.forEach(function (s) {
      var cell = el('button', 'cbox-slot');
      cell.type = 'button';
      if (!s.id) cell.classList.add('is-empty');
      if (s.active) cell.classList.add('is-active');
      if (s.id && s.id === selectedId) cell.classList.add('is-selected');
      if (holding && s.id === holding) cell.classList.add('is-held');

      if (s.id) {
        cell.appendChild(iconFor(s));
        cell.title = s.displayName + ' \u00B7 liv. ' + s.level;
      } else {
        cell.setAttribute('aria-label', 'Posto libero');
      }

      cell.addEventListener('click', function () {
        if (holding) {
          Companion.moveCompanion(holding, currentBox, s.slot);
          holding = null;
        } else if (s.id) {
          // primo tocco: lo guardi nella scheda. secondo: lo prendi in mano.
          if (selectedId === s.id) holding = s.id;
          else selectedId = s.id;
        }
        render();
      });

      grid.appendChild(cell);
    });
    main.appendChild(grid);

    var stato = el('p', 'cbox-note');
    stato.textContent = holding
      ? 'In mano: tocca un posto per lasciarlo.'
      : (box.count + ' su ' + box.size + ' posti occupati.');
    main.appendChild(stato);

    /* --- barra dei comandi in fondo --- */

    var footer = el('div', 'cbox-pc-footer');

    var party = el('button', 'cbox-btn', 'Squadra: ' + active.displayName);
    party.type = 'button';
    party.disabled = !scelto || scelto.active;
    party.addEventListener('click', function () {
      if (scelto) Companion.setActive(scelto.id);
    });
    footer.appendChild(party);

    if (holding) {
      var drop = el('button', 'cbox-btn', 'Lascialo stare');
      drop.type = 'button';
      drop.addEventListener('click', function () { holding = null; render(); });
      footer.appendChild(drop);
    } else {
      var esci = el('button', 'cbox-btn', 'Chiudi');
      esci.type = 'button';
      esci.addEventListener('click', CompanionBox.close);
      footer.appendChild(esci);
    }

    main.appendChild(footer);

    var walls = el('div', 'cbox-walls');
    for (var w = 0; w < 6; w++) {
      (function (index) {
        var swatch = el('button', 'cbox-wall is-wall-' + index +
          (box.wallpaper === index ? ' is-on' : ''));
        swatch.type = 'button';
        swatch.setAttribute('aria-label', 'Sfondo ' + (index + 1));
        swatch.addEventListener('click', function () {
          Companion.setBoxWallpaper(currentBox, index);
          render();
        });
        walls.appendChild(swatch);
      })(w);
    }
    main.appendChild(walls);

    pc.appendChild(main);
    view.appendChild(pc);
  }

  function renderDiario(view) {
    view.innerHTML = '';

    var stats = Companion.getStats();
    var streak = Companion.getStreak();

    var list = el('div', 'cbox-stats');
    [
      ['Streak attuale', streak.streak + (streak.streak === 1 ? ' giorno' : ' giorni')],
      ['Streak piu\' lunga', stats.longestStreak + (stats.longestStreak === 1 ? ' giorno' : ' giorni')],
      ['Giornate complete', stats.daysCompleted],
      ['Coccole totali', stats.pets],
      ['Companion trovati', stats.owned + ' su ' + stats.total],
      ['Gettoni di recupero', streak.tokens + ' su ' + streak.tokensMax]
    ].forEach(function (row) {
      var r = el('div', 'cbox-stat');
      r.appendChild(el('span', 'cbox-stat-label', row[0]));
      r.appendChild(el('b', null, String(row[1])));
      list.appendChild(r);
    });
    view.appendChild(list);

    // calendario
    view.appendChild(el('h3', 'cbox-subtitle', 'Ultime cinque settimane'));
    var cal = el('div', 'cbox-cal');
    Companion.getCalendar(35).forEach(function (d) {
      var cell = el('span', 'cbox-day' + (d.done ? ' is-done' : '') + (d.today ? ' is-today' : ''),
                    dayNumber(d.key));
      cell.title = d.key + (d.done ? ' · completata' : '');
      cal.appendChild(cell);
    });
    view.appendChild(cal);

    // cartolina
    var row = el('div', 'cbox-row');
    var share = el('button', 'cbox-btn', 'Crea la cartolina');
    share.type = 'button';
    share.addEventListener('click', function () { makePostcard(view); });
    row.appendChild(share);
    view.appendChild(row);

    var slot = el('div', 'cbox-postcard');
    slot.setAttribute('data-postcard', '1');
    view.appendChild(slot);
  }

  /* ----------------------------------------------------------
     6. CARTOLINA
     Disegna un'immagine con companion, streak e statistiche.
     ---------------------------------------------------------- */

  function makePostcard(view) {
    var slot = view.querySelector('[data-postcard]');
    slot.innerHTML = '';
    slot.appendChild(el('p', 'cbox-note', 'Sto preparando la cartolina...'));

    var active = Companion.getActive();
    var stats = Companion.getStats();
    var streak = Companion.getStreak();

    var canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    var ctx = canvas.getContext('2d');

    function paint(image) {
      ctx.fillStyle = '#efe6cf';
      ctx.fillRect(0, 0, 640, 360);

      ctx.fillStyle = '#241d16';
      ctx.fillRect(0, 0, 640, 8);
      ctx.fillRect(0, 352, 640, 8);
      ctx.fillRect(0, 0, 8, 360);
      ctx.fillRect(632, 0, 8, 360);

      Companion.drawTo(ctx, { x: 56, y: 96, scale: 10, image: image });

      ctx.fillStyle = '#241d16';
      ctx.font = 'bold 34px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText(active.displayName, 260, 130);

      ctx.font = '18px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText('livello affetto ' + active.level + ' · ' + active.rarity, 260, 164);
      ctx.fillText(streak.streak + ' giorni di fila', 260, 200);
      ctx.fillText(stats.pets + ' coccole · ' + stats.owned + ' su ' + stats.total + ' trovati', 260, 230);

      ctx.font = '14px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText('record: ' + stats.longestStreak + ' giorni', 260, 268);

      show();
    }

    function show() {
      slot.innerHTML = '';
      var out = el('img', 'cbox-postcard-img');
      out.alt = 'Cartolina del companion';
      try {
        out.src = canvas.toDataURL('image/png');
      } catch (e) {
        slot.appendChild(el('p', 'cbox-note',
          'La cartolina non si puo\' salvare da qui: apri la pagina da un sito, non da file locale.'));
        return;
      }
      slot.appendChild(out);

      var link = el('a', 'cbox-btn', 'Scarica');
      link.href = out.src;
      link.download = 'companion.png';
      slot.appendChild(link);
    }

    if (active.image) {
      // Se l'immagine non arriva (connessione lenta o file mancante) la
      // cartolina esce comunque, con i soli dati.
      var painted = false;
      function once(image) {
        if (painted) return;
        painted = true;
        paint(image);
      }

      var img = new Image();
      img.onload = function () { once(img); };
      img.onerror = function () { once(null); };
      img.src = active.image;
      if (img.complete) once(img);
      setTimeout(function () { once(null); }, 2000);
    } else {
      paint(null);
    }
  }

  /* ----------------------------------------------------------
     7. RENDER E API
     ---------------------------------------------------------- */

  function render() {
    if (!root) return;
    renderSquadra(root.querySelector('[data-view="squadra"]'));
    renderScheda(root.querySelector('[data-view="scheda"]'));
    renderDiario(root.querySelector('[data-view="diario"]'));
    renderSub();
  }

  var CompanionBox = {
    open: function (creatureId) {
      currentBox = 0;
      holding = null;
      if (!root) build();
      selectedId = creatureId || Companion.getActive().id;
      render();
      showTab('squadra');
      lastFocus = document.activeElement;
      root.classList.remove('is-hidden');
      var close = root.querySelector('.cbox-close');
      if (close) close.focus();
      return root;
    },

    close: function () {
      if (!root) return;
      root.classList.add('is-hidden');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    },

    toggle: function () {
      if (!root || root.classList.contains('is-hidden')) CompanionBox.open();
      else CompanionBox.close();
    },

    isOpen: function () {
      return !!root && !root.classList.contains('is-hidden');
    },

    refresh: render
  };

  global.CompanionBox = CompanionBox;

})(window);
