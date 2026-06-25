import { ComponentResource, type Output, all, output } from '../runtime.ts';
import { DnsZone } from '../cloud.ts';
import type { ZoneRef } from './types.ts';

/** A per-environment hosted zone. Publishes a `ZoneRef` for the topology. */
export class EnvZone extends ComponentResource {
  readonly output: Output<ZoneRef>;
  readonly zone: DnsZone;

  constructor(name: string, args: { fqdn: string }) {
    super('platform:organisation:EnvZone', name);

    this.zone = new DnsZone(name, { fqdn: args.fqdn });

    this.output = all([
      output(args.fqdn),
      this.zone.zoneId,
      this.zone.nameservers,
    ]).apply(([fqdn, zoneId, nameservers]) => ({
      fqdn: fqdn as string,
      zoneId: zoneId as string,
      nameservers: nameservers as string[],
    }));
  }
}
