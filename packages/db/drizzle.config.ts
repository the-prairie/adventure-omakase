import { defineConfig } from 'drizzle-kit';

import { parseDatabaseEnvironment } from './src/environment.js';

const environment = parseDatabaseEnvironment(process.env);

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/schema.ts',
  dbCredentials: { url: environment.DATABASE_URL },
  strict: true,
  verbose: true,
});
