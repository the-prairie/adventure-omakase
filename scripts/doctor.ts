import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';

const EXPECTED_NODE_MAJOR = 24;
const EXPECTED_PNPM = '11.22.0';
const REQUIRED_ENV = ['DATABASE_URL'] as const;
const PORTS = [3000, 4000, 54320] as const;

function commandVersion(command: string, args: string[]): string | undefined {
  try {
    return execFileSync(command, args, { encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

const failures: string[] = [];
const warnings: string[] = [];
const nodeMajor = Number.parseInt(
  process.versions.node.split('.')[0] ?? '',
  10,
);

if (nodeMajor !== EXPECTED_NODE_MAJOR) {
  failures.push(
    `Node ${process.versions.node} detected; use Node 24.19.0 from .nvmrc.`,
  );
}

const pnpmVersion = commandVersion('pnpm', ['--version']);
if (pnpmVersion !== EXPECTED_PNPM) {
  failures.push(
    `pnpm ${pnpmVersion ?? 'not found'} detected; use pnpm ${EXPECTED_PNPM}.`,
  );
}

if (!commandVersion('docker', ['--version'])) {
  failures.push('Docker was not found. Install and start Docker Desktop.');
}

const envFile = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
for (const key of REQUIRED_ENV) {
  if (!process.env[key] && !new RegExp(`^${key}=.+$`, 'm').test(envFile)) {
    failures.push(
      `${key} is missing. Copy .env.example to .env and review it.`,
    );
  }
}

async function main(): Promise<void> {
  for (const port of PORTS) {
    if (!(await isPortAvailable(port))) {
      warnings.push(
        `Port ${port} is already occupied; confirm the expected service owns it.`,
      );
    }
  }

  for (const warning of warnings) console.warn(`WARN: ${warning}`);
  for (const failure of failures) console.error(`ERROR: ${failure}`);

  if (failures.length > 0) process.exitCode = 1;
  else console.log('Local prerequisites are ready.');
}

void main();
