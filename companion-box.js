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
      { id: 'squadra', label: 'Squadra' },
      { id: 'scheda', label: 'Scheda' },
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

    panel.appendChild(head);
    panel.appendChild(tabs);
    panel.appendChild(body);
    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);

    close.addEventListener('click', CompanionBox.close);
    backdrop.addEventListener('click', CompanionBox.close);

    tabs.addEventListener('click', function (e) {
      var id = e.target.getAttribute && e.target.getAttribute('data-tab');
      if (id) showTab(id);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root && !root.classList.contains('is-hidden')) {
        CompanionBox.close();
      }
    });

    // Se il companion cambia mentre il box e' aperto, si riallinea.
    ['changed', 'renamed', 'unlocked', 'pinned', 'streak', 'pet', 'dayCompanion', 'synced']
      .forEach(function (name) {
        document.addEventListener('companion:' + name, function () {
          if (root && !root.classList.contains('is-hidden')) render();
        });
      });

    return root;
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

  function renderSquadra(view) {
    view.innerHTML = '';

    var day = Companion.getDayCompanion();
    var intro = el('p', 'cbox-note');
    intro.textContent = day
      ? (day.pinned
          ? 'Hai fissato ' + day.displayName + ': resta lui finche\' non lo liberi.'
          : 'Oggi tocca a ' + day.displayName + '. Domani cambia da solo.')
      : 'Nessun companion ancora.';
    view.appendChild(intro);

    var grid = el('div', 'cbox-grid');
    var roster = Companion.getRoster();

    roster.forEach(function (c, index) {
      var cell = el('button', 'cbox-cell' + (c.owned ? '' : ' is-locked'));
      cell.type = 'button';
      cell.disabled = !c.owned;
      if (c.active) cell.classList.add('is-active');
      if (c.id === selectedId) cell.classList.add('is-selected');

      var art = el('div', 'cbox-art');
      if (c.owned) {
        if (c.image) {
          var img = el('img', 'cbox-art-img');
          img.src = c.image;
          img.alt = '';
          art.appendChild(img);
        } else {
          var cv = el('canvas', 'cbox-art-canvas');
          cv.width = 16 * 3;
          cv.height = 16 * 3;
          Companion.drawTo(cv.getContext('2d'), { creatureId: c.id, scale: 3 });
          art.appendChild(cv);
        }
      } else {
        art.appendChild(el('span', 'cbox-art-unknown', '?'));
      }

      cell.appendChild(el('span', 'cbox-num', 'N. ' + padNumber(index + 1)));
      cell.appendChild(art);
      cell.appendChild(el('b', null, c.owned ? c.displayName : '???'));
      cell.appendChild(el('span', null, c.owned ? ('liv. ' + c.level) : 'da trovare'));
      if (c.pinned) cell.appendChild(el('span', 'cbox-pin', 'fissato'));

      cell.addEventListener('click', function () {
        selectedId = c.id;
        render();
        showTab('scheda');
      });

      grid.appendChild(cell);
    });

    view.appendChild(grid);
  }

  /* ----------------------------------------------------------
     4. SCHEDA DEL SINGOLO
     ---------------------------------------------------------- */

  function renderScheda(view) {
    view.innerHTML = '';

    var active = Companion.getActive();
    var id = selectedId || active.id;
    var entry = null;
    Companion.getRoster().forEach(function (c) { if (c.id === id) entry = c; });

    if (!entry || !entry.owned) {
      view.appendChild(el('p', 'cbox-note', 'Scegli un companion dalla squadra.'));
      return;
    }

    var card = el('div', 'cbox-card');

    var art = el('div', 'cbox-card-art');
    if (entry.image) {
      var img = el('img', 'cbox-art-img');
      img.src = entry.image;
      img.alt = '';
      art.appendChild(img);
    } else {
      var cv = el('canvas', 'cbox-art-canvas');
      cv.width = 16 * 5;
      cv.height = 16 * 5;
      Companion.drawTo(cv.getContext('2d'), { creatureId: entry.id, scale: 5 });
      art.appendChild(cv);
    }
    card.appendChild(art);

    var position = 0;
    Companion.getRoster().forEach(function (c, i) { if (c.id === id) position = i + 1; });

    var info = el('div', 'cbox-card-info');
    info.appendChild(el('span', 'cbox-num', 'N. ' + padNumber(position)));
    info.appendChild(el('h3', null, entry.displayName));
    info.appendChild(el('p', 'cbox-note',
      (entry.nickname ? entry.name + ' · ' : '') + entry.rarity +
      ' · livello affetto ' + entry.level));
    info.appendChild(el('p', 'cbox-note',
      entry.pets + ' coccole · con te dal ' + formatDate(entry.unlockedAt)));
    card.appendChild(info);
    view.appendChild(card);

    // rinomina
    var renameRow = el('div', 'cbox-row');
    var input = el('input', 'cbox-input');
    input.type = 'text';
    input.maxLength = 16;
    input.placeholder = 'nomignolo';
    input.value = entry.nickname || '';

    var save = el('button', 'cbox-btn', 'Salva il nome');
    save.type = 'button';
    save.addEventListener('click', function () {
      Companion.setNickname(entry.id, input.value);
    });

    renameRow.appendChild(input);
    renameRow.appendChild(save);
    view.appendChild(renameRow);

    // azioni
    var actions = el('div', 'cbox-row');

    var setActive = el('button', 'cbox-btn', 'Portalo con te oggi');
    setActive.type = 'button';
    setActive.disabled = entry.active;
    setActive.addEventListener('click', function () { Companion.setActive(entry.id); });
    actions.appendChild(setActive);

    var pin = el('button', 'cbox-btn', entry.pinned ? 'Liberalo dalla rotazione' : 'Fissalo sempre');
    pin.type = 'button';
    pin.addEventListener('click', function () {
      if (entry.pinned) Companion.unpin();
      else Companion.pin(entry.id);
    });
    actions.appendChild(pin);

    view.appendChild(actions);
  }

  /* ----------------------------------------------------------
     5. DIARIO: statistiche, calendario, cartolina
     ---------------------------------------------------------- */

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
  }

  var CompanionBox = {
    open: function (creatureId) {
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
