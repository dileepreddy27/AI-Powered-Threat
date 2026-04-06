import { AlertsPanel } from "../components/alerts-panel";
import { EventTable } from "../components/event-table";
import { ModelComparisonChart } from "../components/model-comparison-chart";
import { TimelineChart } from "../components/timeline-chart";
import { UploadPanel } from "../components/upload-panel";
import { fetchAlerts, fetchEvents, fetchModelComparison, fetchTimeline } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [events, alerts, timeline, models] = await Promise.all([
    fetchEvents().catch(() => []),
    fetchAlerts().catch(() => []),
    fetchTimeline().catch(() => []),
    fetchModelComparison().catch(() => []),
  ]);

  const anomalyCount = events.filter((event) => event.is_anomaly).length;
  const averageThreat =
    events.length > 0 ? events.reduce((sum, event) => sum + Number(event.threat_score || 0), 0) / events.length : 0;

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">AI-Powered Threat Detection System</p>
        <h1>Threat Shield</h1>
        <p className="hero-copy">
          Monitor traffic behavior, detect anomalies in near real-time, and prioritize incidents with model-backed threat scoring.
        </p>
      </header>

      <section className="summary-grid">
        <article className="summary-card">
          <span>Total Inferences</span>
          <strong>{events.length}</strong>
        </article>
        <article className="summary-card">
          <span>Anomalies</span>
          <strong>{anomalyCount}</strong>
        </article>
        <article className="summary-card">
          <span>Average Threat Score</span>
          <strong>{averageThreat.toFixed(2)}</strong>
        </article>
        <article className="summary-card">
          <span>Open Alerts</span>
          <strong>{alerts.length}</strong>
        </article>
      </section>

      <UploadPanel />

      <section className="panel-grid">
        <TimelineChart rows={timeline} />
        <ModelComparisonChart rows={models} />
      </section>

      <AlertsPanel alerts={alerts} />
      <EventTable events={events} />
    </main>
  );
}

