export type DevicePower = "NORMAL" | "SLEEP" | string;
export type FoodState = "HUNGRY" | "FULL" | string;
export type MotionState = "NULL" | "PLAY" | "IDLE" | "TIRE" | "FOWD" | string;
export type AckResult = "OK" | "BAD_COMMAND" | "BUSY" | "IGNORED_SLEEPING" | "HTTP_ERROR" | string;

export interface SmartPetStatus {
  device: string;
  heartbeat?: boolean;
  mode?: "website" | "ble" | string;
  power?: DevicePower;
  emotion?: number;
  food?: FoodState;
  remain?: number;
  motion?: MotionState;
  uptime_ms?: number;
  received_at: number;
}

export interface PendingCommand {
  id: string;
  device: string;
  command: string;
  status: "QUEUED" | "DELIVERED";
  created_at: number;
  delivered_at?: number;
}

export interface AckRecord {
  device: string;
  id?: string;
  command?: string;
  result: AckResult;
  ack_at: number;
  matched_pending: boolean;
}

export interface DashboardSnapshot {
  ok: true;
  device: string;
  online: boolean;
  online_timeout_ms: number;
  status: SmartPetStatus | null;
  pending: PendingCommand | null;
  last_ack: AckRecord | null;
  events: StoreEvent[];
  server_time: number;
  storage: "upstash" | "memory";
}

export interface StoreEvent {
  time: number;
  type: "STATUS" | "COMMAND" | "ACK" | "CLEAR" | "ERROR";
  text: string;
}
