import type { Output } from '../runtime.ts';

/**
 * Static backend contract (produced by a static/frontend workload, consumed by
 * edge). The same edge tier routes to a bucket backend or a service backend; it
 * does not care which kind of workload published it.
 */

export interface RouteRule {
  pathMatch: string;
  rewriteTo: string;
}

export interface StaticBackendRef {
  name: string;
  hostname: string;
  bucketName: string;
  backendBucketId: string;
  routeRules?: RouteRule[];
}

export interface StaticBackendInstance {
  output: Output<StaticBackendRef>;
}

export interface StaticBackendArgs {
  name: string;
  projectId: Output<string> | string;
  hostname: string;
  routeRules?: RouteRule[];
}
