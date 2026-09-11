import { requestHealth } from '@adventure-omakase/api-client/health';
import { NextResponse } from 'next/server';

import { parseStudioEnvironment } from '../../../environment';

export const dynamic = 'force-dynamic';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export async function GET() {
  const environment = parseStudioEnvironment(process.env);

  try {
    const health = await requestHealth(environment.API_BASE_URL, fetch, {
      timeoutMs: environment.API_REQUEST_TIMEOUT_MS,
    });
    return NextResponse.json(health, {
      headers: noStoreHeaders,
      status: 200,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'UPSTREAM_UNAVAILABLE',
          message: 'The API health service is unavailable.',
        },
      },
      {
        headers: noStoreHeaders,
        status: 503,
      },
    );
  }
}
