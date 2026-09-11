/** Recognize only the native development proxy's plain-text disconnect response. */
export function isLocalRuntimeDisconnect({
  method,
  url,
  expectedOrigin,
  status,
  body,
}) {
  try {
    const target = new URL(url),
      expected = new URL(expectedOrigin);
    return (
      method === 'GET' &&
      status === 500 &&
      expected.protocol === 'http:' &&
      expected.hostname === '127.0.0.1' &&
      target.origin === expected.origin &&
      target.pathname === '/' &&
      /^Error: Network connection lost\.\n[ \t]+at async Object\.fetch \(file:\/\/\/[^\n]*\/miniflare\/dist\/src\/workers\/core\/entry\.worker\.js:\d+:\d+\)\s*$/.test(
        body,
      )
    );
  } catch {
    return false;
  }
}
