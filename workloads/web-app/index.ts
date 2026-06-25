/**
 * Workload - web-app (managed frontend placeholder).
 *
 * Consumes its assigned project's frontend capability, and owns its delegated
 * DNS record. The record is workload-owned but written into an organisation
 * zone, so it goes through the DNS binding rule: the workload's deploy identity
 * may write a CNAME in its app zone (`app.<env>.example.invalid`, dropping the label
 * in prod) and nothing else. The resolver checks the request against the rule
 * before the record is created.
 *
 * The frontend platform serves the app directly, so web-app publishes nothing
 * to edge. Its environment variables live in that platform's own per-environment
 * store rather than a shared secret manager, so there is no secret binding here.
 */

import {
  type DnsBindingRule,
  DnsRecord,
  type StackOutputs,
  type StackReference,
  assertDnsRequest,
  getDomainTopology,
  getServiceProject,
} from '../../lib/index.ts';

export function buildWebApp(
  envRef: StackReference,
  orgRef: StackReference,
  env: string
): StackOutputs {
  const assigned = getServiceProject(envRef, 'web-app');
  const frontend = assigned.apply((a) => {
    if (!a.frontend) {
      throw new Error("'web-app' has no frontend capability in its assigned project");
    }
    return a.frontend;
  });

  const zone = getDomainTopology(orgRef, 'example.invalid', 'app', env);
  const appHost = env === 'prod' ? 'app.example.invalid' : `app.${env}.example.invalid`;

  // The binding rule that governs this delegated record. It delegates the app
  // zone only: the apex (`appHost`) and a single label beneath it, nothing else.
  const rule: DnsBindingRule = {
    zone: 'organisation/dns.web-app',
    admits: `*.${appHost}`,
    permits: ['CNAME'],
    ops: ['CREATE', 'UPDATE', 'DELETE'],
    holder: 'web-app/deploy',
  };

  // Refuse before the provider call if the request falls outside the rule.
  assertDnsRequest(rule, {
    name: appHost,
    type: 'CNAME',
    op: 'CREATE',
    principal: 'web-app/deploy',
  });

  new DnsRecord('web-app-domain', {
    zoneId: zone.apply((z) => z.zoneId),
    fqdn: appHost,
    type: 'CNAME',
    value: frontend.apply((f) => `${f.environmentName}.frontend.local`),
  });

  return {
    domain: appHost,
    frontendProjectId: frontend.value.projectId,
  };
}
