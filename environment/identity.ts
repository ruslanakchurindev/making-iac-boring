import {
  type Output,
  ServiceAccount,
  WorkloadIdentityPool,
  WorkloadIdentityProvider,
} from '../lib/index.ts';

/**
 * Federated deploy access for this environment: the OIDC pool/provider a
 * placeholder CI system federates against, and the shared deploy/preview
 * identities granted cross-project access by each ServiceProject.
 */
export function buildIdentity(hostProjectId: Output<string> | string): {
  pool: WorkloadIdentityPool;
  provider: WorkloadIdentityProvider;
  deployServiceAccount: ServiceAccount;
  previewServiceAccount: ServiceAccount;
} {
  const pool = new WorkloadIdentityPool('ci', {
    projectId: hostProjectId,
    poolId: 'ci',
  });

  const provider = new WorkloadIdentityProvider('ci-issuer', {
    pool,
    providerId: 'ci-oidc',
    issuerUri: 'https://issuer.ci.invalid',
    // Only this placeholder source may federate.
    attributeCondition: 'assertion.source_owner == "placeholder-owner"',
  });

  const deployServiceAccount = new ServiceAccount('deploy', {
    projectId: hostProjectId,
    accountId: 'deploy',
  });

  const previewServiceAccount = new ServiceAccount('preview', {
    projectId: hostProjectId,
    accountId: 'preview',
  });

  return { pool, provider, deployServiceAccount, previewServiceAccount };
}
