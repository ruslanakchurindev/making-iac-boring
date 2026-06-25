import type { Output } from '../runtime.ts';
import type { ServiceBackendRef } from '../service/types.ts';
import type { StaticBackendRef } from '../static-backend/types.ts';
import type { ZoneRef } from '../dns/types.ts';

export interface NamedServiceInput {
  name: string;
  backend: Output<ServiceBackendRef>;
  zone?: Output<ZoneRef>;
}

export interface NamedStaticInput {
  name: string;
  backend: Output<StaticBackendRef>;
  zone?: Output<ZoneRef>;
}

export interface EdgeLoadBalancerArgs {
  projectId: Output<string> | string;
  services?: NamedServiceInput[];
  staticBackends?: NamedStaticInput[];
}
