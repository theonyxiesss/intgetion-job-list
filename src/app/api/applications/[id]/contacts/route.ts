import { toErrorResponse, notFound } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readApplicationContacts } from "@/modules/applications/service";
import { getCurrentUser } from "@/modules/auth/service";
import { z } from "zod";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    if (!user) throw notFound();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    return Response.json(
      await readApplicationContacts(user.id, id, clientIp(request.headers)),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
