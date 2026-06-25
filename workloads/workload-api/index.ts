/**
 * Workload - workload-api (containerised).
 *
 * Consumes the environment contract: it asks `serviceProjects` for its assigned
 * project by name, then creates its container service, runtime identity, and
 * prefix-scoped secret access *inside* that project. It publishes a `services`
 * backend (the API) and a `staticBackends` entry (static docs) for edge to
 * route. It never creates its project - that is the environment's to own.
 */

import {
  ServiceAccount,
  ServiceBackend,
  StaticBackend,
  type StackOutputs,
  type StackReference,
  bindSecretAccess,
  buildServicesOutput,
  buildStaticBackendsOutput,
  getNetwork,
  getServiceProject,
} from '../../lib/index.ts';
import { ciSecretRules, runtimeSecretRule } from './secrets.ts';

export function buildWorkloadApi(
  envRef: StackReference,
  env: string,
  imageTag: string
): StackOutputs {
  const assigned = getServiceProject(envRef, 'workload-api');

  // Attach to the environment's shared network. The contract is resolved by key
  // (network.primary); authority to attach comes from the host-project network
  // binding in the ServiceProject component, not from reading this id.
  const primarySubnetId = getNetwork(envRef, 'primary').apply(
    (n) => n.primarySubnetId
  );

  const projectId = assigned.apply((a) => a.project.projectId);
  const deployMember = assigned.apply((a) => a.project.deployMember);
  const registryPath = assigned.apply(
    (a) => a.artifactRegistry?.imagePath ?? 'workload-api'
  );

  // Runtime identity: the container's own service account.
  const runtime = new ServiceAccount('workload-api-runtime', {
    projectId,
    accountId: 'runtime',
  });

  // CI distributes secrets under preview-/deploy-; runtime reads under sidecar-.
  for (const rule of ciSecretRules(deployMember.value)) {
    bindSecretAccess('workload-api', {
      projectId,
      rule,
      role: 'roles/secrets.distributor',
    });
  }
  bindSecretAccess('workload-api', {
    projectId,
    rule: runtimeSecretRule(runtime.member.value),
    role: 'roles/secrets.reader',
  });

  const apiHost = env === 'prod' ? 'api.example.invalid' : `api.${env}.example.invalid`;
  const docsHost = env === 'prod' ? 'docs.example.invalid' : `docs.${env}.example.invalid`;

  // The containerised API backend, with a helper sidecar.
  const api = new ServiceBackend('workload-api', {
    name: 'workload-api',
    projectId,
    hostname: apiHost,
    image: registryPath.apply((p) => `${p}:${imageTag}`),
    serviceAccount: runtime.member,
    env: { SERVICE_DATA_URL: 'secret://sidecar-data-url' },
    sidecar: true,
    subnet: primarySubnetId,
  });

  // A static docs site served from a bucket behind the same edge.
  const docs = new StaticBackend('workload-api-docs', {
    name: 'workload-api-docs',
    projectId,
    hostname: docsHost,
  });

  return {
    services: buildServicesOutput([api]).value,
    staticBackends: buildStaticBackendsOutput([docs]).value,
  };
}
