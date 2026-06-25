import {
  ComponentResource,
  type EnvironmentName,
  type Output,
  all,
  interpolate,
  output,
} from '../runtime.ts';
import {
  FrontendEnvironment,
  IdentityBinding,
  KeyResource,
  Project,
  ServiceAccount,
  WorkloadIdentityBinding,
} from '../cloud.ts';
import { enableStandardApis } from '../bootstrap.ts';
import type { ServiceProjectArgs, ServiceProjectRef } from './types.ts';

/**
 * Creates the workload boundary the environment tier owns, then publishes the
 * assigned reference upward. It provisions the project, enables APIs, creates a
 * dedicated deploy identity with OIDC trust, grants shared-network access,
 * creates the per-project key surface, wires image-registry or frontend
 * capability, and exposes `output`. The workload consumes the reference; it
 * never creates the project - that reversal is the ownership-boundary rule.
 */
export class ServiceProject extends ComponentResource {
  readonly output: Output<ServiceProjectRef>;
  readonly project: Project;
  readonly deployIdentity: ServiceAccount;

  constructor(name: string, args: ServiceProjectArgs, environment: EnvironmentName) {
    super('platform:environment:ServiceProject', name);

    this.project = new Project(name, {
      displayName: `${environment}-${args.name}`,
      folderId: args.folderId,
      billingAccountId: args.billingAccountId,
    });

    enableStandardApis(name, this.project);

    // Per-project key surface for the secrets this service encrypts.
    const secretsKey = new KeyResource(`${name}-secrets`, {
      projectId: this.project.projectId,
      keyName: 'secrets',
    });

    // Dedicated deploy identity. The workload's CI federates into this.
    this.deployIdentity = new ServiceAccount(`${name}-deploy`, {
      projectId: this.project.projectId,
      accountId: 'deploy',
    });

    new IdentityBinding(`${name}-deploy-owner`, {
      scope: this.project.projectId,
      role: 'roles/project.admin',
      member: this.deployIdentity.member,
    });

    // OIDC trust: the deploy identity is impersonated by the service's CI.
    new WorkloadIdentityBinding(`${name}-oidc`, {
      serviceAccountId: this.deployIdentity.id,
      principal: interpolate`${args.workloadIdentityPool.name}/attribute.service/placeholder/${args.name}`,
    });

    // Shared deploy identity gets cross-project preview/deploy access.
    if (args.deployServiceAccountMember) {
      new IdentityBinding(`${name}-shared-deploy`, {
        scope: this.project.projectId,
        role: 'roles/project.admin',
        member: args.deployServiceAccountMember,
      });
    }

    // Shared-network access lives on the host project, not per subnet.
    if (args.hostProjectId) {
      new IdentityBinding(`${name}-network-user`, {
        scope: args.hostProjectId,
        role: 'roles/network.attach',
        member: this.deployIdentity.member,
      });
    }

    // Image-registry capability: deploy identity may push images.
    const artifactRegistry = args.artifactRegistry
      ? output(args.artifactRegistry)
      : undefined;
    if (artifactRegistry) {
      new IdentityBinding(`${name}-registry-writer`, {
        scope: artifactRegistry.apply((ar) => ar.repositoryId),
        role: 'roles/artifact.writer',
        member: this.deployIdentity.member,
      });
    }

    // Frontend capability: create the managed-frontend environment.
    const frontendInput = args.frontend ? output(args.frontend) : undefined;
    let frontend: Output<ServiceProjectRef['frontend']> | undefined;
    if (frontendInput) {
      new FrontendEnvironment(`${name}-frontend-${environment}`, {
        projectId: frontendInput.apply((f) => f.projectId),
        environment,
      });
      frontend = frontendInput.apply((f) => ({
        projectId: f.projectId,
        environmentName: `${args.name}-${environment}`,
      }));
    }

    this.output = all([
      output(args.name),
      output(args.folderId),
      this.project.projectId,
      this.deployIdentity.member,
      secretsKey.id,
      artifactRegistry ?? output(undefined),
      frontend ?? output(undefined),
    ]).apply(
      ([serviceName, folderId, projectId, deployMember, keyId, ar, fe]) => ({
        name: serviceName as string,
        project: {
          folderId: folderId as string,
          projectId: projectId as string,
          deployMember: deployMember as string,
        },
        keyId: keyId as string,
        ...(ar ? { artifactRegistry: ar as ServiceProjectRef['artifactRegistry'] } : {}),
        ...(fe ? { frontend: fe as ServiceProjectRef['frontend'] } : {}),
      })
    );
  }
}
