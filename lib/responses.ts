import { NextResponse } from "next/server";

export function okJson<T extends object>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export function errorJson(error: string, status = 400, extra?: Record<string, unknown>) {
  return okJson({ ok: false, error, ...(extra || {}) }, status);
}

export async function readJsonBody(req: Request): Promise<unknown> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("CONTENT_TYPE_NOT_JSON");
  }
  return req.json();
}
