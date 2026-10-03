import { requireUser } from "@/lib/auth-guards";
import { HttpError, readFormDataLimited, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  assertCanEditCompany,
  LOGO_MAX_BYTES,
  setCompanyLogo,
  SupabaseLogoStorage,
} from "@/modules/companies/service";

// The 2 MB file plus room for multipart boundaries and headers.
const MAX_BODY_BYTES = LOGO_MAX_BYTES + 64 * 1024;

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
    const form = await readFormDataLimited(request, MAX_BODY_BYTES);
    const file = form.get("file");
    if (!(file instanceof File))
      throw new HttpError(400, "VALIDATION_ERROR", "A logo file is required");
    if (file.size > LOGO_MAX_BYTES)
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
