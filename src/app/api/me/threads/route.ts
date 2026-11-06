import { toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listOwnApplicationCards } from "@/modules/applications/service";
import { listOrders } from "@/modules/freelance/service";

export type ChatThread =
  | {
      kind: "recruiter";
      id: string;
      jobId: string;
      title: string;
      company: string;
      status: string;
      coverNote: string | null;
      at: string;
    }
  | {
      kind: "client";
      id: string;
      title: string;
      side: "buyer" | "seller";
      status: string;
      at: string;
    };

/**
 * `GET /api/me/threads` — the "clients and recruiters" list of the chat
 * home (TZ 53): one thread per job application and per freelance order.
 * A guest has none.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    if (!user || user.status !== "active") {
      return Response.json(
        { threads: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const [applications, buying, selling] = await Promise.all([
      listOwnApplicationCards(user.id),
      listOrders(user.id, "buyer"),
      listOrders(user.id, "seller"),
    ]);
    const threads: ChatThread[] = [
      ...applications.map((row): ChatThread => ({
        kind: "recruiter",
        id: row.id,
        jobId: row.jobId,
        title: row.jobTitle,
        company: row.companyName,
        status: row.status,
        coverNote: row.coverNote,
        at: row.createdAt,
      })),
      ...[...buying, ...selling].map((order): ChatThread => ({
        kind: "client",
        id: order.id,
        title: order.serviceTitle,
        side: order.side,
        status: order.status,
        at: order.updatedAt.toISOString(),
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    return Response.json(
      { threads },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
