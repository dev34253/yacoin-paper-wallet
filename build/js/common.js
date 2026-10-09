// Shared by both pages: helpers, theme, logo, QR rendering, network status and self-test.
import * as Y from './wallet-core.js';
import qrcode from 'qrcode-generator';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- QR codes (rendered as inline SVG, so they print crisply) ----------
export function qrSvg(text, ecl = 'M') {
  const qr = qrcode(0, ecl);
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount(), m = 2, size = n + m * 2;
  let d = '';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#0d1626"/></svg>`;
}

// ---------- Logo (embedded once, reused everywhere) ----------
export const LOGO = $('#logo-src').getAttribute('src');
$$('img[data-logo]').forEach((i) => (i.src = LOGO));
$('#favicon').href = LOGO;

// ---------- Current page in the nav ----------
const page = document.body.dataset.page;
$$('nav.links a[data-nav]').forEach((a) => { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); });

// ---------- Theme ----------
const root = document.documentElement;
try { const t = localStorage.getItem('yac-pw-theme'); if (t) root.dataset.theme = t; } catch (e) {}
$('#theme-toggle').addEventListener('click', () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('yac-pw-theme', root.dataset.theme); } catch (e) {}
});

// ---------- Online / offline status ----------
function updateNet() {
  const el = $('#net-status');
  if (!el) return;
  const on = navigator.onLine;
  el.classList.toggle('warn', on);
  el.querySelector('span').textContent = on
    ? 'You are online. For maximum safety, disconnect before generating keys.'
    : 'Offline. Good: nothing can leave this computer.';
}
addEventListener('online', updateNet); addEventListener('offline', updateNet); updateNet();

// ---------- Self-test against known vectors from the real YACoin wallet ----------
// Each vector: a WIF exported by yacoind 1.11.0 (dumpprivkey) and the address the wallet assigned it.
// Returns false (and shows a warning) if this browser derives anything differently.
export function selfTest() {
  const VECTORS = window.__YAC_VECTORS__ || [];
  const el = $('#selftest');
  try {
    for (const [wif, addr] of VECTORS) {
      const { priv, compressed } = Y.wifToPriv(wif);
      if (Y.walletFromPriv(priv, compressed).address !== addr) throw new Error('vector mismatch');
    }
    const g = Y.generateWallet(true);
    const back = Y.wifToPriv(g.wif);
    if (Y.walletFromPriv(back.priv, true).address !== g.address || Y.validateAddress(g.address) !== 'P2PKH') throw new Error('round-trip failed');
    if (el) { el.classList.add('ok'); el.querySelector('span').textContent = `Self-test passed (${VECTORS.length} yacoind test vectors)`; }
    return true;
  } catch (e) {
    if (el) { el.classList.add('bad'); el.querySelector('span').textContent = 'Self-test FAILED. Do not use this page. (' + e.message + ')'; }
    return false;
  }
}
