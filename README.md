# YACoin Paper Wallet

An offline paper wallet generator for [YACoin](https://github.com/yacoin/yacoin), styled after yacoin.org.

**Use it:** open `yacoin-paper-wallet.html` in a browser. It's a single self-contained file with no external resources. A Content-Security-Policy blocks all network access.

## What it does

- Generates YACoin keys with `crypto.getRandomValues`. Optional extra randomness (typed text, dice rolls, mouse movement) is hashed in with it, so it can only add entropy.
- Prints fold-over paper wallets with QR codes for the address and the private key.
- Verifies a private key (WIF or hex) or an address.
- Includes a step-by-step guide for safe cold storage and sweeping funds with `importprivkey`.

## Key format

Parameters come from `yacoin/src/chainparams.cpp` (`CMainParams`) and `base58.cpp`:

| | Value |
|---|---|
| Address version (`PUBKEY_ADDRESS`) | 77 (addresses start with `Y` or `X`) |
| Script address version | 139 |
| Private key version (`SECRET_KEY`) | 205 |
| Encoding | Base58Check, double-SHA256 checksum |
| Key type | Compressed (the YACoin wallet default) |

Only compressed keys are generated. yacoind 1.11.0 accepts uncompressed keys, but `dumpprivkey` exports them in compressed form, which maps to a different address. The verifier still decodes uncompressed keys.

## Verification

- Keys were cross-checked against the official `yacoind` 1.11.0 release, run offline. Generated keys import with `ismine: true` and round-trip through `dumpprivkey`, and keys created by yacoind derive to the same addresses here.
- On load, the page re-derives 4 keys exported by yacoind (`build/vectors.json`) and disables generation if any mismatch. These are throwaway test keys: **never send coins to them.**

## Building

```sh
cd build
npm install
npm run build   # writes ../yacoin-paper-wallet.html
```

| File | Purpose |
|---|---|
| `build/wallet-core.js` | Key generation, WIF and address encoding |
| `build/app.js` | Page logic, QR rendering, verifier |
| `build/template.html` | Markup and styles |
| `build/build.mjs` | Bundles everything into one HTML file |

Libraries: [@noble/secp256k1](https://github.com/paulmillr/noble-secp256k1), [@noble/hashes](https://github.com/paulmillr/noble-hashes) (MIT), [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT). The logo is from the YACoin repository (MIT).

## Safety

Generate keys on an offline computer, print over a cable rather than Wi-Fi, and keep the private key half secret. Anyone who sees it can spend the coins.
