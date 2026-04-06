const { parse } = require("csv-parse/sync");

function normalizeLogRecord(record) {
  const statusCode = Number(record.status_code || 200);
  const bytesSent = Number(record.bytes_sent || 0);

  return {
    event_time: record.event_time || null,
    source_ip: record.source_ip || null,
    destination_ip: record.destination_ip || null,
    method: record.method || "GET",
    path: record.path || "/",
    status_code: Number.isNaN(statusCode) ? 200 : statusCode,
    bytes_sent: Number.isNaN(bytesSent) ? 0 : bytesSent,
    user_agent: record.user_agent || null,
    payload: {},
  };
}

function parseCsvBuffer(buffer) {
  const text = buffer.toString("utf8");
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records.map(normalizeLogRecord);
}

module.exports = { parseCsvBuffer, normalizeLogRecord };

