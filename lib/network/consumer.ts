import type { Output, StackReference } from '../runtime.ts';
import type { NetworkRef } from './types.ts';

/**
 * Resolve one shared network by key from the environment's `network` contract.
 * A workload requires `environment/network.primary`, and an environment that
 * never published that key is refused before any apply. Refuses, naming the
 * contract, when the `network` output is missing or the requested key is absent.
 */
export function getNetwork(
  envRef: StackReference,
  key: string
): Output<NetworkRef> {
  return envRef.getOutput('network').apply((value) => {
    if (!value) {
      throw new Error(
        `'network' output not found. Ensure the environment stack ` +
          `exports it via buildNetwork().`
      );
    }

    const networks = value as Record<string, NetworkRef>;
    const ref = networks[key];
    if (ref) return ref;

    const available = Object.keys(networks).join(', ') || '(none)';
    throw new Error(`network '${key}' not found. Available: ${available}`);
  });
}
