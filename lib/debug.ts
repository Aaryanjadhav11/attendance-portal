// Always-on console logging (client and server) for diagnosing production
// issues via browser devtools / Vercel function logs. Never surfaced in the
// UI — components only ever render short, user-facing error strings.
// Never pass credentials (password) to these.
const PREFIX = "[RITCMS]";

export function debugLog(...args: unknown[]): void {
  console.debug(PREFIX, ...args);
}

export function debugError(context: string, err: unknown): void {
  console.error(PREFIX, context, err);
}
