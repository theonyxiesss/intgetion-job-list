import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { closeTask, listTaskProposals } from "@/modules/freelance/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function taskId(id: string): string {
  if (!UUID.test(id)) throw validationError({ fields: ["id"] });
  return id;
}

/** `GET /api/freelance/tasks/:id` — proposals of one task, for its client. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const proposals = await listTaskProposals(user.id, taskId(id));
    return Response.json({
      proposals: proposals.map((item) => ({
        ...item,
        priceMinor: item.priceMinor.toString(),
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `POST /api/freelance/tasks/:id` `{ action: "close" }` — close without hiring. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    })) as { action?: unknown };
    if (body.action !== "close") throw validationError({ fields: ["action"] });
    const task = await closeTask(user.id, taskId(id));
    return Response.json({ task: { id: task.id, status: task.status } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
