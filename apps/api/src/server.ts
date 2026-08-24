import { createDatabase } from '@adventure-omakase/db';

import { buildApp } from './app.js';
import { parseApiEnvironment } from './environment.js';

const environment = parseApiEnvironment(process.env);
const database = createDatabase({ databaseUrl: environment.DATABASE_URL });
const app = await buildApp({ database, environment });

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, 'Shutting down API');
  await app.close();
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

try {
  await app.listen({ host: environment.API_HOST, port: environment.API_PORT });
} catch (error) {
  app.log.fatal({ error }, 'API failed to start');
  await app.close();
  process.exit(1);
}
