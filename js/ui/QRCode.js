// ---------------------------------------------------------------------------
// QRCode – kleine QR-code-generator (ISO/IEC 18004), zonder externe library.
// Byte-modus, foutcorrectie L/M/Q/H, versies 1-40, automatische maskerkeuze.
// Gebaseerd op de bekende opzet van Project Nayuki's "QR Code generator"
// (MIT-licentie), opnieuw geschreven voor Tafel Rush.
//
//   const qr = QRCode.encode('https://…', 'L');   // { size, version, get(x, y) }
//   QRCode.draw(canvasContext, qr, x, y, moduleSize)
// ---------------------------------------------------------------------------

const ECL = { L: { ord: 0, bits: 1 }, M: { ord: 1, bits: 0 }, Q: { ord: 2, bits: 3 }, H: { ord: 3, bits: 2 } };
// per foutcorrectieniveau (L, M, Q, H) en versie (index 0 ongebruikt)
const ECC_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

const bit = (x, i) => ((x >>> i) & 1) !== 0;

export function rawDataModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) { const n = Math.floor(ver / 7) + 2; r -= (25 * n - 10) * n - 55; if (ver >= 7) r -= 36; }
  return r;
}
export function dataCodewords(ver, ecl) {
  const e = ECL[ecl].ord;
  return Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[e][ver] * NUM_BLOCKS[e][ver];
}
export function alignmentPositions(ver) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2, size = ver * 4 + 17;
  const step = Math.floor((ver * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

// --- Reed-Solomon in GF(256) met polynoom 0x11D ---------------------------------------------
export function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
  return z & 0xff;
}
function rsDivisor(degree) {
  const r = new Array(degree).fill(0); r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
    root = gfMul(root, 0x02);
  }
  return r;
}
function rsRemainder(data, div) {
  const r = div.map(() => 0);
  for (const b of data) {
    const f = b ^ r.shift(); r.push(0);
    div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
  }
  return r;
}

// --- codering ----------------------------------------------------------------------------------
function encodeBytes(bytes, ecl) {
  let ver = 1;
  for (; ver <= 40; ver++) {
    const ccBits = ver <= 9 ? 8 : 16;
    if (4 + ccBits + bytes.length * 8 <= dataCodewords(ver, ecl) * 8) break;
  }
  if (ver > 40) throw new Error('Te veel gegevens voor een QR-code');
  const bits = [];
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(0b0100, 4);                       // byte-modus
  push(bytes.length, ver <= 9 ? 8 : 16); // aantal tekens
  for (const b of bytes) push(b, 8);
  const cap = dataCodewords(ver, ecl) * 8;
  push(0, Math.min(4, cap - bits.length)); // terminator
  push(0, (8 - (bits.length % 8)) % 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; data.length < cap / 8; pad ^= 0xec ^ 0x11) data.push(pad);
  return { ver, data };
}

function interleave(data, ver, ecl) {
  const e = ECL[ecl].ord, nBlocks = NUM_BLOCKS[e][ver], eccLen = ECC_PER_BLOCK[e][ver];
  const raw = Math.floor(rawDataModules(ver) / 8);
  const nShort = nBlocks - (raw % nBlocks), shortLen = Math.floor(raw / nBlocks);
  const div = rsDivisor(eccLen), blocks = [];
  for (let i = 0, k = 0; i < nBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const out = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) out.push(b[i]); });
  return out;
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

class Matrix {
  constructor(ver) {
    this.version = ver;
    this.size = ver * 4 + 17;
    this.m = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    this.fn = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
  }
  get(x, y) { return this.m[y][x]; }
  setFn(x, y, dark) { this.m[y][x] = dark; this.fn[y][x] = true; }

  drawFunctionPatterns() {
    const s = this.size;
    for (let i = 0; i < s; i++) { this.setFn(6, i, i % 2 === 0); this.setFn(i, 6, i % 2 === 0); }
    for (const [cx, cy] of [[3, 3], [s - 4, 3], [3, s - 4]]) {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < s && y >= 0 && y < s) this.setFn(x, y, d !== 2 && d !== 4);
      }
    }
    const pos = alignmentPositions(this.version), n = pos.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.setFn(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    this.drawFormat('L', 0); // plaatshouder (echte waarde na de maskerkeuze)
    this.drawVersion();
  }
  drawFormat(ecl, mask) {
    const data = (ECL[ecl].bits << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((data << 10) | rem) ^ 0x5412, s = this.size;
    for (let i = 0; i <= 5; i++) this.setFn(8, i, bit(b, i));
    this.setFn(8, 7, bit(b, 6)); this.setFn(8, 8, bit(b, 7)); this.setFn(7, 8, bit(b, 8));
    for (let i = 9; i < 15; i++) this.setFn(14 - i, 8, bit(b, i));
    for (let i = 0; i < 8; i++) this.setFn(s - 1 - i, 8, bit(b, i));
    for (let i = 8; i < 15; i++) this.setFn(8, s - 15 + i, bit(b, i));
    this.setFn(8, s - 8, true); // altijd donker
  }
  drawVersion() {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const b = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const a = this.size - 11 + (i % 3), c = Math.floor(i / 3);
      this.setFn(a, c, bit(b, i)); this.setFn(c, a, bit(b, i));
    }
  }
  drawCodewords(cw) {
    const s = this.size;
    let i = 0;
    for (let right = s - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < s; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? s - 1 - v : v;
        if (!this.fn[y][x] && i < cw.length * 8) { this.m[y][x] = bit(cw[i >>> 3], 7 - (i & 7)); i++; }
      }
    }
  }
  applyMask(k) {
    const f = MASKS[k];
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) if (!this.fn[y][x] && f(x, y)) this.m[y][x] = !this.m[y][x];
  }
  /** Vereenvoudigde strafpunten (lange rijen, 2×2-blokken, balans) voor de maskerkeuze. */
  penalty() {
    const s = this.size, m = this.m;
    let p = 0, dark = 0;
    for (let y = 0; y < s; y++) {
      for (const line of [m[y], m.map(r => r[y])]) {
        let run = 1;
        for (let x = 1; x <= s; x++) {
          if (x < s && line[x] === line[x - 1]) run++;
          else { if (run >= 5) p += run - 2; run = 1; }
        }
      }
      for (let x = 0; x < s; x++) {
        if (m[y][x]) dark++;
        if (x < s - 1 && y < s - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
      }
    }
    const k = Math.ceil(Math.abs(dark * 20 - s * s * 10) / (s * s)) - 1;
    return p + Math.max(0, k) * 10;
  }
}

export const QRCode = {
  /** Tekst → QR-matrix. ecl: 'L' (meeste ruimte, aanbevolen voor schermen), 'M', 'Q', 'H'. */
  encode(text, ecl = 'L') {
    const bytes = Array.from(new TextEncoder().encode(text));
    const { ver, data } = encodeBytes(bytes, ecl);
    const cw = interleave(data, ver, ecl);
    let best = null, bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const q = new Matrix(ver);
      q.drawFunctionPatterns();
      q.drawCodewords(cw);
      q.applyMask(mask);
      q.drawFormat(ecl, mask);
      const score = q.penalty();
      if (score < bestScore) { best = q; bestScore = score; best.mask = mask; }
    }
    best.ecl = ecl;
    return best;
  },
  /** Teken op een canvas (zwart op wit, inclusief witte rand van 4 modules). */
  draw(ctx, qr, x, y, mod) {
    const s = qr.size, q = 4;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, (s + q * 2) * mod, (s + q * 2) * mod);
    ctx.fillStyle = '#000000';
    for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) if (qr.get(xx, yy)) ctx.fillRect(x + (xx + q) * mod, y + (yy + q) * mod, mod, mod);
  },
};
