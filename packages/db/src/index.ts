import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

export interface Database {
  check(): Promise<void>;
  close(): Promise<void>;
  hasPostgis(): Promise<boolean>;
  migrate(): Promise<void>;
}

export function createDatabase({
  databaseUrl,
}: {
  databaseUrl: string;
}): Database {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = drizzle(pool);

  return {
    async check() {
      await pool.query('select 1');
    },
    async close() {
      await pool.end();
    },
    async hasPostgis() {
      const result = await pool.query<{ installed: boolean }>(
        "select exists(select 1 from pg_extension where extname = 'postgis') as installed",
      );
      return result.rows[0]?.installed ?? false;
    },
    async migrate() {
      await migrate(client, {
        migrationsFolder: new URL('../drizzle', import.meta.url).pathname,
      });
    },
  };
}
