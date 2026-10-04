import { getMetricsSnapshot } from "../repo/metrics-repo";

export async function getMetrics() {
  return getMetricsSnapshot();
}
