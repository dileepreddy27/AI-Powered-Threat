import { AlertRow } from "../lib/types";

type Props = {
  alerts: AlertRow[];
};

export function AlertsPanel({ alerts }: Props) {
  return (
    <section className="panel">
      <h2>Live Alerts</h2>
      <p className="muted">Critical and high-severity anomalies are promoted to incident alerts.</p>
      <div className="alerts-list">
        {alerts.length === 0 && <p className="muted">No alerts have been generated yet.</p>}
        {alerts.map((alert) => (
          <article key={alert.id} className={`alert-card severity-${alert.severity}`}>
            <header>
              <span>{alert.severity.toUpperCase()}</span>
              <time>{new Date(alert.created_at).toLocaleString()}</time>
            </header>
            <h3>{alert.title}</h3>
            <p>{alert.description}</p>
            <small>Threat score: {Number(alert.threat_score).toFixed(1)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

