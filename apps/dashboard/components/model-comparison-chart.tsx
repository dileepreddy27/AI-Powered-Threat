"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModelRow } from "../lib/types";

type Props = {
  rows: ModelRow[];
};

export function ModelComparisonChart({ rows }: Props) {
  const data = rows.map((row) => ({
    model: row.model_name,
    avgThreat: Number(row.avg_threat_score || 0),
    avgAnomaly: Number(row.avg_anomaly_score || 0),
  }));

  return (
    <section className="panel">
      <h2>Model Comparison</h2>
      <p className="muted">Average threat score produced by each anomaly detection model.</p>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3a49" />
            <XAxis dataKey="model" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Bar dataKey="avgThreat" fill="#22c55e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

