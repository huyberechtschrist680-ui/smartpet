import { NextRequest } from "next/server";
import { verifyDeviceAuth } from "@/lib/auth";
import { normalizeAckPayload, normalizeDeviceId, normalizeStatusPayload } from "@/lib/device-payload";
import { errorJson, okJson, readJsonBody } from "@/lib/responses";
import { ackCommand, getCommandForDelivery, setStatus } from "@/lib/store";

export const runtime = "nodejs";
export const preferredRegion = "hkg1";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = verifyDeviceAuth(req);
  if (!auth.ok) return errorJson(auth.error, auth.status);

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "BAD_JSON", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return errorJson("BAD_BODY", 400);
  const data = body as Record<string, unknown>;
  const device = normalizeDeviceId(data.device);
  const statusBody = data.status;

  if (!statusBody || typeof statusBody !== "object" || Array.isArray(statusBody)) {
    return errorJson("BAD_STATUS", 400);
  }

  const now = Date.now();
  const statusResult = normalizeStatusPayload(device, statusBody as Record<string, unknown>, {
    heartbeat: data.heartbeat,
    mode: data.mode,
    uptime_ms: data.uptime_ms,
    received_at: now,
  });

  if (!statusResult.ok) return errorJson(statusResult.error, 400);

  const ackResult = data.ack == null ? null : normalizeAckPayload(device, data.ack);
  if (ackResult && !ackResult.ok) return errorJson(ackResult.error, 400);

  await setStatus(device, statusResult.status);
  if (ackResult?.ok) await ackCommand(ackResult.ack);

  const pending = await getCommandForDelivery(device);

  return okJson({
    ok: true,
    online: true,
    command: pending ? { id: pending.id, text: pending.command } : null,
  });
}
