import { type Output, all } from '../runtime.ts';
import type { StaticBackendInstance, StaticBackendRef } from './types.ts';

export type StaticBackendsOutput = Output<Record<string, StaticBackendRef>>;

/** Aggregate static backends into the `staticBackends` producer output. */
export function buildStaticBackendsOutput(
  backends: StaticBackendInstance[]
): StaticBackendsOutput {
  return all(backends.map((b) => b.output)).apply((schemas) =>
    Object.fromEntries(schemas.map((s) => [s.name, s]))
  );
}
