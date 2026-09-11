import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deployedURL,
  deploymentConfig,
  selectedEnvironment,
} from '../scripts/deployment-config.mjs';
import { health } from '../scripts/operator-lib.mjs';
import { createServer } from 'node:http';

test('deployment fails closed without URL or an explicit isolated environment', async () => {
  assert.throws(() => deployedURL(), /required/);
  for (const url of [
    'http://example.com',
    'https://example.com/#join=secret',
    'https://user:secret@example.com',
    'https://example.com/path',
  ])
    assert.throws(() => deployedURL(url));
  assert.equal(
    deployedURL('https://preview.example.com'),
    'https://preview.example.com',
  );
  assert.throws(() => selectedEnvironment(['--env', 'unknown']));
  for (const env of ['preview', 'production', 'restore'])
    assert.equal(
      (await deploymentConfig(env, { provisioned: false })).config.name,
      `adventure-omakase-friends-${env}`,
    );
});
test('deployment health rejects old commits even when version is healthy', async () => {
  const server = createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        platform: 'cloudflare',
        version: '3.0.0',
        release: 'old',
      }),
    );
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await health(url, 50, 'old')).release, 'old');
    await assert.rejects(health(url, 50, 'new'), /did not become healthy/);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
