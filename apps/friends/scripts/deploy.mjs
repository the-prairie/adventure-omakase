/** Deploy only an explicit existing environment, then verify exact release over HTTPS. */
import {
  command,
  npm,
  wrangler,
  health,
  privateJSON,
} from './operator-lib.mjs';
import {
  selectedEnvironment,
  deploymentConfig,
  deployedURL,
} from './deployment-config.mjs';
import { buildAssets } from './build.mjs';
try {
  const environment = selectedEnvironment();
  const { config } = await deploymentConfig(environment);
  const url = deployedURL(process.env.OMAKASE_URL);
  if (!url.startsWith(`https://${config.name}.`))
    throw Error(
      'Deployed URL does not match selected Worker. Use its workers.dev URL for this release gate.',
    );
  const release = (
    await command('git', ['rev-parse', 'HEAD'], { capture: true })
  ).trim();
  if (
    (await command('git', ['status', '--porcelain'], { capture: true })).trim()
  )
    throw Error(
      'Commit changes before deployment so release identity is exact.',
    );
  if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== release)
    throw Error('CI checkout differs from requested release.');
  if (
    environment === 'production' &&
    (process.env.GITHUB_ACTIONS !== 'true' ||
      process.env.GITHUB_REF !== 'refs/heads/main' ||
      process.env.OMAKASE_PRODUCTION_APPROVED !== 'true')
  )
    throw Error(
      'Production deploy runs only through the protected manual main-branch workflow.',
    );
  await npm(['run', 'check']);
  await npm(['test']);
  await npm(['run', 'test:cloudflare']);
  await npm(['run', 'test:browser']);
  await buildAssets(release);
  await wrangler(
    ['d1', 'migrations', 'apply', 'DB', '--remote', '--env', environment],
    { input: 'y\n' },
  );
  await wrangler([
    'deploy',
    '--env',
    environment,
    '--assets',
    'dist/assets',
    '--var',
    `RELEASE_SHA:${release}`,
    '--tag',
    release,
  ]);
  const result = await health(url, 60000, release);
  const assets = await fetch(url + '/release.json').then((r) => r.json());
  if (assets.release !== release)
    throw Error('Static assets differ from the deployed Worker release.');
  const report = {
    environment,
    url,
    release,
    workerVersion: result.workerVersion,
    checkedAt: new Date().toISOString(),
  };
  await privateJSON(`.deploy/${environment}/health.json`, report);
  console.log(JSON.stringify(report));
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
