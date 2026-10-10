// ---------------------------------------------------------------------------
// ClipboardPanel – een los HTML-venstertje over de game om een voortgangscode
// te plakken of te kopiëren.
//
// Waarom geen gewoon window.prompt? Op iPhone/iPad mag een pagina het klembord
// alleen gebruiken tijdens een "echte" tik (click). De game reageert al op het
// neerzetten van de vinger (pointerdown), dus daar weigert iOS. Dit venster
// heeft echte HTML-knoppen: PLAK/KOPIEER werkt daar wél. Lukt het toch niet,
// dan staat er een vak waarin je je vinger houdt en "Plakken" kiest.
// ---------------------------------------------------------------------------

const STYLE = `
.cbp { position: fixed; inset: 0; z-index: 9; display: flex; align-items: flex-start; justify-content: center;
  padding: max(10px, env(safe-area-inset-top)) 12px 10px; box-sizing: border-box;
  background: rgba(8, 5, 16, 0.82); font: bold 15px/1.35 monospace; color: #e8e4ff; letter-spacing: 0.5px;
  user-select: text; -webkit-user-select: text; -webkit-touch-callout: default; }
.cbp-box { width: min(440px, 100%); background: #1c1530; border: 3px solid #44307a; box-shadow: 0 0 0 3px #08050f;
  padding: 12px 14px; box-sizing: border-box; }
.cbp h2 { margin: 0 0 6px; font-size: 19px; color: #ffc93c; }
.cbp p { margin: 0 0 8px; color: #c8c0e8; font-size: 13px; }
.cbp textarea { display: block; width: 100%; height: 54px; box-sizing: border-box; resize: none; margin: 0 0 8px;
  background: #0e0a1a; color: #8ff2ff; border: 2px solid #5a4a9a; padding: 6px; font: 16px/1.2 monospace;
  user-select: text; -webkit-user-select: text; -webkit-touch-callout: default; }
.cbp textarea::placeholder { color: #7a70a0; }
.cbp-row { display: flex; gap: 8px; }
.cbp button { flex: 1; min-height: 42px; border: 0; cursor: pointer; font: bold 15px monospace; letter-spacing: 1px;
  color: #fff; background: #44307a; box-shadow: inset 0 -4px 0 rgba(0,0,0,0.35); touch-action: manipulation; }
.cbp button.go { background: #3a9a44; }
.cbp-msg { min-height: 18px; margin: 0 0 6px; font-size: 13px; color: #ffb0a0; }
`;

function ensureStyle() {
  if (document.getElementById('cbp-style')) return;
  const s = document.createElement('style');
  s.id = 'cbp-style';
  s.textContent = STYLE;
  document.head.appendChild(s);
}

export class ClipboardPanel {
  /**
   * Plakvenster.
   * opts.valid(text) → true als het een bruikbare code is
   * opts.onDone(text) → aangeroepen met de geplakte code
   * opts.onClose()    → altijd aangeroepen bij sluiten
   * opts.touch        → teksten voor touch (vinger) i.p.v. toetsenbord
   */
  static paste(opts) {
    const touch = !!opts.touch;
    const p = new ClipboardPanel(opts.onClose);
    p.box.innerHTML = `
      <h2>CODE PLAKKEN</h2>
      <p>${touch ? 'Tik op PLAK en daarna op het knopje <b>Plakken</b> dat verschijnt.' : 'Klik op PLAK, of klik in het vak en druk Ctrl+V.'}</p>
      <textarea placeholder="${touch ? 'Of houd hier je vinger op en kies Plakken' : 'Of plak de code hier'}" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"${touch ? ' inputmode="none"' : ''}></textarea>
      <div class="cbp-msg"></div>
      <div class="cbp-row"><button class="go" data-a="plak">PLAK</button><button data-a="ok">OPHALEN</button><button data-a="terug">ANNULEREN</button></div>`;
    const ta = p.box.querySelector('textarea'), msg = p.box.querySelector('.cbp-msg');
    const tryText = (text, quiet) => {
      if (opts.valid(text)) { p.close(); opts.onDone(text); return true; }
      if (!quiet) msg.textContent = text ? 'Dit is geen geldige voortgangscode.' : 'Er staat (nog) niets in het vak.';
      return false;
    };
    // plakken in het vak: meteen doorgaan zodra er een geldige code staat
    ta.addEventListener('input', () => tryText(ta.value.trim(), true));
    p.on('plak', async () => {
      try {
        const text = await navigator.clipboard.readText();
        ta.value = text || '';
        if (!tryText((text || '').trim(), false) && !text) msg.textContent = 'Het klembord is leeg. Kopieer eerst de code.';
      } catch (e) {
        msg.textContent = touch ? 'Lukt niet: houd je vinger op het vak en kies Plakken.' : 'Lukt niet: klik in het vak en druk Ctrl+V.';
        if (!touch) ta.focus();
      }
    });
    p.on('ok', () => tryText(ta.value.trim(), false));
    p.on('terug', () => p.close());
    p.keys(() => tryText(ta.value.trim(), false));
    if (!touch) ta.focus();
    return p;
  }

  /**
   * Kopieervenster (als kopiëren vanuit de game zelf niet mocht).
   * opts.text, opts.title, opts.info, opts.onCopied(), opts.onClose(), opts.touch
   */
  static copy(opts) {
    const touch = !!opts.touch;
    const p = new ClipboardPanel(opts.onClose);
    p.box.innerHTML = `
      <h2>${opts.title || 'CODE KOPIËREN'}</h2>
      <p>${opts.info || 'Tik op KOPIEER.'}</p>
      <textarea readonly spellcheck="false"></textarea>
      <div class="cbp-msg"></div>
      <div class="cbp-row"><button class="go" data-a="kopieer">KOPIEER</button><button data-a="terug">ANNULEREN</button></div>`;
    const ta = p.box.querySelector('textarea'), msg = p.box.querySelector('.cbp-msg');
    ta.value = opts.text;
    const done = () => { p.close(); if (opts.onCopied) opts.onCopied(); };
    p.on('kopieer', async () => {
      try { await navigator.clipboard.writeText(opts.text); done(); return; } catch (e) { /* oude manier hieronder */ }
      ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      if (ok) done();
      else msg.textContent = touch ? 'Lukt niet: houd je vinger op het vak, kies Selecteer alles en dan Kopieer.' : 'Lukt niet: selecteer de tekst in het vak en druk Ctrl+C.';
    });
    p.on('terug', () => p.close());
    p.keys(() => p.box.querySelector('[data-a="kopieer"]').click());
    return p;
  }

  constructor(onClose) {
    ensureStyle();
    this.onClose = onClose;
    this.el = document.createElement('div');
    this.el.className = 'cbp';
    this.box = document.createElement('div');
    this.box.className = 'cbp-box';
    this.el.appendChild(this.box);
    // tikken/klikken in het venster niet doorgeven aan de game eronder
    for (const ev of ['pointerdown', 'pointerup', 'touchend']) this.el.addEventListener(ev, e => e.stopPropagation());
    document.body.appendChild(this.el);
  }

  on(action, fn) {
    this.box.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b && b.dataset.a === action) fn();
    });
  }

  /** Enter = hoofdactie, Esc = annuleren (de game zelf negeert toetsen in dit venster). */
  keys(onEnter) {
    this.el.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); onEnter(); }
    });
  }

  get open() { return !!this.el; }

  close() {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
    if (this.onClose) this.onClose();
  }
}
