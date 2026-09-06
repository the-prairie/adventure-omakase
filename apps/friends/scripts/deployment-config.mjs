import { loadJSON } from './operator-lib.mjs';
export const ENVIRONMENTS = ['preview', 'production', 'restore'];
export function selectedEnvironment(args = process.argv.slice(2)) {
  const i = args.indexOf('--env');
  const environment = i >= 0 ? args[i + 1] : process.env.OMAKASE_ENV;
  if (!ENVIRONMENTS.includes(environment))
    throw Error('Select --env preview, production, or restore explicitly.');
  return environment;
}
export async function deploymentConfig(
  environment,
  { provisioned = true } = {},
) {
  const root = await loadJSON('wrangler.jsonc'),
    config = root.env?.[environment];
  if (
    !config?.account_id ||
    !config.name?.startsWith('adventure-omakase-friends-')
  )
    throw Error(
      'Missing explicit Adventure Omakase account/resource configuration.',
    );
  const db = config.d1_databases?.[0],
    bucket = config.r2_buckets?.[0];
  if (!db || !bucket || (provisioned && /^0{8}-/.test(db.database_id)))
    throw Error('Provision the selected environment first.');
  for (const [name, other] of Object.entries(root.env)) {
    if (name === environment) continue;
    if (
      other.name === config.name ||
      other.r2_buckets?.[0]?.bucket_name === bucket.bucket_name ||
      (!/^0{8}-/.test(db.database_id) &&
        other.d1_databases?.[0]?.database_id === db.database_id)
    )
      throw Error('Environments must not share Worker, D1 or R2 resources.');
  }
  return { root, config, db, bucket };
}
export function deployedURL(url) {
  if (!url)
    throw Error(
      'OMAKASE_URL is required, including in CI. No deploy can skip its HTTPS health check.',
    );
  const u = new URL(url);
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== '/'
  )
    throw Error(
      'OMAKASE_URL must be an HTTPS origin without credentials or tokens.',
    );
  return u.origin;
}
