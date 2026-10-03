import { requireUser } from "@/lib/auth-guards";
import { HttpError, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  assertCanEditCompany,
  setCompanyLogo,
  SupabaseLogoStorage,
} from "@/modules/companies/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ identifier: string }> },
) {
  try {
    const [{ identifier }, supabase] = await Promise.all([
      context.params,
      createSupabaseServerClient(),
    ]);
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    await assertCanEditCompany(identifier, user);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new HttpError(400, "VALIDATION_ERROR", "A logo file is required");
    if (file.size > 2 * 1024 * 1024)
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Logo exceeds the 2 MB limit",
      );
    const saved = await setCompanyLogo(
      identifier,
      Buffer.from(await file.arrayBuffer()),
      file.type,
      new SupabaseLogoStorage(),
    );
    return Response.json({ logoPath: saved.logoPath });
  } catch (error) {
    return toErrorResponse(error);
  }
}
