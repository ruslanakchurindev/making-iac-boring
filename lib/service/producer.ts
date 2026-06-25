import { type Output, all } from '../runtime.ts';
import type { ServiceBackendInstance, ServiceBackendRef } from './types.ts';

export type ServicesOutput = Output<Record<string, ServiceBackendRef>>;

/** Aggregate service backends into the `services` producer output. */
export function buildServicesOutput(
  services: ServiceBackendInstance[]
): ServicesOutput {
  return all(services.map((s) => s.output)).apply((schemas) =>
    Object.fromEntries(schemas.map((s) => [s.name, s]))
  );
}
