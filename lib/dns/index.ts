export { EnvZone } from './component.ts';
export { assertDnsRequest, getDomainTopology } from './consumer.ts';
export { buildDomainTopology } from './producer.ts';
export type { DomainTopologyOutput } from './producer.ts';
export type {
  DnsBindingRule,
  DnsOperation,
  DnsRecordRequest,
  DomainTopologyRef,
  ParentDomainRef,
  ZoneEntry,
  ZoneRef,
} from './types.ts';
