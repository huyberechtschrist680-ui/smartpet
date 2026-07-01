import { NextRequest } from "next/server";

function configuredDeviceToken(): string {
  return (process.env.SMARTPET_API_TOKEN || "").trim();
}

function configuredAdminPassword(): string {
  const password = (process.env.SMARTPET_ADMIN_PASSWORD || "").trim();
  if (password) return password;
  if (process.env.NODE_ENV !== "production") return "admin";
  return "";
}

export function defaultDeviceId(): string {
  return (process.env.SMARTPET_DEFAULT_DEVICE || process.env.NEXT_PUBLIC_DEFAULT_DEVICE || "smartpet-01").trim();
}

export function verifyDeviceAuth(req: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const token = configuredDeviceToken();
  if (!token) return { ok: true };

  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${token}`) return { ok: true };

  return { ok: false, status: 401, error: "UNAUTHORIZED" };
}

export function verifyAdminPassword(password?: unknown, req?: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const expected = configuredAdminPassword();
  if (!expected) return { ok: false, status: 500, error: "ADMIN_PASSWORD_NOT_CONFIGURED" };

  const fromBody = typeof password === "string" ? password : "";
  const fromHeader = req?.headers.get("x-admin-password") || "";

  if (fromBody === expected || fromHeader === expected) return { ok: true };
  return { ok: false, status: 401, error: "BAD_ADMIN_PASSWORD" };
}
