"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TimelineRow } from "../lib/types";

type Props = {
  rows: TimelineRow[];
};

function formatHour(value: string): string {
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, "0")}:00`;
}

export function TimelineChart({ rows }: Props) {
  const data = rows.map((row) => ({
    bucket: formatHour(row.bucket),
    anomalies: Number(row.anomalies || 0),
    total: Number(row.total_events || 0),
  }));

  return (
    <section className="panel">
      <h2>Attack Timeline</h2>
      <p className="muted">Hourly trend of detected anomalies in the selected window.</p>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3a49" />
            <XAxis dataKey="bucket" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Area type="monotone" dataKey="anomalies" stroke="#f97316" fill="url(#anomalyGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

