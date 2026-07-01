import { Redis } from "@upstash/redis";
import type { AckRecord, PendingCommand, SmartPetStatus, StoreEvent } from "./types";

interface DeviceStateBundle {
  status: SmartPetStatus | null;
  pending: PendingCommand | null;
  lastAck: AckRecord | null;
  events: StoreEvent[];
}

interface MemoryDb {
  devices: Record<string, DeviceStateBundle>;
}

declare global {
  // eslint-disable-next-line no-var
  var __SMARTPET_MEMORY_DB__: MemoryDb | undefined;
}

const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

function memoryDb(): MemoryDb {
  if (!globalThis.__SMARTPET_MEMORY_DB__) {
    globalThis.__SMARTPET_MEMORY_DB__ = { devices: {} };
  }
  return globalThis.__SMARTPET_MEMORY_DB__;
}

function emptyBundle(): DeviceStateBundle {
  return { status: null, pending: null, lastAck: null, events: [] };
}

function ensureMemoryDevice(device: string): DeviceStateBundle {
  const db = memoryDb();
  if (!db.devices[device]) db.devices[device] = emptyBundle();
  return db.devices[device];
}

function key(device: string, name: string) {
  return `smartpet:${device}:${name}`;
}

export function storageKind(): "upstash" | "memory" {
  return redis ? "upstash" : "memory";
}

export async function getStatus(device: string): Promise<SmartPetStatus | null> {
  if (redis) return (await redis.get<SmartPetStatus>(key(device, "status"))) || null;
  return ensureMemoryDevice(device).status;
}

export async function setStatus(device: string, status: SmartPetStatus): Promise<void> {
  if (redis) {
    await redis.set(key(device, "status"), status);
    await pushEvent(device, { time: Date.now(), type: "STATUS", text: `status ${status.power || "?"}/${status.motion || "?"}` });
    return;
  }
  ensureMemoryDevice(device).status = status;
  await pushEvent(device, { time: Date.now(), type: "STATUS", text: `status ${status.power || "?"}/${status.motion || "?"}` });
}

export async function getPendingCommand(device: string): Promise<PendingCommand | null> {
  if (redis) return (await redis.get<PendingCommand>(key(device, "pending"))) || null;
  return ensureMemoryDevice(device).pending;
}

export async function setPendingCommand(device: string, pending: PendingCommand | null): Promise<void> {
  if (redis) {
    if (pending) await redis.set(key(device, "pending"), pending);
    else await redis.del(key(device, "pending"));
    return;
  }
  ensureMemoryDevice(device).pending = pending;
}

export async function createPendingCommand(device: string, command: string): Promise<PendingCommand> {
  const id = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pending: PendingCommand = {
    id,
    device,
    command,
    status: "QUEUED",
    created_at: Date.now(),
  };
  await setPendingCommand(device, pending);
  await pushEvent(device, { time: Date.now(), type: "COMMAND", text: `${id}: ${command}` });
  return pending;
}

export async function getCommandForDelivery(device: string): Promise<PendingCommand | null> {
  const pending = await getPendingCommand(device);
  if (!pending) return null;

  const now = Date.now();
  const redeliverMs = Number(process.env.SMARTPET_COMMAND_REDELIVER_MS || 10000);

  if (pending.status === "DELIVERED" && pending.delivered_at && now - pending.delivered_at < redeliverMs) {
    return null;
  }

  const updated: PendingCommand = {
    ...pending,
    status: "DELIVERED",
    delivered_at: now,
  };
  await setPendingCommand(device, updated);
  return updated;
}

export async function getLastAck(device: string): Promise<AckRecord | null> {
  if (redis) return (await redis.get<AckRecord>(key(device, "lastAck"))) || null;
  return ensureMemoryDevice(device).lastAck;
}

export async function ackCommand(ack: Omit<AckRecord, "ack_at" | "matched_pending">): Promise<AckRecord> {
  const device = ack.device;
  const pending = await getPendingCommand(device);
  const matched = Boolean(pending && ack.id && pending.id === ack.id);
  const record: AckRecord = {
    ...ack,
    ack_at: Date.now(),
    matched_pending: matched,
  };

  if (matched) {
    await setPendingCommand(device, null);
  }

  if (redis) await redis.set(key(device, "lastAck"), record);
  else ensureMemoryDevice(device).lastAck = record;

  await pushEvent(device, { time: Date.now(), type: "ACK", text: `${ack.id || "no-id"}: ${ack.result}` });
  return record;
}

export async function clearPendingCommand(device: string): Promise<void> {
  await setPendingCommand(device, null);
  await pushEvent(device, { time: Date.now(), type: "CLEAR", text: "pending command cleared" });
}

export async function pushEvent(device: string, event: StoreEvent): Promise<void> {
  if (redis) {
    await redis.lpush(key(device, "events"), event);
    await redis.ltrim(key(device, "events"), 0, 49);
    return;
  }
  const bundle = ensureMemoryDevice(device);
  bundle.events.unshift(event);
  bundle.events = bundle.events.slice(0, 50);
}

export async function getEvents(device: string): Promise<StoreEvent[]> {
  if (redis) return (await redis.lrange<StoreEvent>(key(device, "events"), 0, 49)) || [];
  return ensureMemoryDevice(device).events;
}
