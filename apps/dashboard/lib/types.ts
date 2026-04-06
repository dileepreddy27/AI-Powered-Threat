export type DetectionEvent = {
  id: number;
  detected_at: string;
  model_name: string;
  anomaly_score: number;
  threat_score: number;
  is_anomaly: boolean;
  attack_type: string;
  reason: string;
  source_ip: string;
  destination_ip: string;
  method: string;
  path: string;
  status_code: number;
  bytes_sent: number;
};

export type AlertRow = {
  id: number;
  created_at: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  acknowledged: boolean;
  threat_score: number;
  attack_type: string;
};

export type TimelineRow = {
  bucket: string;
  total_events: string;
  anomalies: string;
  avg_threat_score: string | null;
};

export type ModelRow = {
  model_name: string;
  total_inferences: string;
  avg_anomaly_score: string;
  avg_threat_score: string;
  anomalies: string;
};

