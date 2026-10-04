import { toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/modules/auth/service";
import { exportMyData } from "@/modules/privacy/service";

export const dynamic = "force-dynamic";

/** `GET /api/me/export` — the caller's data as a JSON download (10C). */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireCurrentUser(supabase.auth);
    const data = await exportMyData(user);
    const day = data.exportedAt.slice(0, 10);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="intgetion-export-${day}.json"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
