import type { Output, StackReference } from '../runtime.ts';
import type { StaticBackendRef } from './types.ts';

/** Resolve one static backend by name from a workload's `staticBackends`. */
export function getStaticBackend(
  ref: StackReference,
  name: string
): Output<StaticBackendRef> {
  return ref.getOutput('staticBackends').apply((value) => {
    const backends = value as Record<string, StaticBackendRef> | undefined;
    if (!backends) {
      throw new Error(
        "'staticBackends' output not found. Ensure the workload exports it via buildStaticBackendsOutput()."
      );
    }
    const backend = backends[name];
    if (backend) return backend;

    const keys = Object.keys(backends).join(', ') || '(none)';
    throw new Error(`static backend '${name}' not found. Available: ${keys}`);
  });
}
