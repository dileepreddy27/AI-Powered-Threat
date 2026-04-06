"use client";

import { FormEvent, useState } from "react";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

type UploadResult = {
  uploaded_rows: number;
  summary?: {
    count: number;
    anomalies: number;
    average_threat_score: number;
    selected_model: string;
  };
  persisted?: {
    raw_logs: number;
    detections: number;
    alerts: number;
  };
};

export function UploadPanel() {
  const [modelName, setModelName] = useState("isolation_forest");
  const [status, setStatus] = useState<string>("");
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      setStatus("Choose a CSV file before uploading.");
      return;
    }

    const payload = new FormData();
    payload.append("file", file);
    payload.append("modelName", modelName);

    setStatus("Processing logs...");
    setLastResult(null);

    try {
      const response = await fetch(`${GATEWAY_URL}/api/upload`, {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const json = (await response.json()) as UploadResult;
      setLastResult(json);
      setStatus("Detection completed successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown upload error";
      setStatus(message);
    }
  }

  return (
    <section className="panel">
      <h2>Ingest Logs</h2>
      <p className="muted">Upload CSV traffic logs to run anomaly detection and generate alerts.</p>
      <form onSubmit={onSubmit} className="upload-form">
        <input name="file" type="file" accept=".csv,text/csv" required />
        <select value={modelName} onChange={(event) => setModelName(event.target.value)} name="modelName">
          <option value="isolation_forest">Isolation Forest</option>
          <option value="one_class_svm">One-Class SVM</option>
          <option value="autoencoder">Autoencoder (PyTorch)</option>
        </select>
        <button type="submit">Run Detection</button>
      </form>
      {status && <p className="status">{status}</p>}
      {lastResult && (
        <div className="result-grid">
          <div>
            <span>Rows Uploaded</span>
            <strong>{lastResult.uploaded_rows}</strong>
          </div>
          <div>
            <span>Anomalies</span>
            <strong>{lastResult.summary?.anomalies ?? 0}</strong>
          </div>
          <div>
            <span>Avg Threat Score</span>
            <strong>{lastResult.summary?.average_threat_score?.toFixed(2) ?? "0.00"}</strong>
          </div>
          <div>
            <span>New Alerts</span>
            <strong>{lastResult.persisted?.alerts ?? 0}</strong>
          </div>
        </div>
      )}
    </section>
  );
}

