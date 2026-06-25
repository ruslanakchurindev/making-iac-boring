import { ComponentResource, type Output, all, output } from '../runtime.ts';
import { ContainerService } from '../cloud.ts';
import type { ServiceBackendArgs, ServiceBackendRef } from './types.ts';

/**
 * A containerised backend: a container service plus the backend id an edge load
 * balancer routes to. The workload owns this and publishes its `output` for
 * edge to consume after it exists.
 */
export class ServiceBackend extends ComponentResource {
  readonly output: Output<ServiceBackendRef>;
  readonly service: ContainerService;

  constructor(name: string, args: ServiceBackendArgs) {
    super('platform:workload:ServiceBackend', name);

    this.service = new ContainerService(name, {
      projectId: args.projectId,
      image: args.image,
      serviceAccount: args.serviceAccount,
      env: args.env,
      sidecar: args.sidecar,
      subnet: args.subnet,
    });

    this.output = all([output(args.name), this.service.backendId]).apply(
      ([serviceName, backendServiceId]) => ({
        name: serviceName as string,
        hostname: args.hostname,
        backendServiceId: backendServiceId as string,
        ...(args.pathRules ? { pathRules: args.pathRules } : {}),
      })
    );
  }
}
