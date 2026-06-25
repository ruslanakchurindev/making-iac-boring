/**
 * Runnable walkthrough of the abstract target shape.
 *
 * It applies the tiers in order, resolves the cross-tier contracts, prints the
 * resource plan and the wave matrices, and then fires each release-path refusal
 * to show the resolver stopping bad composition before any "apply".
 *
 *   node demo/run.ts
 */

import {
  EnvZone,
  InMemoryStackReference,
  type StackReference,
  type ZoneEntry,
  assertDnsRequest,
  assertSecretRequest,
  buildDomainTopology,
  getCatalogEntry,
  getDomainTopology,
  getNetwork,
  getPlan,
  getServiceProject,
  resetPlan,
  withRegistry,
} from '../lib/index.ts';
import { loadOrganisationRef } from '../environment/ref.ts';
import { buildOrganisation } from '../organisation/index.ts';
import { buildEnvironment } from '../environment/index.ts';
import { buildWorkloadApi } from '../workloads/workload-api/index.ts';
import { buildWebApp } from '../workloads/web-app/index.ts';
import { buildEdge } from '../edge/index.ts';
import {
  type PreviewResult,
  expandWaves,
  gateDeploy,
  loadManifest,
} from '../deploy/plan.ts';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ENV = 'staging';
const DOMAIN = 'example.invalid';

function section(title: string): void {
  console.log(`\n${'='.repeat(68)}\n  ${title}\n${'='.repeat(68)}`);
}

let failures = 0;

function expectRefusal(label: string, fn: () => unknown): void {
  try {
    fn();
    failures++;
    console.log(`  ✗ ${label}\n      expected a refusal, got none`);
  } catch (err) {
    console.log(`  ✓ ${label}\n      refused: ${(err as Error).message}`);
  }
}

// --- Apply the tiers in order ----------------------------------------------

resetPlan();

section('Tier 1 - organisation (publishes serviceCatalog, domainTopology)');
const orgOutputs = buildOrganisation();
const orgRef: StackReference = new InMemoryStackReference(orgOutputs);
console.log(
  '  serviceCatalog:',
  Object.keys(orgOutputs.serviceCatalog as object).join(', ')
);
console.log(
  `  domainTopology[${DOMAIN}]:`,
  Object.keys(
    (orgOutputs.domainTopology as Record<string, { zones: object }>)[DOMAIN]
      .zones
  ).join(', ')
);

section('Tier 2 - environment (consumes catalogue, publishes serviceProjects)');
const envOutputs = buildEnvironment(orgRef, ENV);
const envRef: StackReference = new InMemoryStackReference(envOutputs);
console.log(
  '  serviceProjects:',
  Object.keys(envOutputs.serviceProjects as object).join(', ')
);
console.log('  network:', JSON.stringify(envOutputs.network));
console.log(
  '  getNetwork(envRef, "primary"):',
  `subnet ${getNetwork(envRef, 'primary').value.primarySubnetId}`
);

section('Workload - workload-api (consumes serviceProjects, publishes services)');
const apiOutputs = buildWorkloadApi(envRef, ENV, 'build-001');
const apiRef: StackReference = new InMemoryStackReference(apiOutputs);
console.log('  services:', Object.keys(apiOutputs.services as object).join(', '));
console.log(
  '  staticBackends:',
  Object.keys(apiOutputs.staticBackends as object).join(', ')
);

section('Workload - web-app (managed frontend, owns delegated DNS record)');
const webOutputs = buildWebApp(envRef, orgRef, ENV);
console.log('  domain:', webOutputs.domain);

section('Tier 3 - edge (consumes services + staticBackends + topology)');
const edgeOutputs = buildEdge(orgRef, apiRef, ENV);
console.log('  load balancer address:', edgeOutputs.address);

// --- The resource plan ------------------------------------------------------

section('Resource plan (what the program would create)');
const plan = getPlan();
const byType = new Map<string, number>();
for (const r of plan) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
for (const [type, count] of [...byType.entries()].sort())
  console.log(`  ${String(count).padStart(3)}  ${type}`);
console.log(`  ${'-'.repeat(40)}\n  ${String(plan.length).padStart(3)}  total`);

// --- The transitional file seam --------------------------------------------

section('Contract seam - organisation outputs via a file-backed StackReference');
const seamDir = mkdtempSync(join(tmpdir(), 'iac-example-'));
const seamPath = join(seamDir, 'org-outputs.json');
try {
  writeFileSync(seamPath, JSON.stringify(orgOutputs, null, 2));
  process.env.ORG_OUTPUTS_PATH = seamPath;
  const fileOrgRef = loadOrganisationRef();
  console.log(`  wrote ${seamPath}`);
  console.log(
    '  getCatalogEntry(file-backed ref, "workload-api"):',
    getCatalogEntry(fileOrgRef, 'workload-api').value.name
  );
} finally {
  delete process.env.ORG_OUTPUTS_PATH;
  rmSync(seamDir, { recursive: true, force: true });
}

// --- Wave plan --------------------------------------------------------------

section('Wave plan - shared-foundation pipeline (organisation → environment → edge)');
const manifest = loadManifest(new URL('../deploy/manifest.json', import.meta.url).pathname);
const waves = expandWaves(
  manifest,
  ['organisation', 'environment', 'edge'],
  ['test', 'staging', 'prod']
);
for (const wave of waves) {
  console.log(`  wave ${wave.wave}:`);
  for (const e of wave.entries) {
    const gate = e.requiresApproval ? '  (named approval)' : '';
    console.log(`      ${e.stack}/${e.env}${gate}`);
  }
}

// --- Release-path refusals --------------------------------------------------

section('Release-path refusals - bad composition fails before apply');

console.log('\n  validated helpers:');
expectRefusal('unknown service in serviceProjects', () =>
  getServiceProject(envRef, 'unknown-worker').value
);
expectRefusal('unknown service in catalogue', () =>
  getCatalogEntry(orgRef, 'missing-service').value
);
expectRefusal('capability the entry never declared', () =>
  withRegistry(getCatalogEntry(orgRef, 'web-app')).artifactRegistry.value
);

console.log('\n  network contract:');
expectRefusal('missing key in network (no secondary)', () =>
  getNetwork(envRef, 'secondary').value
);
expectRefusal('network output absent from the reference', () =>
  getNetwork(new InMemoryStackReference({}), 'primary').value
);

console.log('\n  domain topology:');
expectRefusal('missing zone (api has no dev zone)', () =>
  getDomainTopology(orgRef, DOMAIN, 'api', 'dev').value
);
expectRefusal('two zones claim the same name in the same environment', () => {
  const z1 = new EnvZone('dup-a', { fqdn: `api.${ENV}.${DOMAIN}` });
  const z2 = new EnvZone('dup-b', { fqdn: `api.${ENV}.${DOMAIN}` });
  const entries: ZoneEntry[] = [
    { parentDomain: DOMAIN, appKey: 'api', env: ENV, output: z1.output },
    { parentDomain: DOMAIN, appKey: 'api', env: ENV, output: z2.output },
  ];
  return buildDomainTopology(entries).value;
});

console.log('\n  shared-surface binding rules:');
expectRefusal('secret request outside admitted prefix', () =>
  assertSecretRequest(
    { prefix: 'sidecar-', operations: ['access'], holder: 'runtime' },
    { secretName: 'outside-token', operation: 'access', principal: 'runtime' }
  )
);
expectRefusal('DNS write outside the app zone (a sibling zone)', () =>
  assertDnsRequest(
    {
      zone: 'organisation/dns.web-app',
      admits: `*.app.${ENV}.${DOMAIN}`,
      permits: ['CNAME'],
      ops: ['CREATE'],
      holder: 'web-app/deploy',
    },
    {
      name: `api.${ENV}.${DOMAIN}`,
      type: 'CNAME',
      op: 'CREATE',
      principal: 'web-app/deploy',
    }
  )
);

console.log('\n  wave planner:');
const previews: PreviewResult[] = [
  { stack: 'organisation', env: 'prod', ok: true },
  { stack: 'environment', env: 'staging', ok: false, error: 'serviceProjects missing key' },
];
const gate = gateDeploy(previews);
if (gate.blocked) {
  console.log(
    `  ✓ failed preview blocks deploy\n      reason: ${gate.reasons.join('; ')}`
  );
} else {
  failures++;
  console.log('  ✗ expected the deploy to be blocked');
}

console.log('\nDone.\n');

if (failures > 0) {
  console.log(`${failures} check(s) did not refuse as expected.`);
  process.exit(1);
}
