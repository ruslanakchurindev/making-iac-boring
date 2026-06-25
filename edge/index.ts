/**
 * Tier 3 - edge.
 *
 * Sits between organisation roots and workload-owned services. It consumes the
 * workload backends (`services`, `staticBackends`) after they exist and the
 * organisation `domainTopology`, then builds one load balancer with routing and
 * DNS. A routing-only change here previews edge alone; it does not pull in the
 * environment or the workloads.
 */

import {
  EdgeLoadBalancer,
  type StackOutputs,
  type StackReference,
  getDomainTopology,
  getServiceBackend,
  getStaticBackend,
} from '../lib/index.ts';

export function buildEdge(
  orgRef: StackReference,
  workloadApiRef: StackReference,
  env: string
): StackOutputs {
  const apiBackend = getServiceBackend(workloadApiRef, 'workload-api');
  const docsBackend = getStaticBackend(workloadApiRef, 'workload-api-docs');

  const apiZone = getDomainTopology(orgRef, 'example.invalid', 'api', env);
  const docsZone = getDomainTopology(orgRef, 'example.invalid', 'docs', env);

  const edge = new EdgeLoadBalancer('edge', {
    projectId: `${env}-edge`,
    services: [{ name: 'workload-api', backend: apiBackend, zone: apiZone }],
    staticBackends: [
      { name: 'workload-api-docs', backend: docsBackend, zone: docsZone },
    ],
  });

  return { address: edge.loadBalancer.address.value };
}
