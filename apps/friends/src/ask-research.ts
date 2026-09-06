import { AskError, type Place, type Source } from './ask-contract.js';

export const hashText = async (s: string): Promise<string> =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
/** Only public HTTPS pages. Redirects are checked independently and never inherit cookies. */
export function publicURL(value: string): URL {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new AskError(422, 'Use a public HTTPS page.');
  }
  const h = u.hostname.toLowerCase();
  if (
    u.protocol !== 'https:' ||
    u.port ||
    u.username ||
    u.password ||
    !h.includes('.') ||
    /(^|\.)(localhost|local|internal|test|invalid)$/.test(h) ||
    /^[\d.]+$/.test(h) ||
    h.includes(':') ||
    h.startsWith('[')
  )
    throw new AskError(422, 'Only public HTTPS websites can be checked.');
  u.hash = '';
  return u;
}
function privateAddress(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s.includes(':'))
    return /^(::|fc|fd|fe[89ab]|ff)/.test(s) || s.includes('ffff:');
  const n = s.split('.').map(Number);
  return (
    n.length !== 4 ||
    n.some((x) => !Number.isInteger(x) || x < 0 || x > 255) ||
    [0, 10, 127].includes(n[0]) ||
    n[0] >= 224 ||
    (n[0] === 169 && n[1] === 254) ||
    (n[0] === 172 && n[1] >= 16 && n[1] <= 31) ||
    (n[0] === 192 && [0, 168].includes(n[1])) ||
    (n[0] === 100 && n[1] >= 64 && n[1] <= 127) ||
    (n[0] === 198 && [18, 19].includes(n[1]))
  );
}
async function checkDNS(
  host: string,
  signal: AbortSignal,
  fetcher: typeof fetch,
): Promise<void> {
  const r = await fetcher(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
    { headers: { accept: 'application/dns-json' }, signal },
  );
  if (!r.ok) throw new Error('Source DNS unavailable');
  const d = (await r.json()) as {
    Answer?: { type: number; data: string }[];
  };
  const addresses = (d.Answer || []).filter(
    (a) => a.type === 1 || a.type === 28,
  );
  if (!addresses.length || addresses.some((a) => privateAddress(a.data)))
    throw new Error('Source address is not public');
}
async function boundedText(response: Response, max = 240000): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let size = 0,
    text = '';
  try {
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.byteLength;
      if (size > max) throw new Error('Source too large');
      text += decoder.decode(r.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel().catch(() => {
      /* Reader already closed or aborted. */
    });
  }
}
export const pageText = (html: string): string =>
  html
    .replace(/<(script|style|nav|footer|header)[\s>][\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
export async function readPage(
  place: Place,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<Source> {
  const checkedAt = new Date().toISOString(),
    id = 'src-' + (await hashText(place.id + '|' + place.source)).slice(0, 24);
  try {
    let url = publicURL(place.source),
      response: Response | undefined;
    for (let redirect = 0; redirect < 4; redirect++) {
      await checkDNS(url.hostname, signal, fetcher);
      response = await fetcher(url, {
        redirect: 'manual',
        signal,
        headers: {
          'User-Agent': 'AdventureOmakase/1.0 (personal trip research)',
          Accept: 'text/html,text/plain;q=0.9',
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const next = response.headers.get('location');
        if (!next) throw new Error('Missing redirect');
        url = publicURL(new URL(next, url).href);
        continue;
      }
      break;
    }
    if (
      !response?.ok ||
      !/text\/(html|plain)|application\/xhtml/.test(
        response.headers.get('content-type') || '',
      )
    )
      throw new Error('Page unavailable');
    const html = await boundedText(response),
      text = pageText(html).slice(0, 6500);
    if (text.length < 100) throw new Error('No readable page content');
    return {
      id,
      discoveryId: place.id,
      url: url.href,
      title: place.title,
      checkedAt,
      status: 'read',
      text,
      digest: await hashText(text),
      cached: false,
    };
  } catch (e) {
    if (signal.aborted) throw e;
    return {
      id,
      discoveryId: place.id,
      url: place.source,
      title: place.title,
      checkedAt,
      status: 'unavailable',
      text: '',
      digest: '',
      cached: false,
    };
  }
}
/** Wikimedia is discovery search, never a booking or operating-hours service.
 * New cards retain Wikipedia provenance until the person checks an official page.
 */
export async function searchPlaces(
  query: string,
  region: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<Place[]> {
  const area =
    region === 'osaka'
      ? 'Osaka'
      : region === 'tokyo'
        ? 'Tokyo'
        : region === 'okinawa'
          ? 'Okinawa'
          : 'Japan';
  const topic = /museum/i.test(query)
    ? 'museum'
    : /restaurant|lunch|food/i.test(query)
      ? 'restaurant'
      : query
          .replace(new RegExp(area, 'ig'), '')
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .join(' ');
  const u = new URL('https://en.wikipedia.org/w/api.php');
  u.search = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${area} ${topic}`,
    gsrnamespace: '0',
    gsrlimit: '3',
    prop: 'extracts|info',
    exintro: '1',
    explaintext: '1',
    exchars: '700',
    inprop: 'url',
    format: 'json',
    origin: '*',
  }).toString();
  const r = await fetcher(u, {
    signal,
    headers: {
      'User-Agent': 'AdventureOmakase/1.0 (personal travel research)',
    },
  });
  if (!r.ok) return [];
  const data = (await r.json()) as {
    query?: {
      pages?: Record<
        string,
        { pageid: number; title: string; extract?: string; fullurl?: string }
      >;
    };
  };
  return Object.values(data.query?.pages || {})
    .filter((p) => p.fullurl)
    .map((p) => ({
      id: 'web-' + p.pageid,
      title: p.title,
      region,
      area,
      source: p.fullurl!,
      minutes: 90,
      why: (
        p.extract || 'New research lead; suitability not yet established.'
      ).slice(0, 500),
      external: true,
    }));
}
