/** `n` and the word for it: `1 error`, `2 errors`. A module of its own, so the hook's bundle needn't take format.ts and core with it. */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
