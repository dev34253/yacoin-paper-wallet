import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
const r = await build({ entryPoints: ['app.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'inline' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const logo = 'data:image/png;base64,' + readFileSync('logo-256.png').toString('base64');
const vectors = JSON.stringify(JSON.parse(readFileSync('vectors.json', 'utf8')));
const html = readFileSync('template.html', 'utf8')
  .replaceAll('__LOGO__', logo).replace('__VECTORS__', () => vectors).replace('__BUNDLE__', () => js);
writeFileSync('../yacoin-paper-wallet.html', html);
console.log('wrote yacoin-paper-wallet.html', (html.length / 1024).toFixed(0) + ' KB');
