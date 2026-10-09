import * as Y from './wallet-core.js';
import qrcode from 'qrcode-generator';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- QR codes (rendered as inline SVG, so they print crisply) ----------
function qrSvg(text, ecl = 'M') {
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
  const on = navigator.onLine;
  const el = $('#net-status');
  el.classList.toggle('warn', on);
  el.querySelector('span').textContent = on
    ? 'You are online. For maximum safety, disconnect before generating keys.'
    : 'Offline. Good: nothing can leave this computer.';
}
addEventListener('online', updateNet); addEventListener('offline', updateNet); updateNet();

// ---------- Extra entropy from pointer movement ----------
// A sample only counts once the pointer has moved a few pixels, so the bar
// tracks real movement rather than event rate.
const ENTROPY_SAMPLES = 1000, MIN_MOVE = 4;
let pool = [], lastX = -99, lastY = -99;
addEventListener('pointermove', (e) => {
  if (Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY) < MIN_MOVE) return;
  lastX = e.clientX; lastY = e.clientY;
  if (pool.length < ENTROPY_SAMPLES * 3 * 2) pool.push(e.clientX & 0xff, e.clientY & 0xff, performance.now() * 1000 & 0xff);
  const pct = Math.min(100, Math.floor(pool.length / (ENTROPY_SAMPLES * 3) * 100));
  $('#entropy-bar').style.width = pct + '%';
  $('#entropy-pct').textContent = pct + '%';
}, { passive: true });

function extraEntropy() {
  const typed = new TextEncoder().encode($('#extra-entropy').value);
  const all = new Uint8Array(pool.length + typed.length + 8);
  all.set(pool); all.set(typed, pool.length);
  new DataView(all.buffer).setFloat64(pool.length + typed.length, performance.now());
  return all;
}

// ---------- Paper wallet rendering ----------
const LOGO = $('#logo-src').getAttribute('src');
$$('img[data-logo]').forEach((i) => (i.src = LOGO));
$('#favicon').href = LOGO;

function walletCard(w, i, total) {
  return `
  <article class="paper">
    <div class="paper-half public">
      <div class="paper-tag share">Public address · Load &amp; verify</div>
      ${qrSvg(w.address, 'M')}
      <div class="paper-label">Send YAC to</div>
      <div class="paper-key mono">${esc(w.address)}</div>
    </div>
    <div class="paper-mid">
      <img src="${LOGO}" alt="" class="paper-logo">
      <div class="paper-brand">YACoin</div>
      <div class="paper-sub">Paper Wallet</div>
      ${total > 1 ? `<div class="paper-num">#${i + 1} of ${total}</div>` : ''}
      <div class="paper-fold">fold here</div>
    </div>
    <div class="paper-half secret">
      <div class="paper-tag spend">Private key · Keep secret</div>
      ${qrSvg(w.wif, 'M')}
      <div class="paper-label">Private key (WIF)</div>
      <div class="paper-key mono">${esc(w.wif)}</div>
    </div>
  </article>`;
}

function render(wallets) {
  const out = $('#wallets');
  out.innerHTML = wallets.map((w, i) => walletCard(w, i, wallets.length)).join('');
  $('#details').innerHTML = wallets.length === 1 ? detailsTable(wallets[0]) : '';
  $('#result').hidden = false;
  $('#print-btn').disabled = false;
  $('#clear-btn').disabled = false;
}

function detailsTable(w) {
  const row = (k, v, cls = '') => `<div class="kv ${cls}"><dt>${k}</dt><dd class="mono">${esc(v)}</dd></div>`;
  return `<dl class="details">
    ${row('Address', w.address)}
    ${row('Private key (WIF)', w.wif, 'secret-row')}
    ${row('Private key (hex)', w.privHex, 'secret-row')}
    ${row('Public key', w.pubHex)}
    ${row('Key type', w.compressed ? 'Compressed (YACoin wallet default)' : 'Uncompressed')}
  </dl>`;
}

$('#gen-btn').addEventListener('click', () => {
  const n = Math.max(1, Math.min(50, parseInt($('#count').value, 10) || 1));
  $('#count').value = n;
  const ent = extraEntropy();
  const wallets = [];
  for (let i = 0; i < n; i++) {
    const salt = new Uint8Array(ent.length + 4); salt.set(ent); new DataView(salt.buffer).setUint32(ent.length, i);
    wallets.push(Y.generateWallet(true, salt));
  }
  pool = [];
  $('#entropy-bar').style.width = '0%'; $('#entropy-pct').textContent = '0%';
  render(wallets);
  $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('#print-btn').addEventListener('click', () => print());
$('#clear-btn').addEventListener('click', () => {
  $('#wallets').innerHTML = ''; $('#details').innerHTML = '';
  $('#result').hidden = true; $('#print-btn').disabled = true; $('#clear-btn').disabled = true;
  $('#extra-entropy').value = '';
});

$('#show-details').addEventListener('change', (e) => document.body.classList.toggle('reveal', e.target.checked));

// ---------- Verify / restore ----------
function verify() {
  const v = $('#verify-input').value.trim();
  const out = $('#verify-out');
  if (!v) { out.innerHTML = ''; return; }
  try {
    let w;
    if (/^[0-9a-fA-F]{64}$/.test(v)) {
      w = Y.walletFromPriv(Y.hexToBytes(v), true);
    } else {
      try {
        const type = Y.validateAddress(v);
        out.innerHTML = `<div class="verdict ok"><b>Valid YACoin ${type === 'P2SH' ? 'script (P2SH) ' : ''}address.</b> The checksum and version byte are correct.</div>
          <div class="verify-grid one">${qrSvg(v)}<div class="mono break">${esc(v)}</div></div>`;
        return;
      } catch (addrErr) {
        // A 21-byte payload is an address (wrong network or bad checksum), not a key.
        let len = 0; try { len = Y.base58CheckDecode(v).length; } catch (e) {}
        if (len === 21) throw addrErr;
        const { priv, compressed } = Y.wifToPriv(v);
        w = Y.walletFromPriv(priv, compressed);
      }
    }
    out.innerHTML = `<div class="verdict ok"><b>Valid YACoin private key.</b> It controls the address below.</div>
      ${w.compressed ? '' : '<div class="verdict warn">This is an <b>uncompressed</b> key. It is valid, but importing the compressed form of the same key gives a different address. Always import it exactly as written.</div>'}
      <div class="verify-grid">
        <div>${qrSvg(w.address)}<div class="paper-label">Address</div><div class="mono break">${esc(w.address)}</div></div>
        <div>${qrSvg(w.wif)}<div class="paper-label">Private key (WIF)</div><div class="mono break">${esc(w.wif)}</div></div>
      </div>
      <div class="verify-actions"><button class="btn btn-ghost" id="verify-print">Make a paper wallet from this key</button></div>`;
    $('#verify-print').onclick = () => { render([w]); $('#result').scrollIntoView({ behavior: 'smooth' }); };
  } catch (e) {
    out.innerHTML = `<div class="verdict bad"><b>Not valid.</b> ${esc(e.message)}</div>`;
  }
}
$('#verify-input').addEventListener('input', verify);

// ---------- Self-test against known vectors from the real YACoin wallet ----------
// Each vector: a WIF exported by yacoind 1.11.0 (dumpprivkey) and the address the wallet assigned it.
const VECTORS = window.__YAC_VECTORS__ || [];
(function selfTest() {
  const el = $('#selftest');
  try {
    for (const [wif, addr] of VECTORS) {
      const { priv, compressed } = Y.wifToPriv(wif);
      if (Y.walletFromPriv(priv, compressed).address !== addr) throw new Error('vector mismatch');
    }
    const g = Y.generateWallet(true);
    const back = Y.wifToPriv(g.wif);
    if (Y.walletFromPriv(back.priv, true).address !== g.address || Y.validateAddress(g.address) !== 'P2PKH') throw new Error('round-trip failed');
    el.classList.add('ok');
    el.querySelector('span').textContent = `Self-test passed (${VECTORS.length} yacoind test vectors)`;
  } catch (e) {
    el.classList.add('bad');
    el.querySelector('span').textContent = 'Self-test FAILED. Do not use this page. (' + e.message + ')';
    $('#gen-btn').disabled = true;
  }
})();
