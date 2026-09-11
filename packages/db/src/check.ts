import { parseDatabaseEnvironment } from './environment.js';

import { createDatabase } from './index.js';

const environment = parseDatabaseEnvironment(process.env);
const database = createDatabase({ databaseUrl: environment.DATABASE_URL });

try {
  await database.check();
  if (!(await database.hasPostgis()))
    throw new Error('PostGIS extension is not installed.');
  console.log('Database is reachable and PostGIS is installed.');
} finally {
  await database.close();
}
