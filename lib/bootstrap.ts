/**
 * Project bootstrap helpers. In a real program these wrap the slow, ordered
 * API-enablement and service-identity steps every new project needs before any
 * other resource can be created. Here they record the intent and return a
 * dependency anchor.
 */

import { ApiEnablement, type Project } from './cloud.ts';

export const STANDARD_PROJECT_APIS = [
  'network',
  'runtime',
  'secrets',
  'keys',
  'identity',
] as const;

export function enableStandardApis(name: string, project: Project): ApiEnablement {
  return new ApiEnablement(`${name}-apis`, {
    projectId: project.projectId,
    services: [...STANDARD_PROJECT_APIS],
  });
}
