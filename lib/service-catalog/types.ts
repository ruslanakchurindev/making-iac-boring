import type { Output } from '../runtime.ts';

/**
 * Service catalogue contract (produced by organisation, consumed by environment).
 *
 * The catalogue says which services exist and which shared capabilities each one
 * has. Capabilities are *declared* per entry, not inferred from a service's
 * type: a service gets an artifact registry because its catalogue entry asked
 * for one, so the shared surface stays visible at the producer boundary.
 */

export interface ArtifactRegistryRef {
  repositoryId: string;
  imagePath: string;
}

export interface FrontendProjectRef {
  projectId: string;
}

export interface ReleasersRef {
  team: string;
  reviewers: string[];
}

export interface CatalogEntryRef {
  name: string;
  folderId: string;
  /** Capability: containerised builds push here. */
  artifactRegistry?: ArtifactRegistryRef;
  /** Capability: managed frontend hosting. */
  frontendProject?: FrontendProjectRef;
  /** Capability: release approval team. */
  releasers?: ReleasersRef;
}

export interface CatalogEntryInstance {
  output: Output<CatalogEntryRef>;
}

export interface ServiceCatalogArgs {
  name: string;
  folderId: Output<string> | string;
  artifactRegistry?: { imagePath?: string };
  frontendProject?: { framework: string; rootDirectory?: string };
  releasers?: { team: string; reviewers: string[] };
}
