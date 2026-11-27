import { getDb } from "@/db/client";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { hasCandidateProfile } from "@/modules/candidates/service";
import {
  getOwnCandidate,
  scoreStoredProfile,
  storeCompleteness,
} from "@/modules/candidates/service";
import {
  contactsInput,
  getOwnContacts,
  saveContacts,
} from "@intgetion/contacts";

export async function GET() {
  try {
    const user = await requireUser();
    if (!(await hasCandidateProfile(user.id))) throw notFound();
    const contacts = await getOwnContacts(user.id);
    if (!contacts) throw notFound();
    return Response.json(contacts);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, contactsInput);
    const profile = await getOwnCandidate(user.id);
    if (!profile) throw notFound();
    const { score } = scoreStoredProfile(profile, input.email);
    const saved = await getDb().transaction(async (tx) => {
      // Same drizzle-orm; the module's transaction type has no platform schema.
      const row = await saveContacts(
        user.id,
        input,
        tx as unknown as Parameters<typeof saveContacts>[2],
      );
      await storeCompleteness(user.id, score, tx);
      return row;
    });
    return Response.json(saved);
  } catch (error) {
    return toErrorResponse(error);
  }
}
