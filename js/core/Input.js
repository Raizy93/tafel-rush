// ---------------------------------------------------------------------------
// Input – toetsenbord, muis en touch.
//
// Ontworpen voor razendsnel typen op Chromebooks:
//   • keydown wordt DIRECT afgehandeld (niet pas in de volgende frame)
//   • cijfers via e.key én e.code (numpad werkt ook zonder NumLock)
//   • browser-shortcuts zoals Backspace-terug, spatie-scroll, '/' snelzoeken
//     worden onderdrukt; Ctrl/Cmd/Alt-combinaties en F-toetsen blijven werken
//   • ingedrukt houden van Enter (auto-repeat) wordt genegeerd
//   • vangnet: een onzichtbaar invoerveld (#kbd) houdt de focus vast. Toetsen
//     die keydown al afhandelt worden voorkomen (preventDefault), dus alleen
//     schermtoetsenborden/tekst-invoer die géén bruikbare keydown sturen komen
//     via het 'input'-event binnen. Zo wordt niets dubbel geteld.
// De actieve scene krijgt genormaliseerde acties via game.dispatchKey().
// ---------------------------------------------------------------------------

const NUMPAD = { Numpad0: '0', Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4', Numpad5: '5', Numpad6: '6', Numpad7: '7', Numpad8: '8', Numpad9: '9' };

export class Input {
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;
    this.kbd = document.getElementById('kbd');
    this.pointer = { x: -1, y: -1, down: false };
    // Telefoon/tablet (alleen een vinger als aanwijzer): meteen de touch-stand met
    // cijferbalk. Laptops (ook met touchscreen) houden de toetsenbordversie; daar
    // verschijnt de cijferbalk pas na een aanraking, zoals altijd.
    this.touchDevice = Input.isTouchDevice();
    this.usingTouch = this.touchDevice;

    window.addEventListener('keydown', e => this.onKeyDown(e), { capture: true });
    canvas.addEventListener('pointerdown', e => this.onPointer(e, 'down'));
    window.addEventListener('pointermove', e => this.onPointer(e, 'move'));
    window.addEventListener('pointerup', e => this.onPointer(e, 'up'));
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    if (this.kbd) {
      this.kbd.addEventListener('input', () => this.onTextInput());
      this.kbd.addEventListener('beforeinput', e => {
        if (e.inputType === 'deleteContentBackward') { e.preventDefault(); this.emit({ type: 'backspace' }); }
        if (e.inputType === 'insertLineBreak') { e.preventDefault(); this.emit({ type: 'enter' }); }
      });
    }
    window.addEventListener('focus', () => this.focus());
    // iOS/Safari: geluid mag pas starten na een "echte" aanraking (touchend/click)
    for (const ev of ['touchend', 'click']) window.addEventListener(ev, () => this.game.audio.unlock(), { passive: true });
    // knijp-zoom van Safari tegenhouden (anders zoomt de game per ongeluk in)
    document.addEventListener('gesturestart', e => e.preventDefault());
  }

  /** Focus op het invoerveld (of het canvas bij touch, zodat er geen schermtoetsenbord opent). */
  focus() {
    if (this.usingTouch) { this.canvas.focus({ preventScroll: true }); return; }
    if (this.kbd) this.kbd.focus({ preventScroll: true });
    else this.canvas.focus({ preventScroll: true });
  }

  /** Echt touchapparaat: grove aanwijzer en géén muis/touchpad. */
  static isTouchDevice() {
    const mm = q => typeof matchMedia === 'function' && matchMedia(q).matches;
    return mm('(pointer: coarse)') && !mm('(any-pointer: fine)');
  }

  /** Vertaal een KeyboardEvent naar een actie, of null. */
  static normalize(e) {
    if (NUMPAD[e.code]) return { type: 'digit', value: NUMPAD[e.code] };
    if (e.key >= '0' && e.key <= '9' && e.key.length === 1) return { type: 'digit', value: e.key };
    switch (e.key) {
      case 'Enter': return { type: 'enter' };
      case 'Backspace': case 'Delete': return { type: 'backspace' };
      case 'ArrowLeft': return { type: 'left' };
      case 'ArrowRight': return { type: 'right' };
      case 'ArrowUp': return { type: 'up' };
      case 'ArrowDown': return { type: 'down' };
      case 'Tab': return { type: e.shiftKey ? 'prev' : 'next' };
      case ' ': return { type: 'space' };
      case 'm': case 'M': return { type: 'mute' };
      case 'p': case 'P': return { type: 'pause' };
      case 't': case 'T': return { type: 'back' };   // T = TERUG (Esc laten we aan de browser)
      case 'u': case 'U': return { type: 'shop' };
      case 'k': case 'K': return { type: 'map' };
      case 'b': case 'B': return { type: 'book' };
      case 'w': case 'W': return { type: 'world' };
      case 'h': case 'H': return { type: 'help' };
      case 'v': case 'V': return { type: 'progress' };
      case 'l': case 'L': return { type: 'account' };
      case 'f': case 'F': return { type: 'fullscreen' };
      default: return null;
    }
  }

  onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // browser-shortcuts met modifier laten we met rust
    if (e.target && e.target.closest && e.target.closest('.cbp')) return; // typen/plakken in het plakvenster
    if (/^F\d+$/.test(e.key)) return;              // F5/F11/F12 blijven werken
    const action = Input.normalize(e);
    // alles wat we kennen of wat tekst zou typen: onderdrukken (bijv. '/' quick find)
    if (action || e.key.length === 1) e.preventDefault();
    if (!action) return;
    if (e.repeat && action.type !== 'backspace' && action.type !== 'digit') return;
    if (!this.touchDevice) this.usingTouch = false; // (tablet met los toetsenbord: cijferbalk blijft)
    this.emit(action);
  }

  /** Vangnet voor tekstinvoer zonder keydown (schermtoetsenbord, dicteren …). */
  onTextInput() {
    const v = this.kbd.value;
    this.kbd.value = '';
    for (const ch of v) {
      if (ch >= '0' && ch <= '9') this.emit({ type: 'digit', value: ch });
      else if (ch === '\n') this.emit({ type: 'enter' });
    }
  }

  emit(action) {
    action.time = performance.now();
    this.game.dispatchKey(action);
  }

  onPointer(e, kind) {
    const p = this.game.renderer.toLogical(e.clientX, e.clientY);
    this.pointer.x = p.x; this.pointer.y = p.y;
    if (kind === 'down') {
      this.pointer.down = true;
      // eenmaal touch gebruikt → cijferbalk blijft tot er een fysieke toets komt
      if (e.pointerType === 'touch' || e.pointerType === 'pen') this.usingTouch = true;
      e.preventDefault();
      this.focus();
      this.game.audio.unlock();
    }
    if (kind === 'up') this.pointer.down = false;
    this.game.dispatchPointer(kind, p.x, p.y, e);
  }
}
