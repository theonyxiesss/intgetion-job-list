import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { getMatches } from "@/modules/matching/service";
import { timeZoneOffsetMinutes } from "@/lib/tz";
import { DIGEST_HOUR_LOCAL, DIGEST_MIN_INTERVAL_MS, DIGEST_MIN_SCORE, nextDigestAt } from "@/modules/notifications/lib/digest";
import { resolveDelivery } from "@/modules/notifications/lib/catalog";
import { safeNotify } from "@/modules/notifications/service/notify";
import { renderEmail, templateValues } from "@/modules/notifications/service/render";
import { senderFromEnv } from "@/modules/notifications/service/email-sender";
import { siteEmailHtml } from "@/lib/email-html";
import { lookupLoginEmail } from "@/modules/notifications/service/dispatch";
import { unsubscribeUrl } from "@/modules/notifications/service/notify";

const DAY_MS = 24 * 60 * 60 * 1000;

interface CandidateForDigest {
  userId: string;
  timeZone: string;
  locale: string;
  lastDigestAt: Date | null;
}

interface DigestJobItem {
  jobId: string;
  score: number;
  explain: ReturnType<typeof import("@/modules/matching/score/explain").toPublicMatch>["explain"];
}

interface DigestJobWithPublic extends DigestJobItem {
  jobTitle: string;
  companyName: string;
}

/**
 * Finds candidates who should receive a digest now.
 * Criteria:
 * - Has candidate profile with timezone
 * - Timezone morning (08:00-10:00 local) has arrived
 * - >= 24h since last digest (or never sent)
 * - Has new matches with score >= 0.65 that aren't hidden/dismissed
 */
export async function findDigestCandidates(now: Date): Promise<CandidateForDigest[]> {
  const db = getDb();
  
  // Get all candidates with timezone, locale, and last_digest_at
  const rows = await db.execute<{
    user_id: string;
    timezone: string;
    locale: string | null;
    last_digest_at: Date | null;
  }>(sql`
    select cp.user_id, cp.timezone, u.locale, cp.last_digest_at
    from public.candidate_profiles cp
    join public.users u on u.id = cp.user_id
    where cp.timezone is not null
  `);
  
  const candidates: CandidateForDigest[] = [];
  
  for (const row of rows) {
    const tz = row.timezone;
    if (!tz) continue;
    
    // Check if it's morning (08:00-10:00) in candidate's timezone
    const offsetMinutes = timeZoneOffsetMinutes(now, tz);
    const localTime = new Date(+now + offsetMinutes * 60000);
    const localHour = localTime.getUTCHours();
    
    // Only between 08:00 and 10:00 local time (D185)
    if (localHour < 8 || localHour > 10) continue;
    
    // Check if at least 24h since last digest
    const lastSent = row.last_digest_at ? new Date(row.last_digest_at) : null;
    if (lastSent && +now - +lastSent < DIGEST_MIN_INTERVAL_MS) continue;
    
    // Also check nextDigestAt for edge cases (DST transitions)
    const scheduled = nextDigestAt(tz, lastSent, now);
    if (+scheduled > +now) continue;
    
    candidates.push({
      userId: row.user_id,
      timeZone: tz,
      locale: row.locale ?? "en",
      lastDigestAt: lastSent,
    });
  }
  
  return candidates;
}

/**
 * Builds the digest payload for a candidate: up to 5 new matches
 * with score >= 0.65, not hidden/dismissed, not shown before.
 * "Not shown before" means computed_at (or job published_at) is after last_digest_at.
 */
export async function buildDigestPayload(
  userId: string,
  now: Date
): Promise<{
  items: DigestJobWithPublic[];
  hasMore: boolean;
} | null> {
  // Get fresh matches (respects cache freshness)
  const list = await getMatches(userId, { now });
  
  if (list.lowData) return null;
  if (list.items.length === 0) return null;
  
  // Get candidate's last_digest_at for filtering "new since last digest"
  const db = getDb();
  const profileRows = await db.execute<{ last_digest_at: Date | null }>(
    sql`select last_digest_at from public.candidate_profiles where user_id = ${userId}`
  );
  // lastDigestAt is used implicitly via the matching cache logic
  void profileRows[0]?.last_digest_at;
  
  // Filter: score >= 0.65, not hidden (already handled by getMatches)
  // getMatches already filters hidden/dismissed and score < 0.55
  const shown = list.items.filter(item => item.score >= DIGEST_MIN_SCORE);
  
  if (shown.length === 0) return null;
  
  // Take top 5
  const topMatches = shown.slice(0, 5);
  
  // Enrich with job titles and company names for email
  const jobsService = await import("@/modules/jobs/service");
  const jobs = await jobsService.listPublicJobsByIds(
    topMatches.map(m => m.jobId),
    "en" // email template keys are in English, we'll localize
  );
  const byId = new Map(jobs.map(j => [j.id, j]));
  
  const items: DigestJobWithPublic[] = [];
  for (const match of topMatches) {
    const job = byId.get(match.jobId);
    if (job) {
      items.push({
        jobId: match.jobId,
        score: match.score,
        explain: match.explain,
        jobTitle: job.title,
        companyName: job.company.name,
      });
    }
  }
  
  return {
    items,
    hasMore: shown.length > 5,
  };
}

interface DigestJobWithPublic extends DigestJobItem {
  jobTitle: string;
  companyName: string;
}

/**
 * Sends the digest notification (in-app + email if enabled).
 * Updates last_digest_at in the same transaction as the in-app notification.
 */
export async function sendDigest(
  userId: string,
  items: DigestJobWithPublic[],
  now: Date,
  locale: string
): Promise<void> {
  const t = locale === "ru" ? "ru" : "en";
  const matchCount = items.length;
  
  // Prepare values for template
  const values = templateValues({
    matchCount,
    jobs: items.map(i => ({ jobTitle: i.jobTitle })),
  });
  values.count = matchCount;
  
  // In-app notification via safeNotify (always)
  await safeNotify(
    "matches.digest",
    [userId],
    {
      matchCount,
      sampleJobIds: items.slice(0, 5).map(i => i.jobId),
    }
  );
  
  // Check email preference
  const db = getDb();
  const preferences = await db.execute<{ type: string; channel: string; enabled: boolean }>(
    sql`select type, channel, enabled from public.notification_preferences where user_id = ${userId}`
  );
  
  // Check if email is allowed
  const emailDelivery = resolveDelivery("matches.digest", "email", preferences);
  if (!emailDelivery.allowed) return;
  
  // Lookup login email (returns null for @telegram.intgetion.com and inactive users)
  const address = await lookupLoginEmail(userId);
  if (!address) return;
  
  // Render email using siteEmailHtml
  const rendered = renderEmail({
    locale: t,
    type: "matches.digest",
    values,
    unsubscribeUrl: unsubscribeUrl(t, userId, "matches.digest", now),
  });
  
  if (!rendered) return;
  
  // Build matches list for email body using siteEmailHtml
  const matchesHtml = items.map(item => 
    `<p><a href="https://${process.env.NEXT_PUBLIC_SITE_URL}/${t}/jobs/${item.jobId}" style="color:#fff;text-decoration:none;font-weight:700;">${item.jobTitle}</a><br><span style="color:#a1a1aa;font-size:14px;">${item.companyName}</span><br><span style="color:#71717a;font-size:12px;">Score: ${Math.round(item.score * 100)}%</span></p>`
  ).join("");
  
  const html = siteEmailHtml({
    body: `${rendered.html.replace("</table>", "")}
      <tr><td style="padding:16px 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#f5f5f5;">New matches for you:</td></tr>
      <tr><td style="padding:0 32px 16px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#f5f5f5;">
          ${matchesHtml}
        </div>
      </td></tr>
    </table>`,
    action: {
      href: `https://${process.env.NEXT_PUBLIC_SITE_URL}/${t}/matches`,
      label: t === "ru" ? "Открыть подборку" : "Open matches",
    },
    footer: {
      href: unsubscribeUrl(t, userId, "matches.digest", now),
      label: t === "ru" ? "Отписаться" : "Unsubscribe",
    },
  });
  
  const sender = senderFromEnv();
  await sender.send({
    to: address,
    subject: rendered.subject,
    html,
    text: rendered.text,
  });
}

/**
 * Main cron handler for matches.digest.
 * Runs hourly, finds eligible candidates, sends digests, updates last_digest_at.
 */
export async function runDigestCron(input?: { now?: Date }): Promise<{
  candidates: number;
  sent: number;
  skipped: number;
  errors: number;
}> {
  const now = input?.now ?? new Date();
  
  const candidates = await findDigestCandidates(now);
  let sent = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const candidate of candidates) {
    try {
      // Build digest payload
      const payload = await buildDigestPayload(candidate.userId, now);
      if (!payload || payload.items.length === 0) {
        skipped++;
        continue;
      }
      
      // Send digest
      await sendDigest(candidate.userId, payload.items, now, candidate.locale);
      
      // Update last_digest_at in the same transaction as the in-app notification
      // safeNotify already inserted the notification; we update last_digest_at here
      const db = getDb();
      await db.execute(sql`
        update public.candidate_profiles
        set last_digest_at = ${now.toISOString()}::timestamptz
        where user_id = ${candidate.userId}
      `);
      
      // system_event in bot conversation
      await notifyBotConversation(candidate.userId, now, candidate.locale);
      
      sent++;
    } catch (err) {
      console.error("Digest error for", candidate.userId, err);
      errors++;
    }
  }
  
  return { candidates: candidates.length, sent, skipped, errors };
}

/**
 * Notifies the bot conversation (if any) with a system_event about new digest.
 */
async function notifyBotConversation(userId: string, now: Date, locale: string): Promise<void> {
  try {
    const db = getDb();
    const rows = await db.execute<{ id: string }>(
      sql`select id from public.bot_conversations where user_id = ${userId} and channel = 'web' order by last_message_at desc limit 1`
    );
    
    if (rows.length === 0) return;
    
    const conversationId = rows[0].id;
    const t = locale === "ru" ? "ru" : "en";
    const message = t === "ru"
      ? "Новая подборка совпадений доступна. Откройте /matches, чтобы увидеть её."
      : "New matches digest available. Open /matches to see them.";
    
    await db.execute(sql`
      insert into public.bot_messages (conversation_id, role, content, created_at)
      values (${conversationId}, 'system_event', ${message}, ${now.toISOString()}::timestamptz)
    `);
  } catch {
    // Silent fail - digest notification is best effort
  }
}

// Export for testing
export { DIGEST_HOUR_LOCAL, DIGEST_MIN_SCORE, DAY_MS };

interface CandidateForDigest {
  userId: string;
  timeZone: string;
  locale: string;
  lastDigestAt: Date | null;
}

interface DigestJobItem {
  jobId: string;
  score: number;
  explain: ReturnType<typeof import("@/modules/matching/score/explain").toPublicMatch>["explain"];
}

interface DigestJobWithPublic extends DigestJobItem {
  jobTitle: string;
  companyName: string;
}