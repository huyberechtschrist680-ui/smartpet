import { defaultDeviceId } from "./auth";
import { MAX_COMMAND_BYTES } from "./commands";
import type { AckRecord, AckResult, SmartPetStatus } from "./types";

const DEFAULT_ONLINE_TIMEOUT_MS = 10000;
const MIN_ONLINE_TIMEOUT_MS = 8000;

export const allowedAckResults = new Set(["OK", "BAD_COMMAND", "BUSY", "IGNORED_SLEEPING", "HTTP_ERROR"]);

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeDeviceId(value: unknown): string {
  const device = trimString(value);
  return device || defaultDeviceId();
}

export function onlineTimeoutMs(): number {
  const configured = Number(process.env.SMARTPET_ONLINE_TIMEOUT_MS || DEFAULT_ONLINE_TIMEOUT_MS);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_ONLINE_TIMEOUT_MS;
  return Math.max(configured, MIN_ONLINE_TIMEOUT_MS);
}

export function normalizeStatusPayload(
  device: string,
  data: Record<string, unknown>,
  options: {
    mode?: unknown;
    uptime_ms?: unknown;
    heartbeat?: unknown;
    received_at?: number;
  } = {}
): { ok: true; status: SmartPetStatus } | { ok: false; error: string } {
  const emotion = toNumber(data.emotion, NaN);

  if (!Number.isFinite(emotion) || emotion < 1 || emotion > 10) {
    return { ok: false, error: "BAD_EMOTION" };
  }

  return {
    ok: true,
    status: {
      device,
      heartbeat: options.heartbeat === true ? true : undefined,
      mode: typeof options.mode === "string" ? options.mode : typeof data.mode === "string" ? data.mode : "website",
      power: typeof data.power === "string" ? data.power : "NORMAL",
      emotion,
      food: typeof data.food === "string" ? data.food : "HUNGRY",
      remain: toNumber(data.remain, 0),
      motion: typeof data.motion === "string" ? data.motion : "NULL",
      uptime_ms: toNumber(options.uptime_ms ?? data.uptime_ms, 0),
      received_at: options.received_at || Date.now(),
    },
  };
}

export function normalizeAckPayload(
  fallbackDevice: string,
  value: unknown
): { ok: true; ack: Omit<AckRecord, "ack_at" | "matched_pending"> } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "BAD_ACK" };
  }

  const data = value as Record<string, unknown>;
  const result = trimString(data.result);

  if (!result || !allowedAckResults.has(result)) {
    return { ok: false, error: "BAD_RESULT" };
  }

  const command = trimString(data.command || data.text).slice(0, MAX_COMMAND_BYTES);
  const id = trimString(data.id);

  return {
    ok: true,
    ack: {
      device: trimString(data.device) || fallbackDevice,
      id: id || undefined,
      command: command || undefined,
      result: result as AckResult,
    },
  };
}
