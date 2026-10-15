/**
 * Logs a rejected promise nobody awaited to stderr instead of letting Node end the process,
 * which would take every feature down with it (a client refusing a registration did).
 */
export function logUnhandledRejections(
  target: { on(event: "unhandledRejection", listener: (reason: unknown) => void): unknown },
  write: (text: string) => void,
): void {
  target.on("unhandledRejection", (reason) => {
    write(`tfscript: unhandled rejection: ${reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)}\n`);
  });
}
