/** Standalone fictional example, NOT a shared service or a production deployment. */
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { resolve } from 'node:path';
import { ROOT } from './operator-lib.mjs';
const root = resolve(ROOT, 'public'),
  context = { window: {} };
vm.runInNewContext(await readFile(resolve(root, 'data.js'), 'utf8'), context);
const data = context.window.OMAKASE;
for (const [k, path] of Object.entries(data.assets)) {
  if (typeof path === 'string' && path.startsWith('/assets/'))
    data.assets[k] =
      'data:image/jpeg;base64,' +
      (await readFile(resolve(root, '.' + path))).toString('base64');
}
data.legacy = await readFile(
  resolve(ROOT, 'reference/legacy-fieldbook.html'),
  'utf8',
);
let html = await readFile(resolve(root, 'example.html'), 'utf8');
html = html
  .replace('<link rel="manifest" href="manifest.webmanifest">', '')
  .replace(
    '<link rel="stylesheet" href="app.css">',
    '<style>' + (await readFile(resolve(root, 'app.css'), 'utf8')) + '</style>',
  );
for (const name of ['data.js', 'demo.js', 'ask.js', 'outings.js', 'app.js'])
  html = html.replace(`<script src="${name}" defer></script>`, '');
const app = (await readFile(resolve(root, 'app.js'), 'utf8')).replace(
  "let mode=location.protocol==='file:'||location.hash.startsWith('#demo')?'demo':'shared';",
  "let mode='demo';",
);
const blocks = [
  'window.OMAKASE=' + JSON.stringify(data) + ';',
  await readFile(resolve(root, 'demo.js'), 'utf8'),
  await readFile(resolve(root, 'ask.js'), 'utf8'),
  await readFile(resolve(root, 'outings.js'), 'utf8'),
  app,
]
  .map((s) => '<script>' + s.replace(/<\/script/gi, '<\\/script') + '</script>')
  .join('\n');
html = html.replace('</body>', blocks + '\n</body>');
const out = resolve(ROOT, 'dist/Adventure_Omakase_Cloudflare_Preview.html');
await writeFile(out, html);
console.log('Fictional, local-only preview built: ' + out);
