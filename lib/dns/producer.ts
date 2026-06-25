import { type Output, all } from '../runtime.ts';
import type { DomainTopologyRef, ParentDomainRef, ZoneEntry } from './types.ts';

export type DomainTopologyOutput = Output<DomainTopologyRef>;

/**
 * Build the `domainTopology` producer output. Refuses when two zone entries
 * claim the same name in the same environment - naming the duplicate rather
 * than silently choosing one.
 */
export function buildDomainTopology(entries: ZoneEntry[]): DomainTopologyOutput {
  return all(entries.map((e) => e.output)).apply((zones) => {
    const topology: DomainTopologyRef = {};

    entries.forEach((entry, i) => {
      const key = `${entry.appKey}.${entry.env}`;
      const parent: ParentDomainRef =
        topology[entry.parentDomain] ?? { zones: {} };

      if (parent.zones[key]) {
        throw new Error(
          `duplicate zone '${key}' under '${entry.parentDomain}': two entries ` +
            `claim the same name in the same environment`
        );
      }

      parent.zones[key] = zones[i];
      topology[entry.parentDomain] = parent;
    });

    return topology;
  });
}
