import type { Output, StackReference } from '../runtime.ts';
import type { ServiceBackendRef } from './types.ts';

/** Resolve one service backend by name from a workload's `services` output. */
export function getServiceBackend(
  ref: StackReference,
  name: string
): Output<ServiceBackendRef> {
  return ref.getOutput('services').apply((value) => {
    const services = value as Record<string, ServiceBackendRef> | undefined;
    if (!services) {
      throw new Error(
        "'services' output not found. Ensure the workload exports it via buildServicesOutput()."
      );
    }
    const backend = services[name];
    if (backend) return backend;

    const keys = Object.keys(services).join(', ') || '(none)';
    throw new Error(`service backend '${name}' not found. Available: ${keys}`);
  });
}
