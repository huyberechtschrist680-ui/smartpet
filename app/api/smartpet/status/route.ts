import { NextRequest } from "next/server";
import { verifyDeviceAuth } from "@/lib/auth";
import { normalizeDeviceId, normalizeStatusPayload } from "@/lib/device-payload";
import { errorJson, okJson, readJsonBody } from "@/lib/responses";
import { setStatus } from "@/lib/store";

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
  const result = normalizeStatusPayload(device, data);

  if (!result.ok) return errorJson(result.error, 400);

  await setStatus(device, result.status);
  return okJson({ ok: true });
}
