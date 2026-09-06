import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, operator, admin, hash, privateJSON } from './operator-lib.mjs';
import { validateBackup, restoreSQL } from './backup-format.mjs';
try {
  const op = await operator(),
    dest = resolve(
      ROOT,
      process.argv[2] ||
        'backups/' + new Date().toISOString().replace(/[:.]/g, '-'),
    );
  await mkdir(dest, { recursive: true, mode: 0o700 });
  const snapshot = validateBackup(await (await admin(op, '/backup')).json());
  // In-flight/unattached uploads can be omitted: no memory points to them yet.
  const referenced = new Set(
    snapshot.tables.moments.flatMap((m) => {
      try {
        return JSON.parse(m.body).photos || [];
      } catch {
        return [];
      }
    }),
  );
  snapshot.tables.photos = snapshot.tables.photos.filter(
    (p) => p.status === 'ready' && referenced.has(p.id),
  );
  await mkdir(resolve(dest, 'photos'), { recursive: true, mode: 0o700 });
  const sums = {};
  for (const p of snapshot.tables.photos) {
    const bytes = new Uint8Array(
      await (await admin(op, '/photos/' + p.id)).arrayBuffer(),
    );
    if (hash(bytes) !== p.sha256)
      throw Error('Photo checksum changed: ' + p.id);
    await writeFile(resolve(dest, 'photos', p.id + '.jpg'), bytes, {
      mode: 0o600,
    });
    sums[p.id] = p.sha256;
  }
  const raw = JSON.stringify(snapshot, null, 2) + '\n';
  await writeFile(resolve(dest, 'database.json'), raw, { mode: 0o600 });
  await writeFile(resolve(dest, 'restore.sql'), restoreSQL(snapshot), {
    mode: 0o600,
  });
  await privateJSON(resolve(dest, 'manifest.json'), {
    version: 3,
    created: new Date().toISOString(),
    source: op.url,
    databaseSha256: hash(raw),
    photos: sums,
    complete: true,
  });
  console.log(
    `Complete backup: ${dest}\n${snapshot.tables.photos.length} photo files verified. Store a copy outside this app. Session cookies are not included.`,
  );
} catch (e) {
  console.error('Backup not completed: ' + e.message);
  process.exitCode = 1;
}
