export const MAX_COMMAND_BYTES = 80;

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function normalizeCommand(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, " ");
}

export function validateCommand(raw: unknown): { ok: true; command: string } | { ok: false; error: string } {
  const command = normalizeCommand(raw);

  if (!command) return { ok: false, error: "EMPTY_COMMAND" };
  if (byteLength(command) > MAX_COMMAND_BYTES) return { ok: false, error: "COMMAND_TOO_LONG" };

  const lower = command.toLowerCase();
  const exact = new Set([
    "setful true",
    "setful false",
    "setmot 0",
    "setmot 1",
    "setmot 2",
    "setmot 3",
    "setmot 4",
    "setslp true",
    "setslp false",
    "touch",
    "feed",
    "state",
  ]);

  if (exact.has(lower)) return { ok: true, command: lower };

  const setemo = lower.match(/^setemo\s+([1-9]|10)$/);
  if (setemo) return { ok: true, command: `setemo ${setemo[1]}` };

  return { ok: false, error: "BAD_COMMAND" };
}
