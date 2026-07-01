import { NextRequest } from "next/server";
import { defaultDeviceId, verifyDeviceAuth } from "@/lib/auth";
import { errorJson, okJson, readJsonBody } from "@/lib/responses";
import { ackCommand } from "@/lib/store";

export const runtime = "nodejs";
export const preferredRegion = "hkg1";
export const dynamic = "force-dynamic";

const allowedResults = new Set(["OK", "BAD_COMMAND", "BUSY", "IGNORED_SLEEPING", "HTTP_ERROR"]);

export async function POST(req: NextRequest) {
  const auth = verifyDeviceAuth(req);
  if (!auth.ok) return errorJson(auth.error, auth.status);

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "BAD_JSON", 400);
  }

  if (!body || typeof body !== "object") return errorJson("BAD_BODY", 400);
  const data = body as Record<string, unknown>;

  const device = typeof data.device === "string" && data.device.trim() ? data.device.trim() : defaultDeviceId();
  const id = typeof data.id === "string" ? data.id.trim() : "";
  const command = typeof data.command === "string" ? data.command.trim().slice(0, 80) : "";
  const result = typeof data.result === "string" ? data.result.trim() : "";

  if (!result || !allowedResults.has(result)) {
    return errorJson("BAD_RESULT", 400);
  }

  await ackCommand({
    device,
    id: id || undefined,
    command: command || undefined,
    result,
  });

  return okJson({ ok: true });
}
