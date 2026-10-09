# YACoin Paper Wallet

An offline paper wallet generator for [YACoin](https://github.com/yacoin/yacoin), styled after yacoin.org.

**Use it:** open `index.html` in a browser. The site has two pages:

| Page | Contents |
|---|---|
| `index.html` | Overview, key/address verifier and safety guide |
| `generator.html` | The paper wallet generator only |

Each page is a single self-contained file with no external resources, and a Content-Security-Policy blocks all network access. `generator.html` works on its own, so it's the one to copy to an offline computer.

## What it does

- Generates YACoin keys with `crypto.getRandomValues`. Optional extra randomness (typed text, dice rolls, mouse movement) is hashed in with it, so it can only add entropy.
- Prints fold-over paper wallets with QR codes for the address and the private key.
- Verifies a private key (WIF or hex) or an address (on `index.html`).
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
- On load, each page re-derives 4 keys exported by yacoind (`build/vectors.json`) and disables the generator or verifier if any mismatch. These are throwaway test keys: **never send coins to them.**

## Building

```sh
cd build
npm install
npm run build   # writes ../index.html and ../generator.html
```

| File | Purpose |
|---|---|
| `build/js/wallet-core.js` | Key generation, WIF and address encoding |
| `build/js/common.js` | Shared helpers: theme, logo, QR rendering, self-test |
| `build/js/home.js` | Verifier (`index.html`) |
| `build/js/generator.js` | Generator, randomness collection, printing (`generator.html`) |
| `build/pages/` | Shared shell, header, footer and styles, plus each page's content |
| `build/build.mjs` | Bundles each page into one self-contained HTML file |

Libraries: [@noble/secp256k1](https://github.com/paulmillr/noble-secp256k1), [@noble/hashes](https://github.com/paulmillr/noble-hashes) (MIT), [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT). The logo is from the YACoin repository (MIT).

## Safety

Generate keys on an offline computer, print over a cable rather than Wi-Fi, and keep the private key half secret. Anyone who sees it can spend the coins.
