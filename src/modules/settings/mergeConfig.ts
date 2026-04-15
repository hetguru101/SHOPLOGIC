/** Shallow-deep merge for JSON-like settings objects (plain objects only). */
export function mergeConfig<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const v = patch[key];
    if (v === undefined) continue;
    const prev = out[key];
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && prev !== null && typeof prev === 'object' && !Array.isArray(prev)) {
      (out as Record<string, unknown>)[key as string] = mergeConfig(prev as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      (out as Record<string, unknown>)[key as string] = v as unknown;
    }
  }
  return out;
}
