/**
 * Tier 2 - environment.
 *
 * Consumes the organisation contract (`serviceCatalog`) and publishes the
 * landing zone for workloads: the shared network, federated deploy access, and
 * one assigned project per service via the `ServiceProject` component. Workloads
 * consume `serviceProjects`; they never create their own project.
 */

import {
  type EnvironmentName,
  ServiceProject,
  type StackOutputs,
  type StackReference,
  buildServiceProjectsOutput,
  getCatalogEntry,
  withFolder,
  withFrontend,
  withRegistry,
} from '../lib/index.ts';
import { buildIdentity } from './identity.ts';
import { buildNetwork } from './network.ts';

export function buildEnvironment(
  orgRef: StackReference,
  env: EnvironmentName
): StackOutputs {
  const billingAccountId = orgRef
    .getOutput('billingAccountId')
    .apply((v) => v as string);
  const workloadFolderId = orgRef
    .getOutput('workloadFolderId')
    .apply((v) => v as string);

  const { hostProject, network } = buildNetwork(env, billingAccountId, workloadFolderId);
  const { pool, deployServiceAccount } = buildIdentity(hostProject.projectId);

  const shared = {
    folderId: workloadFolderId,
    billingAccountId,
    workloadIdentityPool: pool,
    deployServiceAccountMember: deployServiceAccount.member,
    hostProjectId: hostProject.projectId,
  };

  // workload-api: containerised, so it gets the image-registry capability.
  const workloadApiEntry = getCatalogEntry(orgRef, 'workload-api');
  const workloadApiProject = new ServiceProject(
    'workload-api',
    {
      name: 'workload-api',
      ...shared,
      ...withFolder(workloadApiEntry),
      ...withRegistry(workloadApiEntry),
    },
    env
  );

  // web-app: managed frontend, so it gets the frontend capability.
  const webAppEntry = getCatalogEntry(orgRef, 'web-app');
  const webAppProject = new ServiceProject(
    'web-app',
    {
      name: 'web-app',
      ...shared,
      ...withFolder(webAppEntry),
      ...withFrontend(webAppEntry),
    },
    env
  );

  const serviceProjects = buildServiceProjectsOutput([
    workloadApiProject,
    webAppProject,
  ]);

  return {
    serviceProjects: serviceProjects.value,
    network: { primary: network.value },
  };
}
