/** Install operator secret from local private record and make a private launch file. */
import { selectedEnvironment, deploymentConfig } from './deployment-config.mjs';
import {
  loadJSON,
  wrangler,
  health,
  writeLaunch,
  admin,
} from './operator-lib.mjs';
const environment = selectedEnvironment();
const { config } = await deploymentConfig(environment);
const op = await loadJSON(`.deploy/${environment}/operator.json`);
if (op.name !== config.name || op.accountId !== config.account_id)
  throw Error('Operator record does not match selected environment.');
await wrangler(['secret', 'put', 'SETUP_KEY', '--env', environment], {
  input: op.setupKey + '\n',
});
const result = await health(op.url);
if (result.setupRequired) await writeLaunch(op);
else {
  const device = await (
    await admin({ ...op, key: op.setupKey }, '/owner-device', 'POST', {})
  ).json();
  await writeLaunch(op, { deviceKey: device.key });
}
