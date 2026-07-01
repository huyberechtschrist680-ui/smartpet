import { NextRequest } from "next/server";
import { defaultDeviceId, verifyDeviceAuth } from "@/lib/auth";
import { errorJson, okJson } from "@/lib/responses";
import { getCommandForDelivery } from "@/lib/store";

export const runtime = "nodejs";
export const preferredRegion = "hkg1";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = verifyDeviceAuth(req);
  if (!auth.ok) return errorJson(auth.error, auth.status);

  const device = req.nextUrl.searchParams.get("device")?.trim() || defaultDeviceId();
  const pending = await getCommandForDelivery(device);

  if (!pending) {
    return okJson({ ok: true, command: "" });
  }

  return okJson({
    ok: true,
    id: pending.id,
    command: pending.command,
  });
}
