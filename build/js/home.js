import * as Y from './wallet-core.js';
import { $, esc, qrSvg, selfTest } from './common.js';

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
      </div>`;
  } catch (e) {
    out.innerHTML = `<div class="verdict bad"><b>Not valid.</b> ${esc(e.message)}</div>`;
  }
}
$('#verify-input').addEventListener('input', verify);

selfTest();
