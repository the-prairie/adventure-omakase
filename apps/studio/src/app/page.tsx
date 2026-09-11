import { HealthStatus } from '../components/health-status';

export default function HomePage() {
  return (
    <main>
      <header>
        <p className="eyebrow">Curator Studio</p>
        <h1>Adventure Omakase</h1>
        <p className="lede">Technical connectivity status</p>
      </header>
      <section aria-labelledby="connectivity-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Technical tracer</p>
            <h2 id="connectivity-heading">API connectivity</h2>
          </div>
          <span className="environment-label">Local foundation</span>
        </div>
        <HealthStatus apiBaseUrl="/api" />
      </section>
    </main>
  );
}
