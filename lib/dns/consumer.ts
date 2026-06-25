import type { Output, StackReference } from '../runtime.ts';
import {
  type DnsBindingRule,
  type DnsRecordRequest,
  type DomainTopologyRef,
  type ZoneRef,
} from './types.ts';

/**
 * Resolve which zone owns `appKey` under `parentDomain` in `env`. Context is a
 * required parameter - the caller passes the environment instead of inferring
 * it from stack naming. Refuses, naming the contract, on unknown parent domain
 * or missing zone.
 */
export function getDomainTopology(
  orgRef: StackReference,
  parentDomain: string,
  appKey: string,
  env: string
): Output<ZoneRef> {
  return orgRef.getOutput('domainTopology').apply((value) => {
    const topology = value as DomainTopologyRef | undefined;
    if (!topology) {
      throw new Error(
        "'domainTopology' output not found. Ensure the organisation stack exports it."
      );
    }

    const parent = topology[parentDomain];
    if (!parent) {
      const available = Object.keys(topology).join(', ') || '(none)';
      throw new Error(
        `parent domain '${parentDomain}' not found. Available: ${available}`
      );
    }

    const key = `${appKey}.${env}`;
    const zone = parent.zones[key];
    if (zone) return zone;

    const available = Object.keys(parent.zones).join(', ') || '(none)';
    throw new Error(
      `zone '${key}' not found under '${parentDomain}'. Available: ${available}`
    );
  });
}

/**
 * Match a requested name against a binding rule's admitted pattern. An exact
 * pattern matches only itself. A `*.zone` pattern delegates that one zone: it
 * admits the zone apex and a single non-empty label directly beneath it, and
 * refuses everything else (an empty leftmost label, more than one label beneath
 * the zone, a sibling outside it, or a whole-domain name).
 */
function matchesPattern(name: string, pattern: string): boolean {
  if (!pattern.startsWith('*.')) {
    return name === pattern;
  }
  const zone = pattern.slice(2);
  if (name === zone) return true;
  if (!name.endsWith(`.${zone}`)) return false;
  const label = name.slice(0, name.length - zone.length - 1);
  return label.length > 0 && !label.includes('.');
}

/**
 * Resolver-side refusal for a delegated DNS write. Checks the requested name,
 * record type, operation, and principal against the binding rule before any
 * provider call - the same check that governs shared identity and listener changes.
 */
export function assertDnsRequest(
  rule: DnsBindingRule,
  request: DnsRecordRequest
): void {
  if (!matchesPattern(request.name, rule.admits)) {
    throw new Error(
      `name '${request.name}' is outside admitted pattern '${rule.admits}'`
    );
  }
  if (!rule.permits.includes(request.type)) {
    throw new Error(
      `record type '${request.type}' not permitted (permitted: ${rule.permits.join(' | ')})`
    );
  }
  if (!rule.ops.includes(request.op)) {
    throw new Error(
      `operation '${request.op}' not permitted (permitted: ${rule.ops.join(' | ')})`
    );
  }
  if (request.principal !== rule.holder) {
    throw new Error(
      `principal '${request.principal}' is not the bound holder '${rule.holder}'`
    );
  }
}
