import {
  type Output,
  ServiceCatalog,
  buildServiceCatalogOutput,
} from '../lib/index.ts';

/**
 * The service catalogue: placeholder workloads and the shared capabilities
 * each one declares. `workload-api` is a containerised service (image registry),
 * `web-app` is a managed frontend (frontend project).
 */
export function buildCatalog(folderId: Output<string>): {
  serviceCatalog: ReturnType<typeof buildServiceCatalogOutput>;
} {
  const workloadApi = new ServiceCatalog('workload-api', {
    name: 'workload-api',
    folderId,
    artifactRegistry: { imagePath: 'workload-api' },
    releasers: { team: 'team-a', reviewers: ['reviewer-a', 'reviewer-b'] },
  });

  const webApp = new ServiceCatalog('web-app', {
    name: 'web-app',
    folderId,
    frontendProject: { framework: 'generic-framework', rootDirectory: 'apps/site' },
    releasers: { team: 'team-a', reviewers: ['reviewer-a', 'reviewer-b'] },
  });

  return {
    serviceCatalog: buildServiceCatalogOutput([workloadApi, webApp]),
  };
}
