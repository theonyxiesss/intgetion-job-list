/** Page-view tracking stays on unless an environment explicitly disables it. */
export function analyticsBeaconEnabled(disabled: string | undefined): boolean {
  return disabled !== "true";
}
