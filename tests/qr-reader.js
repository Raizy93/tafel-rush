// ---------------------------------------------------------------------------
// Onafhankelijke QR-lezer voor de tests (alleen voor perfecte, door ons zelf
// gemaakte matrices – geen camerabeeld). Controleert:
//   • formaatbits (BCH-code, beide kopieën), versiebits (v7+)
//   • Reed-Solomon: alle syndromen van ieder blok moeten 0 zijn
//   • de gelezen bytes (modus, lengte, inhoud)
// Zo vangen we fouten in de generator zonder een externe library.
// ---------------------------------------------------------------------------
const EXP = new Array(512), LOG = new Array(256);
{ let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; }
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

// tabellen uit de QR-standaard (data-codewoorden, blokken, ECC per blok) – onafhankelijk ingetypt
// formaat: [versie][ecl] = [aantal blokken, ecc per blok]
const T = {
  1: { L: [1, 7], M: [1, 10], Q: [1, 13], H: [1, 17] },
  2: { L: [1, 10], M: [1, 16], Q: [1, 22], H: [1, 28] },
  5: { L: [1, 26], M: [2, 24], Q: [4, 18], H: [4, 22] },
  7: { L: [2, 20], M: [4, 18], Q: [6, 18], H: [5, 26] },
  10: { L: [4, 18], M: [5, 26], Q: [8, 24], H: [8, 28] },
  15: { L: [6, 22], M: [10, 24], Q: [12, 30], H: [18, 24] },
  20: { L: [8, 28], M: [16, 26], Q: [20, 30], H: [25, 28] },
  25: { L: [12, 26], M: [21, 28], Q: [29, 30], H: [35, 30] },
  30: { L: [15, 30], M: [29, 28], Q: [40, 30], H: [48, 30] },
  35: { L: [19, 30], M: [38, 28], Q: [53, 30], H: [63, 30] },
  40: { L: [25, 30], M: [49, 28], Q: [68, 30], H: [81, 30] },
};
const ECL_BITS = { 1: 'L', 0: 'M', 3: 'Q', 2: 'H' };
const MASKS = [
  (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];
function bch(data, poly, len) { let r = data << (len - 1 - Math.floor(Math.log2(poly)) + Math.floor(Math.log2(poly))); r = data; for (let i = 0; i < Math.floor(Math.log2(poly)); i++) r = (r << 1) ^ ((r >>> (Math.floor(Math.log2(poly)) - 1)) * poly); return r; }

export function readQR(get, size, alignPos) {
  const ver = (size - 17) / 4;
  // --- formaat (kopie 1) ---
  let f = 0;
  const f1 = [];
  for (let i = 0; i <= 5; i++) f1.push(get(8, i));
  f1.push(get(8, 7), get(8, 8), get(7, 8));
  for (let i = 9; i < 15; i++) f1.push(get(14 - i, 8));
  f1.forEach((b, i) => { if (b) f |= 1 << i; });
  f ^= 0x5412;
  const fdata = f >>> 10, frem = f & 0x3ff;
  let r = fdata; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
  if ((r & 0x3ff) !== frem) throw new Error('formaat-BCH klopt niet');
  // kopie 2 moet gelijk zijn
  let f2 = 0;
  for (let i = 0; i < 8; i++) if (get(size - 1 - i, 8)) f2 |= 1 << i;
  for (let i = 8; i < 15; i++) if (get(8, size - 15 + i)) f2 |= 1 << i;
  if ((f2 ^ 0x5412) !== f) throw new Error('formaat-kopieën verschillen');
  if (!get(8, size - 8)) throw new Error('donkere module ontbreekt');
  const ecl = ECL_BITS[fdata >>> 3], mask = fdata & 7;
  // --- versie (v7+) ---
  if (ver >= 7) {
    let v = 0;
    for (let i = 0; i < 18; i++) if (get(size - 11 + (i % 3), Math.floor(i / 3))) v |= 1 << i;
    if (v >>> 12 !== ver) throw new Error('versiebits ' + (v >>> 12) + ' ≠ ' + ver);
  }
  // --- welke modules zijn functie (onafhankelijk opgebouwd) ---
  const fn = (x, y) => {
    if (x === 6 || y === 6) return true;
    if ((x < 9 && y < 9) || (x >= size - 8 && y < 9) || (x < 9 && y >= size - 8)) return true;
    if (ver >= 7 && ((x >= size - 11 && y < 6) || (y >= size - 11 && x < 6))) return true;
    for (const ax of alignPos) for (const ay of alignPos) {
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === size - 7) || (ax === size - 7 && ay === 6)) continue;
      if (Math.abs(x - ax) <= 2 && Math.abs(y - ay) <= 2) return true;
    }
    return false;
  };
  // --- codewoorden lezen (zigzag, van rechtsonder) ---
  const bits = [];
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let k = 0; k < size; k++) {
      const y = upward ? size - 1 - k : k;
      for (const x of [col, col - 1]) if (!fn(x, y)) bits.push(get(x, y) !== MASKS[mask](x, y) ? 1 : 0);
    }
    upward = !upward;
  }
  const total = Math.floor(bits.length / 8);
  const cw = []; for (let i = 0; i < total; i++) cw.push(bits.slice(i * 8, i * 8 + 8).reduce((a, b) => (a << 1) | b, 0));
  // --- blokken terugzetten + Reed-Solomon-controle ---
  const info = T[ver] && T[ver][ecl];
  if (!info) throw new Error('versie ' + ver + ' niet in testtabel');
  const [nb, ecc] = info;
  const nShort = nb - (total % nb), shortLen = Math.floor(total / nb);
  const blocks = Array.from({ length: nb }, (_, j) => ({ data: [], ecc: [], dlen: shortLen - ecc + (j < nShort ? 0 : 1) }));
  let k = 0;
  const maxD = shortLen - ecc + 1;
  for (let i = 0; i < maxD; i++) for (let j = 0; j < nb; j++) if (i < blocks[j].dlen) blocks[j].data.push(cw[k++]);
  for (let i = 0; i < ecc; i++) for (let j = 0; j < nb; j++) blocks[j].ecc.push(cw[k++]);
  for (const b of blocks) {
    const all = b.data.concat(b.ecc);
    for (let s = 0; s < ecc; s++) {
      let acc = 0;
      for (const c of all) acc = mul(acc, EXP[s]) ^ c;
      if (acc !== 0) throw new Error('Reed-Solomon syndroom ≠ 0');
    }
  }
  // --- gegevens lezen ---
  const data = blocks.flatMap(b => b.data);
  const dbits = data.flatMap(b => [7, 6, 5, 4, 3, 2, 1, 0].map(i => (b >>> i) & 1));
  let p = 0;
  const take = n => { let v = 0; for (let i = 0; i < n; i++) v = (v << 1) | dbits[p++]; return v; };
  if (take(4) !== 0b0100) throw new Error('geen byte-modus');
  const len = take(ver <= 9 ? 8 : 16);
  const out = [];
  for (let i = 0; i < len; i++) out.push(take(8));
  return { ecl, mask, ver, text: new TextDecoder().decode(new Uint8Array(out)) };
}
