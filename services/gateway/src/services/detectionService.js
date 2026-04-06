const { pool } = require("../db/pool");
const { detectThreats } = require("./mlClient");
const { normalizeLogRecord } = require("../utils/csv");

async function insertRawLog(client, event) {
  const query = `
    INSERT INTO raw_logs (
      event_time, source_ip, destination_ip, method, path, status_code, bytes_sent, user_agent, payload
    ) VALUES (
      COALESCE($1::timestamptz, NOW()), $2, $3, $4, $5, $6, $7, $8, $9::jsonb
    )
    RETURNING id
  `;
  const values = [
    event.event_time || null,
    event.source_ip || null,
    event.destination_ip || null,
    event.method || "GET",
    event.path || "/",
    Number(event.status_code || 200),
    Number(event.bytes_sent || 0),
    event.user_agent || null,
    JSON.stringify(event.payload || {}),
  ];
  const result = await client.query(query, values);
  return result.rows[0].id;
}

async function insertDetection(client, rawLogId, row) {
  const query = `
    INSERT INTO detections (
      raw_log_id, model_name, anomaly_score, threat_score, is_anomaly, attack_type, reason, metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb
    )
    RETURNING id
  `;
  const values = [
    rawLogId,
    row.model_name,
    row.anomaly_score,
    row.threat_score,
    row.is_anomaly,
    row.attack_type,
    row.reason,
    JSON.stringify({ model_scores: row.model_scores }),
  ];
  const result = await client.query(query, values);
  return result.rows[0].id;
}

async function insertAlert(client, detectionId, row) {
  const severity = row.severity || "medium";
  const title = `${severity.toUpperCase()} threat detected`;
  const description = `${row.attack_type || "unknown"} from ${row.source_ip} on ${row.path}`;
  const query = `
    INSERT INTO alerts (detection_id, severity, title, description)
    VALUES ($1, $2, $3, $4)
  `;
  await client.query(query, [detectionId, severity, title, description]);
}

async function ingestLogs(events, modelName) {
  if (!Array.isArray(events) || events.length === 0) {
    return {
      detections: [],
      summary: {
        count: 0,
        anomalies: 0,
        average_threat_score: 0,
      },
    };
  }

  const normalizedEvents = events.map(normalizeLogRecord);
  const detectionResult = await detectThreats(normalizedEvents, modelName);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const rawLogIds = [];
    for (const event of normalizedEvents) {
      const id = await insertRawLog(client, event);
      rawLogIds.push(id);
    }

    const rows = detectionResult.detections || [];
    let alertCount = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const detectionId = await insertDetection(client, rawLogIds[i], rows[i]);
      const shouldAlert =
        rows[i].is_anomaly && (rows[i].severity === "critical" || rows[i].severity === "high");
      if (shouldAlert) {
        alertCount += 1;
        await insertAlert(client, detectionId, rows[i]);
      }
    }

    await client.query("COMMIT");
    return {
      ...detectionResult,
      persisted: {
        raw_logs: rawLogIds.length,
        detections: rows.length,
        alerts: alertCount,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function fetchEvents(limit = 100) {
  const query = `
    SELECT
      d.id,
      d.detected_at,
      d.model_name,
      d.anomaly_score,
      d.threat_score,
      d.is_anomaly,
      d.attack_type,
      d.reason,
      d.metadata,
      r.source_ip,
      r.destination_ip,
      r.method,
      r.path,
      r.status_code,
      r.bytes_sent,
      r.user_agent
    FROM detections d
    JOIN raw_logs r ON r.id = d.raw_log_id
    ORDER BY d.detected_at DESC
    LIMIT $1
  `;
  const result = await pool.query(query, [limit]);
  return result.rows;
}

async function fetchAlerts(limit = 50, unackedOnly = false) {
  const query = `
    SELECT
      a.id,
      a.created_at,
      a.severity,
      a.title,
      a.description,
      a.acknowledged,
      d.threat_score,
      d.attack_type
    FROM alerts a
    JOIN detections d ON d.id = a.detection_id
    WHERE ($2::boolean = false OR a.acknowledged = false)
    ORDER BY a.created_at DESC
    LIMIT $1
  `;
  const result = await pool.query(query, [limit, unackedOnly]);
  return result.rows;
}

async function acknowledgeAlert(id) {
  const query = `
    UPDATE alerts
    SET acknowledged = true
    WHERE id = $1
    RETURNING id, acknowledged
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

async function fetchTimeline(hours = 24) {
  const query = `
    SELECT
      date_trunc('hour', detected_at) AS bucket,
      COUNT(*) AS total_events,
      COUNT(*) FILTER (WHERE is_anomaly = true) AS anomalies,
      AVG(threat_score) AS avg_threat_score
    FROM detections
    WHERE detected_at >= NOW() - ($1::int || ' hours')::interval
    GROUP BY bucket
    ORDER BY bucket ASC
  `;
  const result = await pool.query(query, [hours]);
  return result.rows;
}

async function fetchModelComparison(hours = 24) {
  const query = `
    SELECT
      model_name,
      COUNT(*) AS total_inferences,
      AVG(anomaly_score) AS avg_anomaly_score,
      AVG(threat_score) AS avg_threat_score,
      COUNT(*) FILTER (WHERE is_anomaly = true) AS anomalies
    FROM detections
    WHERE detected_at >= NOW() - ($1::int || ' hours')::interval
    GROUP BY model_name
    ORDER BY avg_threat_score DESC
  `;
  const result = await pool.query(query, [hours]);
  return result.rows;
}

module.exports = {
  ingestLogs,
  fetchEvents,
  fetchAlerts,
  acknowledgeAlert,
  fetchTimeline,
  fetchModelComparison,
};

