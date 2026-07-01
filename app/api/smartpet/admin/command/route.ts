import { NextRequest } from "next/server";
import { defaultDeviceId, verifyAdminPassword } from "@/lib/auth";
import { validateCommand } from "@/lib/commands";
import { errorJson, okJson, readJsonBody } from "@/lib/responses";
import { createPendingCommand } from "@/lib/store";

export const runtime = "nodejs";
export const preferredRegion = "hkg1";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "BAD_JSON", 400);
  }

  if (!body || typeof body !== "object") return errorJson("BAD_BODY", 400);
  const data = body as Record<string, unknown>;

  const auth = verifyAdminPassword(data.password, req);
  if (!auth.ok) return errorJson(auth.error, auth.status);

  const result = validateCommand(data.command);
  if (!result.ok) return errorJson(result.error, 400);

  const device = typeof data.device === "string" && data.device.trim() ? data.device.trim() : defaultDeviceId();
  const pending = await createPendingCommand(device, result.command);

  return okJson({ ok: true, id: pending.id, command: pending.command });
}
