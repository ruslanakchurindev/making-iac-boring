import type { Output } from '../runtime.ts';

/**
 * Service backend contract (produced by a containerised workload, consumed by
 * edge). Edge routes to `backendServiceId` for requests on `hostname`.
 */

export interface PathRule {
  paths: string[];
  timeoutSec?: number;
}

export interface ServiceBackendRef {
  name: string;
  hostname: string;
  backendServiceId: string;
  pathRules?: PathRule[];
}

export interface ServiceBackendInstance {
  output: Output<ServiceBackendRef>;
}

export interface ServiceBackendArgs {
  name: string;
  projectId: Output<string> | string;
  hostname: string;
  image: Output<string> | string;
  serviceAccount: Output<string> | string;
  /** Secret env vars resolved at deploy, under the `sidecar-*` read prefix. */
  env?: Record<string, Output<string> | string>;
  sidecar?: boolean;
  /** Shared-network subnet to attach to, resolved from `network.primary`. */
  subnet?: Output<string> | string;
  pathRules?: PathRule[];
}
