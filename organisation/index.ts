/**
 * Tier 1 - organisation.
 *
 * Owns what exists once for the platform boundary before any environment:
 * folders, key roots, the service catalogue, and the domain topology (which
 * zone owns a name in a given environment). It publishes those as stack outputs;
 * nothing here reads a higher tier.
 *
 * In a concrete deployment this is its own IaC program with top-level exports.
 * Here it is a function so the demo can run all tiers in one process.
 */

import {
  EnvZone,
  KeyResource,
  Project,
  type StackOutputs,
  type ZoneEntry,
  buildDomainTopology,
  output,
} from '../lib/index.ts';
import { buildCatalog } from './catalog.ts';

const PARENT_DOMAIN = 'example.invalid';
// api + docs belong to workload-api; app is the web-app managed frontend.
const APPS = ['api', 'docs', 'app'];
const ZONE_ENVS = ['test', 'staging', 'prod'];

export function buildOrganisation(): StackOutputs {
  const organisationProject = new Project('organisation', {
    displayName: 'organisation',
    folderId: 'folders/root',
    billingAccountId: 'billing-placeholder',
  });

  // Workloads live under one folder owned here, before any environment exists.
  const workloadFolderId = output('folders/workloads');

  // Key roots: the keys CI uses to encrypt placeholder secrets during distribution.
  new KeyResource('org-deploy', {
    projectId: organisationProject.projectId,
    keyName: 'deploy',
  });

  const { serviceCatalog } = buildCatalog(workloadFolderId);

  // Domain topology: one hosted zone per app per environment. Production drops
  // the environment label (api.example.invalid); others carry it.
  const zoneEntries: ZoneEntry[] = [];
  for (const env of ZONE_ENVS) {
    for (const app of APPS) {
      const fqdn =
        env === 'prod'
          ? `${app}.${PARENT_DOMAIN}`
          : `${app}.${env}.${PARENT_DOMAIN}`;
      const zone = new EnvZone(`${app}-${env}`, { fqdn });
      zoneEntries.push({
        parentDomain: PARENT_DOMAIN,
        appKey: app,
        env,
        output: zone.output,
      });
    }
  }
  const domainTopology = buildDomainTopology(zoneEntries);

  return {
    serviceCatalog: serviceCatalog.value,
    domainTopology: domainTopology.value,
    workloadFolderId: workloadFolderId.value,
    billingAccountId: 'billing-placeholder',
  };
}
