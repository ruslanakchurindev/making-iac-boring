import { ComponentResource } from '../runtime.ts';
import { DnsRecord, LoadBalancer } from '../cloud.ts';
import type { EdgeLoadBalancerArgs } from './types.ts';

/**
 * The edge tier. It consumes service and static backends (read after they
 * exist) and builds one load balancer with a host rule per backend, plus the
 * routing DNS record into each backend's zone. A routing-only change here does
 * not touch the environment or the workloads.
 */
export class EdgeLoadBalancer extends ComponentResource {
  readonly loadBalancer: LoadBalancer;

  constructor(name: string, args: EdgeLoadBalancerArgs) {
    super('platform:edge:EdgeLoadBalancer', name);

    const hostRules: Array<{ host: string; backendId: string }> = [];

    for (const svc of args.services ?? []) {
      const ref = svc.backend.value;
      hostRules.push({ host: ref.hostname, backendId: ref.backendServiceId });
      if (svc.zone) {
        new DnsRecord(`${name}-${svc.name}`, {
          zoneId: svc.zone.apply((z) => z.zoneId),
          fqdn: ref.hostname,
          type: 'A',
          value: 'lb',
        });
      }
    }

    for (const stat of args.staticBackends ?? []) {
      const ref = stat.backend.value;
      hostRules.push({ host: ref.hostname, backendId: ref.backendBucketId });
      if (stat.zone) {
        new DnsRecord(`${name}-${stat.name}`, {
          zoneId: stat.zone.apply((z) => z.zoneId),
          fqdn: ref.hostname,
          type: 'A',
          value: 'lb',
        });
      }
    }

    this.loadBalancer = new LoadBalancer(name, {
      projectId: args.projectId,
      hostRules,
    });
  }
}
