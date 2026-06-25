/**
 * Provider-neutral cloud resources. These are abstract stand-ins, not a real
 * SDK: constructing one records what it *would* create (via `Resource`) and
 * exposes the few output attributes that component code references.
 *
 * Names borrow from common infrastructure vocabulary (Project, ServiceAccount,
 * identity binding, key, container service, bucket, DNS record) so the shapes are
 * recognisable, but nothing here is tied to a specific provider or organisation.
 */

import { Output, Resource, interpolate, output } from './runtime.ts';

type In<T> = T | Output<T>;

// --- Project & API enablement ----------------------------------------------

export class ApiEnablement extends Resource {
  constructor(name: string, args: { projectId: In<string>; services: string[] }) {
    super('cloud:ApiEnablement', name, { ...args });
  }
}

export class Project extends Resource {
  readonly projectId: Output<string>;

  constructor(
    name: string,
    args: { displayName: In<string>; folderId: In<string>; billingAccountId: In<string> }
  ) {
    super('cloud:Project', name, { ...args });
    this.projectId = output(args.displayName);
  }
}

// --- Identity ---------------------------------------------------------------

export class ServiceAccount extends Resource {
  readonly email: Output<string>;
  readonly member: Output<string>;
  readonly id: Output<string>;

  constructor(name: string, args: { projectId: In<string>; accountId: In<string> }) {
    super('cloud:ServiceAccount', name, { ...args });
    this.email = interpolate`${args.accountId}@${args.projectId}.iam.local`;
    this.member = interpolate`serviceAccount:${this.email}`;
    this.id = interpolate`projects/${args.projectId}/serviceAccounts/${this.email}`;
  }
}

export interface IdentityCondition {
  title: string;
  description: string;
  /** A prefix predicate, e.g. `secret.startsWith("deploy-")`. */
  expression: string;
}

export class IdentityBinding extends Resource {
  constructor(
    name: string,
    args: {
      scope: In<string>;
      role: string;
      member: In<string>;
      condition?: IdentityCondition;
    }
  ) {
    super('cloud:IdentityBinding', name, { ...args });
  }
}

// --- Key material -----------------------------------------------------------

export class KeyResource extends Resource {
  readonly id: Output<string>;

  constructor(name: string, args: { projectId: In<string>; keyName: In<string> }) {
    super('cloud:KeyResource', name, { ...args });
    this.id = interpolate`projects/${args.projectId}/keys/${args.keyName}`;
  }
}

// --- Workload identity federation (OIDC) ------------------------------------

export class WorkloadIdentityPool extends Resource {
  readonly name: Output<string>;

  constructor(name: string, args: { projectId: In<string>; poolId: string }) {
    super('cloud:WorkloadIdentityPool', name, { ...args });
    this.name = interpolate`pools/${args.poolId}`;
  }
}

export class WorkloadIdentityProvider extends Resource {
  readonly name: Output<string>;

  constructor(
    name: string,
    args: {
      pool: WorkloadIdentityPool;
      providerId: string;
      issuerUri: string;
      attributeCondition: string;
    }
  ) {
    super('cloud:WorkloadIdentityProvider', name, {
      poolId: args.pool.resourceName,
      providerId: args.providerId,
      issuerUri: args.issuerUri,
      attributeCondition: args.attributeCondition,
    });
    this.name = interpolate`${args.pool.name}/providers/${args.providerId}`;
  }
}

export class WorkloadIdentityBinding extends Resource {
  constructor(
    name: string,
    args: { serviceAccountId: In<string>; principal: In<string> }
  ) {
    super('cloud:WorkloadIdentityBinding', name, { ...args });
  }
}

// --- Network ----------------------------------------------------------------

export class Network extends Resource {
  readonly id: Output<string>;

  constructor(name: string, args: { projectId: In<string> }) {
    super('cloud:Network', name, { ...args });
    this.id = interpolate`networks/${name}`;
  }
}

export class Subnetwork extends Resource {
  readonly id: Output<string>;

  constructor(
    name: string,
    args: { network: In<string>; region: string; cidr: string }
  ) {
    super('cloud:Subnetwork', name, { ...args });
    this.id = interpolate`subnets/${name}`;
  }
}

// --- Containerised workload -------------------------------------------------

export class ContainerService extends Resource {
  readonly url: Output<string>;
  /** The backend id an edge load balancer routes to. */
  readonly backendId: Output<string>;

  constructor(
    name: string,
    args: {
      projectId: In<string>;
      image: In<string>;
      serviceAccount: In<string>;
      env?: Record<string, In<string>>;
      sidecar?: boolean;
      /** Shared-network subnet the service attaches to (from `network.primary`). */
      subnet?: In<string>;
    }
  ) {
    super('cloud:ContainerService', name, { ...args });
    this.url = interpolate`https://${name}-${args.projectId}.service.local`;
    this.backendId = interpolate`backend-services/${name}`;
  }
}

// --- Static / object storage ------------------------------------------------

export class Bucket extends Resource {
  readonly bucketName: Output<string>;
  readonly backendId: Output<string>;

  constructor(name: string, args: { projectId: In<string> }) {
    super('cloud:Bucket', name, { ...args });
    this.bucketName = interpolate`${args.projectId}-${name}`;
    this.backendId = interpolate`backend-buckets/${name}`;
  }
}

// --- DNS --------------------------------------------------------------------

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'NS';

export class DnsRecord extends Resource {
  constructor(
    name: string,
    args: { zoneId: In<string>; fqdn: string; type: DnsRecordType; value: In<string> }
  ) {
    super('cloud:DnsRecord', name, { ...args });
  }
}

export class DnsZone extends Resource {
  readonly zoneId: Output<string>;
  readonly nameservers: Output<string[]>;

  constructor(name: string, args: { fqdn: string }) {
    super('cloud:DnsZone', name, { ...args });
    this.zoneId = interpolate`zones/${name}`;
    this.nameservers = output([`ns1.${args.fqdn}`, `ns2.${args.fqdn}`]);
  }
}

// --- Edge load balancer -----------------------------------------------------

export class LoadBalancer extends Resource {
  readonly address: Output<string>;

  constructor(
    name: string,
    args: { projectId: In<string>; hostRules: Array<{ host: string; backendId: In<string> }> }
  ) {
    super('cloud:LoadBalancer', name, { ...args });
    this.address = interpolate`lb-ip/${name}`;
  }
}

// --- Managed frontend platform placeholder ----------------------------------

export class FrontendProject extends Resource {
  readonly projectId: Output<string>;

  constructor(name: string, args: { framework: string; rootDirectory?: string }) {
    super('cloud:FrontendProject', name, { ...args });
    this.projectId = interpolate`fe-project/${name}`;
  }
}

export class FrontendEnvironment extends Resource {
  constructor(
    name: string,
    args: { projectId: In<string>; environment: string; domain?: In<string> }
  ) {
    super('cloud:FrontendEnvironment', name, { ...args });
  }
}
