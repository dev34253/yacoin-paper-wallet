// Builds the two self-contained, offline pages into the repo root:
//   index.html      overview, verifier and safety guide
//   generator.html  the paper wallet generator
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const logo = 'data:image/png;base64,' + readFileSync(new URL('logo-256.png', import.meta.url)).toString('base64');
const vectors = JSON.stringify(JSON.parse(read('vectors.json')));

const PAGES = [
  { out: 'index.html', title: 'YACoin Paper Wallet', bodyClass: 'page-home', page: 'home', main: 'pages/home.html', entry: 'js/home.js' },
  { out: 'generator.html', title: 'YACoin Paper Wallet Generator', bodyClass: 'page-gen', page: 'generator', main: 'pages/generator.html', entry: 'js/generator.js' },
];

for (const p of PAGES) {
  const r = await build({ entryPoints: [fileURLToPath(new URL(p.entry, import.meta.url))], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'inline' });
  const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  // One pass over the shell only, so placeholder-like text inside the inserted
  // content (CSS, page markup, the bundle) is never substituted or flagged.
  const parts = {
    TITLE: p.title, BODYCLASS: p.bodyClass, PAGE: p.page,
    STYLES: read('pages/styles.css'), HEADER: read('pages/header.html'), MAIN: read(p.main),
    FOOTER: read('pages/footer.html'), VECTORS: vectors, LOGO: logo, BUNDLE: js,
  };
  const html = read('pages/shell.html').replace(/__([A-Z]+)__/g, (m, k) => {
    if (!(k in parts)) throw new Error(`${p.out}: unknown placeholder ${m}`);
    return parts[k];
  });
  writeFileSync(new URL('../' + p.out, import.meta.url), html);
  console.log('wrote', p.out, (html.length / 1024).toFixed(0) + ' KB');
}
