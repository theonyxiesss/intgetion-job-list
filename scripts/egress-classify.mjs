/**
 * Delivery-stream labels for the egress report.
 * Rules run in order and the first match wins, so overlapping query texts
 * classify deterministically. Most specific markers come first:
 *   1. import      md5( (import hashes descriptions)
 *   2. matching    matching_ tables
 *   3. live-state  select "id", "status", "expires_at"
 *   4. company     "jobs"."company_id" = $
 *   5. job-page    "jobs"."id" = $ together with limit
 *   6. catalog     order by "jobs"."published_at"
 *   7. other
 */
const RULES = [
  ["import", (sql) => sql.includes("md5(")],
  ["matching", (sql) => sql.includes("matching_")],
  ["live-state", (sql) => sql.includes('select "id", "status", "expires_at"')],
  ["company", (sql) => sql.includes('"jobs"."company_id" = $')],
  [
    "job-page",
    (sql) => sql.includes('"jobs"."id" = $') && /\blimit\b/i.test(sql),
  ],
  ["catalog", (sql) => sql.includes('order by "jobs"."published_at"')],
];

/**
 * @param {string} sql query text from pg_stat_statements
 * @returns {string} stream label, or "other"
 */
export function classifyQuery(sql) {
  const text = String(sql);
  for (const [label, test] of RULES) {
    if (test(text)) return label;
  }
  return "other";
}
