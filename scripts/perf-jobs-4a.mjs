const origin = process.env.PERF_ORIGIN ?? "http://127.0.0.1:3000";
const samples = [];
for (let i = 0; i < 40; i++) {
  const response = await fetch(`${origin}/api/jobs?limit=20`);
  if (!response.ok)
    throw new Error(`GET /api/jobs failed with ${response.status}`);
  const timing = response.headers
    .get("server-timing")
    ?.match(/jobs;dur=([\d.]+)/)?.[1];
  if (!timing) throw new Error("Missing Server-Timing: jobs metric");
  await response.arrayBuffer();
  samples.push(Number(timing));
}
samples.sort((a, b) => a - b);
const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
console.log(`GET /api/jobs p95=${p95.toFixed(1)} ms (40 requests)`);
if (p95 >= 500) process.exitCode = 1;
