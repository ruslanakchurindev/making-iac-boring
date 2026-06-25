import { ComponentResource, type Output, all, output } from '../runtime.ts';
import { Bucket, FrontendProject } from '../cloud.ts';
import type {
  ArtifactRegistryRef,
  CatalogEntryRef,
  FrontendProjectRef,
  ReleasersRef,
  ServiceCatalogArgs,
} from './types.ts';

/**
 * One catalogue entry. Per declared capability it provisions the shared surface
 * (artifact registry, frontend project) and folds the reference into its output.
 * Undeclared capabilities are simply absent from the published entry.
 */
export class ServiceCatalog extends ComponentResource {
  readonly output: Output<CatalogEntryRef>;

  constructor(name: string, args: ServiceCatalogArgs) {
    super('platform:organisation:ServiceCatalog', name);

    let artifactRegistry: Output<ArtifactRegistryRef> | undefined;
    if (args.artifactRegistry) {
      // A per-service registry repository the containerised build pushes to.
      const repo = new Bucket(`${name}-registry`, { projectId: 'organisation' });
      artifactRegistry = repo.bucketName.apply((repositoryId) => ({
        repositoryId,
        imagePath: args.artifactRegistry?.imagePath ?? name,
      }));
    }

    let frontendProject: Output<FrontendProjectRef> | undefined;
    if (args.frontendProject) {
      const fe = new FrontendProject(`${name}-frontend`, {
        framework: args.frontendProject.framework,
        rootDirectory: args.frontendProject.rootDirectory,
      });
      frontendProject = fe.projectId.apply((projectId) => ({ projectId }));
    }

    const releasers: ReleasersRef | undefined = args.releasers
      ? { team: args.releasers.team, reviewers: args.releasers.reviewers }
      : undefined;

    this.output = all([
      output(args.name),
      output(args.folderId),
      artifactRegistry ?? output(undefined),
      frontendProject ?? output(undefined),
    ]).apply(([serviceName, folderId, ar, fe]) => ({
      name: serviceName as string,
      folderId: folderId as string,
      ...(ar ? { artifactRegistry: ar as ArtifactRegistryRef } : {}),
      ...(fe ? { frontendProject: fe as FrontendProjectRef } : {}),
      ...(releasers ? { releasers } : {}),
    }));
  }
}
