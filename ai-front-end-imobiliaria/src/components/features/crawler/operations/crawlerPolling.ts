export function crawlerPollInterval(visibility: DocumentVisibilityState): number {
  return visibility === "visible" ? 5_000 : 30_000;
}
