/** Offline fallback developer server; not a Cloudflare runtime substitute. */
import http from 'node:http';
import { Readable } from 'node:stream';
import { resolve } from 'node:path';
import worker from '../build/worker.js';
import { makeEnv } from '../tests/local-bindings.mjs';
const env = makeEnv(resolve(process.env.DATA_DIR || '.local'), {
  maintenance: process.env.MAINTENANCE === '1',
});
if (process.env.SETUP_KEY) env.SETUP_KEY = process.env.SETUP_KEY;
const server = http.createServer(async (req, res) => {
  try {
    const url = 'http://' + req.headers.host + req.url,
      headers = new Headers();
    for (const [k, v] of Object.entries(req.headers))
      if (v) headers.set(k, Array.isArray(v) ? v.join(',') : v);
    const request = new Request(url, {
      method: req.method,
      headers,
      ...(!['GET', 'HEAD'].includes(req.method)
        ? { body: Readable.toWeb(req), duplex: 'half' }
        : {}),
    });
    const response = await worker.fetch(request, env, {
      waitUntil: (p) => p.catch(console.error),
    });
    res.statusCode = response.status;
    for (const [key, value] of response.headers) res.setHeader(key, value);
    if (response.body) Readable.fromWeb(response.body).pipe(res);
    else res.end();
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end('Local harness error');
  }
});
server.listen(Number(process.env.PORT || 8787), '127.0.0.1', () =>
  console.log(
    'LOCAL SQLITE/R2 ADAPTER (not workerd): http://127.0.0.1:' +
      (process.env.PORT || 8787),
  ),
);
process.on('SIGTERM', () =>
  server.close(() => {
    env.DB.close();
    process.exit(0);
  }),
);
