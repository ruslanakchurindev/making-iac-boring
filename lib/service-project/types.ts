import type { Output } from '../runtime.ts';
import type { WorkloadIdentityPool } from '../cloud.ts';
import type { CatalogEntryRef } from '../service-catalog/types.ts';

/**
 * Assigned-project contract (produced by environment, consumed by workload).
 *
 * The environment owns the project boundary and publishes the reference upward.
 * A workload asks for its assigned project by name and creates resources inside
 * it - it never discovers or creates the project itself.
 */

export interface AssignedProjectRef {
  folderId: string;
  projectId: string;
  /** The deploy identity the workload's CI impersonates. */
  deployMember: string;
}

export interface ServiceProjectArtifactRegistryRef {
  repositoryId: string;
  imagePath: string;
}

export interface ServiceProjectFrontendRef {
  projectId: string;
  /** The managed-frontend environment created for the current stack. */
  environmentName: string;
}

export interface ServiceProjectRef {
  name: string;
  project: AssignedProjectRef;
  /** Per-project key for the secrets the workload encrypts. */
  keyId: string;
  artifactRegistry?: ServiceProjectArtifactRegistryRef;
  frontend?: ServiceProjectFrontendRef;
}

export interface ServiceProjectInstance {
  output: Output<ServiceProjectRef>;
}

export interface ServiceProjectArgs {
  name: string;
  folderId: Output<string> | string;
  billingAccountId: Output<string> | string;
  /** OIDC pool the deploy identity federates against. */
  workloadIdentityPool: WorkloadIdentityPool;
  /** Org-wide deploy identity granted cross-project access (preview/deploy). */
  deployServiceAccountMember?: Output<string> | string;
  /** Shared network host project the deploy identity may attach workloads to. */
  hostProjectId?: Output<string> | string;
  /** Resolved from the catalogue entry's declared capabilities. */
  artifactRegistry?:
    | ServiceProjectArtifactRegistryRef
    | Output<ServiceProjectArtifactRegistryRef>;
  frontend?:
    | { projectId: string }
    | Output<{ projectId: string }>;
}

// --- Capability helpers: map a catalogue entry into ServiceProject args -----
// The environment tier composes these so a service gets a capability because
// its catalogue entry declared it.

export function withFolder(entry: Output<CatalogEntryRef>): {
  folderId: Output<string>;
} {
  return { folderId: entry.apply((e) => e.folderId) };
}

export function withRegistry(entry: Output<CatalogEntryRef>): {
  artifactRegistry: Output<ServiceProjectArtifactRegistryRef>;
} {
  return {
    artifactRegistry: entry.apply((e) => {
      if (!e.artifactRegistry) {
        throw new Error(
          `service '${e.name}' has no artifactRegistry capability. ` +
            `Use withFolder() only, or declare it in the catalogue entry.`
        );
      }
      return e.artifactRegistry;
    }),
  };
}

export function withFrontend(entry: Output<CatalogEntryRef>): {
  frontend: Output<{ projectId: string }>;
} {
  return {
    frontend: entry.apply((e) => {
      if (!e.frontendProject) {
        throw new Error(
          `service '${e.name}' has no frontendProject capability.`
        );
      }
      return { projectId: e.frontendProject.projectId };
    }),
  };
}
