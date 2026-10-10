// ---------------------------------------------------------------------------
// Opslag-adapters. De rest van de game praat NOOIT direct met localStorage,
// alleen met ProfileService, die een adapter gebruikt.
//
// Contract (bewust async, zodat een online/cloud-adapter later 1-op-1 past):
//   read(key)          → Promise<string|null>
//   write(key, value)  → Promise<void>
//   remove(key)        → Promise<void>
//   kind               → 'local' | 'memory' | 'cloud' …
//
// Een toekomstige CloudAdapter (bijv. REST-API met account-token) implementeert
// hetzelfde contract. Zie README.md → "Accounts en cloud-opslag".
// ---------------------------------------------------------------------------

export class LocalStorageAdapter {
  constructor(prefix = 'tafelrush:') {
    this.prefix = prefix;
    this.kind = 'local';
  }
  /** Werkt localStorage hier echt? (kan geblokkeerd zijn in iframes/privé-modus) */
  static isAvailable() {
    try {
      const k = '__tafelrush_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }
  async read(key) {
    return window.localStorage.getItem(this.prefix + key);
  }
  async write(key, value) {
    window.localStorage.setItem(this.prefix + key, value);
  }
  async remove(key) {
    window.localStorage.removeItem(this.prefix + key);
  }
}

/** Valt terug op geheugen (bijv. als localStorage geblokkeerd is). */
export class MemoryAdapter {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
    this.kind = 'memory';
  }
  async read(key) { return this.data.has(key) ? this.data.get(key) : null; }
  async write(key, value) { this.data.set(key, value); }
  async remove(key) { this.data.delete(key); }
}

export function createDefaultAdapter() {
  if (typeof window !== 'undefined' && LocalStorageAdapter.isAvailable()) return new LocalStorageAdapter();
  return new MemoryAdapter();
}
