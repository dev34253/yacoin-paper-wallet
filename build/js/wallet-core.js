// YACoin key/address primitives.
// Parameters taken from yacoin/src/chainparams.cpp (CMainParams):
//   base58Prefixes[PUBKEY_ADDRESS] = 77   -> addresses start with 'Y'
//   base58Prefixes[SCRIPT_ADDRESS] = 139
//   base58Prefixes[SECRET_KEY]     = 205  -> WIF private keys
// Encoding follows yacoin/src/base58.cpp: Base58Check with a double-SHA256
// checksum, and a 0x01 suffix on the secret for compressed keys
// (the YACoin wallet creates compressed keys by default).
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';

export const PUBKEY_ADDRESS = 77;
export const SCRIPT_ADDRESS = 139;
export const SECRET_KEY = 205;

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58Encode(bytes) {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = '';
  while (n > 0n) { out = ALPHABET[Number(n % 58n)] + out; n /= 58n; }
  return '1'.repeat(zeros) + out;
}

export function base58Decode(str) {
  let n = 0n;
  for (const c of str) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) throw new Error('Invalid Base58 character');
    n = n * 58n + BigInt(i);
  }
  const bytes = [];
  while (n > 0n) { bytes.unshift(Number(n & 0xffn)); n >>= 8n; }
  let zeros = 0;
  while (zeros < str.length && str[zeros] === '1') zeros++;
  return Uint8Array.from([...new Array(zeros).fill(0), ...bytes]);
}

const sha256d = (b) => sha256(sha256(b));

export function base58CheckEncode(payload) {
  const check = sha256d(payload).slice(0, 4);
  const full = new Uint8Array(payload.length + 4);
  full.set(payload); full.set(check, payload.length);
  return base58Encode(full);
}

export function base58CheckDecode(str) {
  const full = base58Decode(str.trim());
  if (full.length < 5) throw new Error('Too short');
  const payload = full.slice(0, -4);
  const check = sha256d(payload).slice(0, 4);
  for (let i = 0; i < 4; i++) if (check[i] !== full[full.length - 4 + i]) throw new Error('Bad checksum');
  return payload;
}

export const hash160 = (b) => ripemd160(sha256(b));

export function addressFromPubkey(pub) {
  const payload = new Uint8Array(21);
  payload[0] = PUBKEY_ADDRESS;
  payload.set(hash160(pub), 1);
  return base58CheckEncode(payload);
}

export function privToWif(priv, compressed = true) {
  const payload = new Uint8Array(compressed ? 34 : 33);
  payload[0] = SECRET_KEY;
  payload.set(priv, 1);
  if (compressed) payload[33] = 1;
  return base58CheckEncode(payload);
}

// Mirrors CBitcoinSecret::IsValid(): 32 bytes, or 33 bytes ending in 0x01.
export function wifToPriv(wif) {
  const p = base58CheckDecode(wif);
  if (p[0] !== SECRET_KEY) throw new Error('Not a YACoin private key (wrong version byte ' + p[0] + ', expected ' + SECRET_KEY + ')');
  const body = p.slice(1);
  if (body.length === 32) return { priv: body, compressed: false };
  if (body.length === 33 && body[32] === 1) return { priv: body.slice(0, 32), compressed: true };
  throw new Error('Invalid private key length');
}

export function isValidPriv(priv) {
  return priv.length === 32 && secp.utils.isValidPrivateKey(priv);
}

export function walletFromPriv(priv, compressed = true) {
  if (!isValidPriv(priv)) throw new Error('Private key out of range');
  const pub = secp.getPublicKey(priv, compressed);
  return {
    address: addressFromPubkey(pub),
    wif: privToWif(priv, compressed),
    privHex: bytesToHex(priv),
    pubHex: bytesToHex(pub),
    compressed,
  };
}

// Fresh key from the browser's CSPRNG. Optional extra entropy (e.g. dice
// rolls, mouse movement) is hashed together with it, so it can only add
// randomness, never remove it.
export function generateWallet(compressed = true, extraEntropy = null) {
  for (;;) {
    let priv = crypto.getRandomValues(new Uint8Array(32));
    if (extraEntropy && extraEntropy.length) {
      const mix = new Uint8Array(32 + extraEntropy.length);
      mix.set(priv); mix.set(extraEntropy, 32);
      priv = sha256(mix);
    }
    if (isValidPriv(priv)) return walletFromPriv(priv, compressed);
  }
}

export function validateAddress(addr) {
  const p = base58CheckDecode(addr);
  if (p.length !== 21) throw new Error('Invalid address length');
  if (p[0] !== PUBKEY_ADDRESS && p[0] !== SCRIPT_ADDRESS) throw new Error('Not a YACoin address (version ' + p[0] + ')');
  return p[0] === PUBKEY_ADDRESS ? 'P2PKH' : 'P2SH';
}

export function bytesToHex(b) { return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(''); }
export function hexToBytes(h) {
  h = h.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(h)) throw new Error('Expected 64 hex characters');
  return Uint8Array.from(h.match(/../g), (x) => parseInt(x, 16));
}
export { sha256 };
