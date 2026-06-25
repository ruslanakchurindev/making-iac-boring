import { type Output, all } from '../runtime.ts';
import type { ServiceProjectInstance, ServiceProjectRef } from './types.ts';

export type ServiceProjectsOutput = Output<Record<string, ServiceProjectRef>>;

/** Aggregate assigned projects into the `serviceProjects` producer output. */
export function buildServiceProjectsOutput(
  projects: ServiceProjectInstance[]
): ServiceProjectsOutput {
  return all(projects.map((p) => p.output)).apply((schemas) =>
    Object.fromEntries(schemas.map((s) => [s.name, s]))
  );
}
