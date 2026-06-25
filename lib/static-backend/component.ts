import { ComponentResource, type Output, all, output } from '../runtime.ts';
import { Bucket } from '../cloud.ts';
import type { StaticBackendArgs, StaticBackendRef } from './types.ts';

/**
 * A static backend: an object-storage bucket plus the backend id edge routes
 * to. Used for static frontends served from a bucket; a managed frontend
 * platform publishes the same contract shape.
 */
export class StaticBackend extends ComponentResource {
  readonly output: Output<StaticBackendRef>;
  readonly bucket: Bucket;

  constructor(name: string, args: StaticBackendArgs) {
    super('platform:workload:StaticBackend', name);

    this.bucket = new Bucket(name, { projectId: args.projectId });

    this.output = all([
      output(args.name),
      this.bucket.bucketName,
      this.bucket.backendId,
    ]).apply(([backendName, bucketName, backendBucketId]) => ({
      name: backendName as string,
      hostname: args.hostname,
      bucketName: bucketName as string,
      backendBucketId: backendBucketId as string,
      ...(args.routeRules ? { routeRules: args.routeRules } : {}),
    }));
  }
}
