import { AlertRow, DetectionEvent, ModelRow, TimelineRow } from "./types";

const PUBLIC_GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";
const INTERNAL_GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL || PUBLIC_GATEWAY_URL;

function resolveGatewayUrl() {
  return typeof window === "undefined" ? INTERNAL_GATEWAY_URL : PUBLIC_GATEWAY_URL;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${resolveGatewayUrl()}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed request: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchEvents(limit = 120): Promise<DetectionEvent[]> {
  const result = await getJson<{ events: DetectionEvent[] }>(`/api/events?limit=${limit}`);
  return result.events;
}

export async function fetchAlerts(limit = 30): Promise<AlertRow[]> {
  const result = await getJson<{ alerts: AlertRow[] }>(`/api/alerts?limit=${limit}`);
  return result.alerts;
}

export async function fetchTimeline(hours = 24): Promise<TimelineRow[]> {
  const result = await getJson<{ timeline: TimelineRow[] }>(`/api/timeline?hours=${hours}`);
  return result.timeline;
}

export async function fetchModelComparison(hours = 24): Promise<ModelRow[]> {
  const result = await getJson<{ models: ModelRow[] }>(`/api/model-comparison?hours=${hours}`);
  return result.models;
}
