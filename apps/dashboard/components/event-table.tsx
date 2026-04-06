import { DetectionEvent } from "../lib/types";

type Props = {
  events: DetectionEvent[];
};

export function EventTable({ events }: Props) {
  return (
    <section className="panel">
      <h2>Threat Feed</h2>
      <p className="muted">Latest detection decisions with model score, threat score, and reason.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Source</th>
              <th>Endpoint</th>
              <th>Model</th>
              <th>Threat</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={6}>No events yet. Upload logs to start detection.</td>
              </tr>
            )}
            {events.map((event) => (
              <tr key={event.id} className={event.is_anomaly ? "row-anomaly" : ""}>
                <td>{new Date(event.detected_at).toLocaleString()}</td>
                <td>{event.source_ip}</td>
                <td>{event.method} {event.path}</td>
                <td>{event.model_name}</td>
                <td>{Number(event.threat_score).toFixed(1)}</td>
                <td>{event.attack_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

