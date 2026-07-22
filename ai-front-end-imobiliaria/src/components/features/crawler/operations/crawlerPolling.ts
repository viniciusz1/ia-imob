export function crawlerPollInterval(visibility: DocumentVisibilityState): number {
  return visibility === "visible" ? 3_000 : 30_000;
}
