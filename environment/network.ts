import {
  type EnvironmentName,
  Network,
  type NetworkRef,
  type Output,
  Project,
  Subnetwork,
  all,
} from '../lib/index.ts';

/**
 * The shared-network host project and network. The environment owns this because
 * it exists before workloads and many workloads attach to it. Its contract
 * exposes the usable shape (network identity, attachable subnet) - not every
 * consumer.
 */
export function buildNetwork(
  env: EnvironmentName,
  billingAccountId: Output<string> | string,
  folderId: Output<string> | string
): { hostProject: Project; network: Output<NetworkRef> } {
  const hostProject = new Project('host', {
    displayName: `${env}-host`,
    folderId,
    billingAccountId,
  });

  const network = new Network('shared-network', { projectId: hostProject.projectId });

  const primary = new Subnetwork('primary', {
    network: network.id,
    region: 'region-a',
    cidr: '10.0.0.0/20',
  });

  return {
    hostProject,
    network: all([network.id, primary.id]).apply(([networkId, primarySubnetId]) => ({
      networkId: networkId as string,
      primarySubnetId: primarySubnetId as string,
    })),
  };
}
