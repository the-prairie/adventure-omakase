/** Never overwrites a running trip. Target must be a fresh Cloudflare deployment. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import {
  ROOT,
  operator,
  admin,
  hash,
  wrangler,
  sleep,
  writeLaunch,
} from './operator-lib.mjs';
import { selectedEnvironment, deploymentConfig } from './deployment-config.mjs';
import {
  validateBackup,
  restoreSQL,
  comparableTables,
} from './backup-format.mjs';
let maintenance = false;
try {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  if (args.length !== 1)
    throw Error(
      'Usage: npm run restore -- /path/to/complete-backup (fresh destination deployment only).',
    );
  const environment = selectedEnvironment();
  process.env.OMAKASE_ENV = environment;
  const dir = resolve(args[0]),
    op = await operator(),
    manifest = JSON.parse(
      await readFile(resolve(dir, 'manifest.json'), 'utf8'),
    ),
    raw = await readFile(resolve(dir, 'database.json'), 'utf8');
  if (!manifest.complete || hash(raw) !== manifest.databaseSha256)
    throw Error('The database backup is incomplete or its checksum differs.');
  const backup = validateBackup(JSON.parse(raw));
  for (const p of backup.tables.photos)
    if (
      hash(await readFile(resolve(dir, 'photos', p.id + '.jpg'))) !== p.sha256
    )
      throw Error('Missing or changed photograph ' + p.id);
  const { config: cfg } = await deploymentConfig(environment);
  if (
    cfg.name !== op.name ||
    cfg.account_id !== op.accountId ||
    cfg.d1_databases[0].database_id !== op.databaseId ||
    op.url !== op.recordedUrl
  )
    throw Error(
      'Destination configuration does not match this folder’s recorded deployment. Refusing to restore into potentially unrelated resources.',
    );
  const before = await (await admin(op, '/backup')).json();
  if (before.tables.trips.length)
    throw Error(
      'Destination already has a trip. Create a separate fresh deployment; this command will not erase anyone’s data.',
    );
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  try {
    answer = await rl.question(`Restore into EMPTY ${op.url}? Type restore: `);
  } finally {
    rl.close();
  }
  if (answer !== 'restore') throw Error('Stopped without changing data.');
  await wrangler(['secret', 'put', 'MAINTENANCE', '--env', environment], {
    input: '1\n',
  });
  maintenance = true;
  for (let i = 0; i < 40; i++) {
    const r = await fetch(op.url + '/api/state');
    if (r.status === 503) break;
    if (i === 39) throw Error('Maintenance did not become active.');
    await sleep(1500);
  }
  // Regenerate SQL from validated JSON; never execute an edited restore.sql from a third party.
  const sql = resolve(ROOT, `.deploy/${environment}/restore-validated.sql`);
  await writeFile(sql, restoreSQL(backup), { mode: 0o600 });
  await wrangler(
    ['d1', 'execute', 'DB', '--remote', '--env', environment, '--file', sql],
    {
      input: 'y\n',
    },
  );
  for (const p of backup.tables.photos) {
    const bytes = await readFile(resolve(dir, 'photos', p.id + '.jpg'));
    await admin(op, '/photos/' + p.id, 'PUT', bytes, 'image/jpeg');
    const roundtrip = new Uint8Array(
      await (await admin(op, '/photos/' + p.id)).arrayBuffer(),
    );
    if (hash(roundtrip) !== p.sha256)
      throw Error('Restored photograph did not verify: ' + p.id);
  }
  const after = await (await admin(op, '/backup')).json();
  if (
    JSON.stringify(comparableTables(after.tables)) !==
    JSON.stringify(comparableTables(backup.tables))
  )
    throw Error('Restored database differs. Maintenance remains enabled.');
  const device = await (await admin(op, '/owner-device', 'POST', {})).json();
  await wrangler(['secret', 'delete', 'MAINTENANCE', '--env', environment], {
    input: 'y\n',
  });
  maintenance = false;
  await writeLaunch(op, { deviceKey: device.key });
  console.log(
    'Database and all photo hashes verified. Owner device link written locally. Use owner-provided personal device links to restore existing friends’ memberships. The reusable group invitation is for new members.',
  );
} catch (e) {
  console.error(
    'Restore stopped: ' +
      e.message +
      (maintenance
        ? '\nMaintenance remains ON so nobody uses an incomplete restoration. Keep the backup and inspect before retrying.'
        : ''),
  );
  process.exitCode = 1;
}
