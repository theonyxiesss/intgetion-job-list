import {
  FREELANCE_CATEGORIES,
  type FreelanceCategory,
} from "@/config/freelance";
import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createTask, listOpenTasks } from "@/modules/freelance/service";

function categoryOf(value: string | null): FreelanceCategory | undefined {
  return (FREELANCE_CATEGORIES as readonly string[]).includes(value ?? "")
    ? (value as FreelanceCategory)
    : undefined;
}

/** `GET /api/freelance/tasks?category=` — open client tasks (TZ 47). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const items = await listOpenTasks({
      category: categoryOf(url.searchParams.get("category")),
    });
    return Response.json({
      items: items.map((task) => ({
        ...task,
        budgetMinMinor: task.budgetMinMinor?.toString() ?? null,
        budgetMaxMinor: task.budgetMaxMinor?.toString() ?? null,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `POST /api/freelance/tasks` — a client posts a task for review (TZ 47). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit("freelanceTask", user.id);
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    const task = await createTask(user.id, body);
    return Response.json(
      { task: { id: task.id, status: task.status } },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
