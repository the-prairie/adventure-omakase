'use client';

import { useHealthConnection } from '@adventure-omakase/api-client/react';

export function HealthStatus({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { connection, retry } = useHealthConnection(apiBaseUrl);

  if (connection.status === 'loading') {
    return (
      <section className="status-panel" aria-live="polite">
        <span className="status-dot status-dot-loading" aria-hidden="true" />
        <div role="status">
          <strong>Checking API connection</strong>
          <p>Waiting for the shared health contract.</p>
        </div>
      </section>
    );
  }

  if (connection.status === 'unavailable') {
    return (
      <section className="status-panel" aria-live="polite">
        <span
          className="status-dot status-dot-unavailable"
          aria-hidden="true"
        />
        <div>
          <strong>Unavailable</strong>
          <p>The API health contract could not be verified.</p>
          <button type="button" onClick={() => void retry()}>
            Retry API connection
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="status-panel" aria-live="polite">
      <span className="status-dot status-dot-connected" aria-hidden="true" />
      <div>
        <strong>Connected</strong>
        <dl>
          <div>
            <dt>Service</dt>
            <dd>{connection.health.service}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{connection.health.version}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
