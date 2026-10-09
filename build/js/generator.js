import * as Y from './wallet-core.js';
import { $, esc, qrSvg, LOGO, selfTest } from './common.js';

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

if (!selfTest()) $('#gen-btn').disabled = true;
