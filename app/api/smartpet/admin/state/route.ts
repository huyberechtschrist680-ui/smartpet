import { NextRequest } from "next/server";
import { defaultDeviceId, verifyAdminPassword } from "@/lib/auth";
import { onlineTimeoutMs } from "@/lib/device-payload";
import { errorJson, okJson } from "@/lib/responses";
import { getEvents, getLastAck, getPendingCommand, getStatus, storageKind } from "@/lib/store";

export const runtime = "nodejs";
export const preferredRegion = "hkg1";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = verifyAdminPassword(undefined, req);
  if (!auth.ok) return errorJson(auth.error, auth.status);

  const device = req.nextUrl.searchParams.get("device")?.trim() || defaultDeviceId();
  const [status, pending, lastAck, events] = await Promise.all([
    getStatus(device),
    getPendingCommand(device),
    getLastAck(device),
    getEvents(device),
  ]);

  const now = Date.now();
  const timeoutMs = onlineTimeoutMs();
  const online = Boolean(status && now - status.received_at <= timeoutMs);

  return okJson({
    ok: true,
    device,
    online,
    online_timeout_ms: timeoutMs,
    status,
    pending,
    last_ack: lastAck,
    events,
    server_time: now,
    storage: storageKind(),
  });
}
