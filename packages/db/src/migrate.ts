import { parseDatabaseEnvironment } from './environment.js';

import { createDatabase } from './index.js';

const environment = parseDatabaseEnvironment(process.env);
const database = createDatabase({ databaseUrl: environment.DATABASE_URL });

try {
  await database.migrate();
  console.log('Database migrations applied.');
} finally {
  await database.close();
}
