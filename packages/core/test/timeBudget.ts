// A wall-clock budget for the tests that guard against a blow-up in cost. They catch quadratic or worse
// behaviour, which overshoots any fixed bound, so a shared CI runner (slower and noisier than a dev machine)
// gets a looser one rather than failing on an ordinary slow run.
export function timeBudget(ms: number): number {
  return process.env.CI ? ms * 4 : ms;
}
