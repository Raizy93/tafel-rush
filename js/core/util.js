// Kleine wiskunde- en hulpfuncties.
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const choice = arr => arr[Math.floor(Math.random() * arr.length)];
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
export const easeInCubic = t => t * t * t;
export const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const easeOutElastic = t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
/** Exponentieel naar doel bewegen, framerate-onafhankelijk. */
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
export const fmtInt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const fmtSec = ms => (ms / 1000).toFixed(1).replace('.', ',') + 's';
