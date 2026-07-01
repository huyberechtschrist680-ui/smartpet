import { NextRequest } from "next/server";
import { defaultDeviceId, verifyDeviceAuth } from "@/lib/auth";
import { errorJson, okJson, readJsonBody } from "@/lib/responses";
import { setStatus } from "@/lib/store";
import type { SmartPetStatus } from "@/lib/types";

export const runtime = "nodejs";
export const preferredRegion = "hkg1";
export const dynamic = "force-dynamic";

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

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
  const emotion = toNumber(data.emotion, NaN);

  if (!Number.isFinite(emotion) || emotion < 1 || emotion > 10) {
    return errorJson("BAD_EMOTION", 400);
  }

  const status: SmartPetStatus = {
    device,
    mode: typeof data.mode === "string" ? data.mode : "website",
    power: typeof data.power === "string" ? data.power : "NORMAL",
    emotion,
    food: typeof data.food === "string" ? data.food : "HUNGRY",
    remain: toNumber(data.remain, 0),
    motion: typeof data.motion === "string" ? data.motion : "NULL",
    uptime_ms: toNumber(data.uptime_ms, 0),
    received_at: Date.now(),
  };

  await setStatus(device, status);
  return okJson({ ok: true });
}
