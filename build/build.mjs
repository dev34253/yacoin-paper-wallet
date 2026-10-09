// Builds the two self-contained, offline pages into the repo root:
//   index.html      overview, verifier and safety guide
//   generator.html  the paper wallet generator
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const logo = 'data:image/png;base64,' + readFileSync(new URL('logo-256.png', import.meta.url)).toString('base64');
const vectors = JSON.stringify(JSON.parse(read('vectors.json')));

const PAGES = [
  { out: 'index.html', title: 'YACoin Paper Wallet', bodyClass: 'page-home', page: 'home', main: 'pages/home.html', entry: 'js/home.js' },
  { out: 'generator.html', title: 'YACoin Paper Wallet Generator', bodyClass: 'page-gen', page: 'generator', main: 'pages/generator.html', entry: 'js/generator.js' },
];

for (const p of PAGES) {
  const r = await build({ entryPoints: [new URL(p.entry, import.meta.url).pathname], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'inline' });
  const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  // Function replacers so `$` sequences in the inserted content are taken literally.
  const html = read('pages/shell.html')
    .replace('__TITLE__', () => p.title)
    .replace('__BODYCLASS__', () => p.bodyClass)
    .replace('__PAGE__', () => p.page)
    .replace('__STYLES__', () => read('pages/styles.css'))
    .replace('__HEADER__', () => read('pages/header.html'))
    .replace('__MAIN__', () => read(p.main))
    .replace('__FOOTER__', () => read('pages/footer.html'))
    .replace('__VECTORS__', () => vectors)
    .replace('__LOGO__', () => logo)
    .replace('__BUNDLE__', () => js);
  if (/__[A-Z]+__/.test(html.replace(js, ''))) throw new Error(p.out + ': unreplaced placeholder');
  writeFileSync(new URL('../' + p.out, import.meta.url), html);
  console.log('wrote', p.out, (html.length / 1024).toFixed(0) + ' KB');
}
