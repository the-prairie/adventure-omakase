/** Reproducible release assets, never operator files or backups. */
import { cp, mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, command, wrangler } from './operator-lib.mjs';
export async function buildAssets(release) {
  release ||=
    process.env.RELEASE_SHA ||
    (await command('git', ['rev-parse', 'HEAD'], { capture: true })).trim();
  if (!/^[a-f0-9]{40}$/.test(release))
    throw Error('Build requires the full Git commit SHA.');
  const dest = resolve(ROOT, 'dist/assets');
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cp(resolve(ROOT, 'public'), dest, { recursive: true });
  const app = resolve(dest, 'app.js');
  await writeFile(
    app,
    (await readFile(app, 'utf8')).replace(
      "const CLIENT_RELEASE = 'development'",
      `const CLIENT_RELEASE = '${release}'`,
    ),
  );
  const names = {};
  for (const name of [
    'app.js',
    'area-data.js',
    'discovery-map.js',
    'dice-atlas.js',
    'controls.js',
    'bookings.js',
    'ask.js',
    'travel.js',
    'app.css',
    'data.js',
    'demo.js',
  ]) {
    const bytes = await readFile(resolve(dest, name));
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    names[name] = name.replace(/\.(js|css)$/, `.${hash}.$1`);
    await rename(resolve(dest, name), resolve(dest, names[name]));
  }
  for (const name of ['index.html', 'example.html']) {
    let html = await readFile(resolve(dest, name), 'utf8');
    for (const [old, hashed] of Object.entries(names))
      html = html.replaceAll(`"${old}"`, `"/${hashed}"`);
    await writeFile(resolve(dest, name), html);
  }
  await writeFile(
    resolve(dest, 'release.json'),
    JSON.stringify({ release, assets: names }) + '\n',
  );
  return release;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const release = await buildAssets();
  if (!process.argv.includes('--assets-only'))
    await wrangler([
      'deploy',
      '--dry-run',
      '--outdir',
      'dist/worker',
      '--assets',
      'dist/assets',
      '--var',
      `RELEASE_SHA:${release}`,
    ]);
  console.log(`Built friends release ${release}`);
}
