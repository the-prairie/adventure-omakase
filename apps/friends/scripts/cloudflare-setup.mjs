/** Inventory first. Create/resume only the named environment, never a random install. */
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  ROOT,
  cloudflareAuth,
  cf,
  loadJSON,
  privateJSON,
  npm,
} from './operator-lib.mjs';
import { selectedEnvironment, deploymentConfig } from './deployment-config.mjs';
try {
  const environment = selectedEnvironment();
  const { root, config, db, bucket } = await deploymentConfig(environment, {
    provisioned: false,
  });
  const auth = await cloudflareAuth();
  const accounts = await cf(auth, '/accounts?per_page=50');
  if (!accounts.some((a) => a.id === config.account_id))
    throw Error(
      'Configured account is not accessible with this authentication.',
    );
  // All account inventory is read before any resource is provisioned. R2 activation
  // is an account-holder action, never an automatic plan/billing change here.
  const base = `/accounts/${config.account_id}`;
  const databases = await cf(auth, base + '/d1/database?per_page=100');
  const buckets = await cf(auth, base + '/r2/buckets');
  const workers = await cf(auth, base + '/workers/scripts');
  const domain = await cf(auth, base + '/workers/subdomain');
  if (!domain.subdomain)
    throw Error('The account needs its workers.dev subdomain configured.');
  const record = `.deploy/${environment}/operator.json`;
  let op;
  try {
    op = await loadJSON(record);
  } catch {
    /* First setup has no private record. */
  }
  const existingDB = databases.find((d) => d.name === db.database_name);
  const existingBucket = (buckets.buckets || buckets || []).find(
    (b) => b.name === bucket.bucket_name,
  );
  const existingWorker = workers.find((w) => w.id === config.name);
  if (
    op &&
    (op.accountId !== config.account_id ||
      op.name !== config.name ||
      op.bucketName !== bucket.bucket_name)
  )
    throw Error(
      'Recorded deployment differs from selected resources. Stop and reconcile configuration.',
    );
  if (!op && (existingDB || existingBucket || existingWorker))
    throw Error(
      'Matching resources already exist without this setup record. Inventory their data and adopt them explicitly; do not create a replacement trip.',
    );
  await npm(['run', 'check']);
  await npm(['test']);
  await npm(['run', 'test:cloudflare']);
  op ||= {
    environment,
    accountId: config.account_id,
    name: config.name,
    bucketName: bucket.bucket_name,
    setupKey: randomBytes(32).toString('hex'),
    url: `https://${config.name}.${domain.subdomain}.workers.dev`,
    created: new Date().toISOString(),
  };
  await privateJSON(record, op);
  if (!op.databaseId) {
    const made =
      existingDB ||
      (await cf(auth, base + '/d1/database', 'POST', {
        name: db.database_name,
        primary_location_hint: 'apac',
        read_replication: { mode: 'disabled' },
      }));
    op.databaseId = made.uuid;
    await privateJSON(record, op);
  }
  if (!op.databaseId) throw Error('D1 did not return an identifier.');
  if (!existingBucket)
    await cf(auth, base + '/r2/buckets', 'POST', {
      name: bucket.bucket_name,
      locationHint: 'apac',
    });
  db.database_id = op.databaseId;
  await writeFile(
    resolve(ROOT, 'wrangler.jsonc'),
    JSON.stringify(root, null, 2) + '\n',
  );
  console.log(
    `Configured ${environment}: ${config.name}. Commit the resource IDs, then deploy with OMAKASE_URL=${op.url}. Owner credentials stay in ${record}.`,
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
