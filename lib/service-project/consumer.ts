import type { Output, StackReference } from '../runtime.ts';
import type { ServiceProjectRef } from './types.ts';

type ServiceMap = Record<string, ServiceProjectRef>;

/**
 * The named capability lookup at the heart of the migration seam. A workload
 * asks the `serviceProjects` producer surface for one assigned project by name,
 * instead of inheriting local wiring or reading raw outputs. The helper resolves the
 * entry or refuses with a named error - before any provider call.
 */
export function getServiceProject(
  ref: StackReference,
  name: string
): Output<ServiceProjectRef> {
  return ref.getOutput('serviceProjects').apply((value) => {
    const projects = value as ServiceMap | undefined;
    if (!projects) {
      throw new Error("'serviceProjects' missing");
    }

    const project = projects[name];
    if (project) return project;

    const keys = Object.keys(projects).join(', ');
    throw new Error(`'${name}' not found. Available: ${keys}`);
  });
}
