import type { Output } from '../runtime.ts';
import type { DnsRecordType } from '../cloud.ts';

/**
 * Domain topology contract (produced by organisation, consumed by edge and
 * workloads). It says which zone owns a name in a given environment. Context is
 * explicit: the caller passes the environment rather than guessing from stack
 * naming.
 */

export interface ZoneRef {
  fqdn: string;
  zoneId: string;
  nameservers: string[];
}

export interface ParentDomainRef {
  /** Keyed by `${appKey}.${env}`. */
  zones: Record<string, ZoneRef>;
}

export type DomainTopologyRef = Record<string, ParentDomainRef>;

export interface ZoneEntry {
  parentDomain: string;
  appKey: string;
  env: string;
  output: Output<ZoneRef>;
}

// --- DNS binding rule -------------------------------------------------------
// Delegation alone leaves permission scope and holder identity unchecked. The
// binding rule names the admitted pattern, permitted record types, operations,
// and the principal allowed to author records in the delegated zone.

export type DnsOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface DnsBindingRule {
  /** Contract address of the delegated zone, e.g. organisation/dns.workload-api. */
  zone: string;
  /** Admitted name pattern, e.g. `*.api.example.invalid`. */
  admits: string;
  permits: DnsRecordType[];
  ops: DnsOperation[];
  /** Bound principal, e.g. `workload-api/deploy`. */
  holder: string;
}

export interface DnsRecordRequest {
  name: string;
  type: DnsRecordType;
  op: DnsOperation;
  principal: string;
}
