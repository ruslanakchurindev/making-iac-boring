/**
 * Focused reader-facing views for README recordings.
 *
 * The full demo in `run.ts` proves everything in one long walkthrough. These
 * views keep the same code path but compress it into terminal-sized cards for
 * optional recordings.
 */

import {
  EnvZone,
  InMemoryStackReference,
  type PlannedResource,
  type StackReference,
  type ZoneEntry,
  assertDnsRequest,
  assertSecretRequest,
  buildDomainTopology,
  getCatalogEntry,
  getDomainTopology,
  getNetwork,
  getPlan,
  getServiceBackend,
  getServiceProject,
  getStaticBackend,
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

interface BuiltDemo {
  orgOutputs: Record<string, unknown>;
  orgRef: StackReference;
  envOutputs: Record<string, unknown>;
  envRef: StackReference;
  apiOutputs: Record<string, unknown>;
  apiRef: StackReference;
  webOutputs: Record<string, unknown>;
  edgeOutputs: Record<string, unknown>;
  plan: PlannedResource[];
}

function buildDemo(): BuiltDemo {
  resetPlan();

  const orgOutputs = buildOrganisation();
  const orgRef: StackReference = new InMemoryStackReference(orgOutputs);

  const envOutputs = buildEnvironment(orgRef, ENV);
  const envRef: StackReference = new InMemoryStackReference(envOutputs);

  const apiOutputs = buildWorkloadApi(envRef, ENV, 'build-001');
  const apiRef: StackReference = new InMemoryStackReference(apiOutputs);

  const webOutputs = buildWebApp(envRef, orgRef, ENV);
  const edgeOutputs = buildEdge(orgRef, apiRef, ENV);

  return {
    orgOutputs,
    orgRef,
    envOutputs,
    envRef,
    apiOutputs,
    apiRef,
    webOutputs,
    edgeOutputs,
    plan: [...getPlan()],
  };
}

function title(view: string, subtitle: string): void {
  console.log(`iac-example :: ${view}`);
  console.log(subtitle);
  console.log('');
}

function keys(value: unknown): string {
  return Object.keys(value as Record<string, unknown>).join(', ');
}

function countByType(plan: PlannedResource[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const resource of plan) {
    counts.set(resource.type, (counts.get(resource.type) ?? 0) + 1);
  }
  return counts;
}

function topResourceCounts(plan: PlannedResource[]): string {
  const counts = [...countByType(plan).entries()].sort((a, b) => b[1] - a[1]);
  return counts
    .slice(0, 5)
    .map(([type, count]) => `${type.replace('cloud:', '')}=${count}`)
    .join(', ');
}

function withFileBackedOrganisationRef<T>(
  outputs: Record<string, unknown>,
  fn: (ref: StackReference) => T
): T {
  const tmp = mkdtempSync(join(tmpdir(), 'iac-example-'));
  const seamPath = join(tmp, 'org-outputs.json');
  try {
    writeFileSync(seamPath, JSON.stringify(outputs, null, 2));
    process.env.ORG_OUTPUTS_PATH = seamPath;
    return fn(loadOrganisationRef());
  } finally {
    delete process.env.ORG_OUTPUTS_PATH;
    rmSync(tmp, { recursive: true, force: true });
  }
}

function printShape(): void {
  const demo = buildDemo();
  const network = getNetwork(demo.envRef, 'primary').value;

  title('view 1/3', 'Shape: ownership, apply order, published contracts');
  console.log('apply order');
  console.log('  1 organisation -> serviceCatalog, domainTopology');
  console.log('  2 environment  -> serviceProjects, network');
  console.log('  3 workload-api -> services, staticBackends');
  console.log('  4 web-app      -> delegated DNS record');
  console.log('  5 edge         -> load balancer + routing DNS');
  console.log('');
  console.log('published contract keys');
  console.log(`  serviceCatalog: ${keys(demo.orgOutputs.serviceCatalog)}`);
  console.log(`  domainTopology: api.${ENV}, docs.${ENV}, app.${ENV}`);
  console.log(`  serviceProjects: ${keys(demo.envOutputs.serviceProjects)}`);
  console.log(`  network.primary: ${network.primarySubnetId}`);
  console.log(`  workload backends: ${keys(demo.apiOutputs.services)} + ${keys(demo.apiOutputs.staticBackends)}`);
  console.log('');
  console.log(`resource plan: ${demo.plan.length} resources (${topResourceCounts(demo.plan)})`);
}

function printShapeIntro(): void {
  title('shape 1/4', 'The cut: ownership first, dependency direction second');
  console.log('one fake deployment: staging');
  console.log('');
  console.log('tiers');
  console.log('  organisation  company roots, catalogue, domain topology');
  console.log('  environment   landing zone, assigned projects, network');
  console.log('  workload-api  service, runtime identity, docs backend');
  console.log('  web-app       managed frontend, delegated DNS record');
  console.log('  edge          shared routing and load balancer');
  console.log('');
  console.log('rule: lower tiers publish contracts; higher tiers consume them.');
}

function printShapeContracts(): void {
  const demo = buildDemo();
  const network = getNetwork(demo.envRef, 'primary').value;

  title('shape 2/4', 'What each tier publishes');
  console.log(`organisation.serviceCatalog  -> ${keys(demo.orgOutputs.serviceCatalog)}`);
  console.log(`organisation.domainTopology  -> api.${ENV}, docs.${ENV}, app.${ENV}`);
  console.log(`environment.serviceProjects  -> ${keys(demo.envOutputs.serviceProjects)}`);
  console.log(`environment.network.primary  -> ${network.primarySubnetId}`);
  console.log(`workload-api.services        -> ${keys(demo.apiOutputs.services)}`);
  console.log(`workload-api.staticBackends  -> ${keys(demo.apiOutputs.staticBackends)}`);
  console.log(`web-app.domain               -> ${demo.webOutputs.domain}`);
  console.log(`edge.address                 -> ${demo.edgeOutputs.address}`);
  console.log('');
  console.log('nothing here calls a provider; the fake runtime records intent.');
}

function printShapePlan(): void {
  const demo = buildDemo();
  const counts = [...countByType(demo.plan).entries()].sort((a, b) => b[1] - a[1]);

  title('shape 3/4', 'The fake provider plan');
  for (const [type, count] of counts.slice(0, 8)) {
    console.log(`  ${String(count).padStart(2)}  ${type.replace('cloud:', '')}`);
  }
  console.log('  ..  remaining resource stand-ins omitted');
  console.log('');
  console.log(`total: ${demo.plan.length} resources`);
  console.log('purpose: show blast radius and tier membership, not cloud syntax.');
}

function printShapeCode(): void {
  title('shape 4/4', 'Where to read the cut in code');
  console.log('  organisation/index.ts       publishes roots and topology');
  console.log('  environment/index.ts        creates assigned projects');
  console.log('  workloads/workload-api/     owns service members');
  console.log('  workloads/web-app/          owns delegated app record');
  console.log('  edge/index.ts               consumes workload backends');
  console.log('  lib/runtime.ts              records the fake resource plan');
  console.log('');
  console.log('full walkthrough: node demo/run.ts');
}

function printContracts(): void {
  const demo = buildDemo();
  const catalogEntry = getCatalogEntry(demo.orgRef, 'workload-api').value;
  const assigned = getServiceProject(demo.envRef, 'workload-api').value;
  const network = getNetwork(demo.envRef, 'primary').value;
  const api = getServiceBackend(demo.apiRef, 'workload-api').value;
  const docs = getStaticBackend(demo.apiRef, 'workload-api-docs').value;
  const appZone = getDomainTopology(demo.orgRef, DOMAIN, 'app', ENV).value;

  const seamEntry = withFileBackedOrganisationRef(demo.orgOutputs, (fileOrgRef) =>
    getCatalogEntry(fileOrgRef, 'workload-api').value
  );

  title('view 2/3', 'Contracts: consumers ask by name, not by raw wiring');
  console.log('resolved lookups');
  console.log(`  serviceCatalog["workload-api"] -> ${catalogEntry.artifactRegistry?.imagePath}`);
  console.log(`  serviceProjects["workload-api"] -> ${assigned.project.projectId}`);
  console.log(`  network["primary"] -> ${network.primarySubnetId}`);
  console.log(`  services["workload-api"] -> ${api.backendServiceId}`);
  console.log(`  staticBackends["workload-api-docs"] -> ${docs.backendBucketId}`);
  console.log(`  domainTopology app/${ENV} -> ${appZone.zoneId}`);
  console.log('');
  console.log('membership proof');
  console.log('  environment creates project, deploy identity, key, OIDC');
  console.log('  workload creates runtime identity, service, bucket, secret rules');
  console.log('  edge reads workload backends after they exist');
  console.log(`  file seam still resolves: ${seamEntry.name}`);
}

function printContractSurfaces(): void {
  title('contracts 1/4', 'The contract surfaces');
  console.log('surface                      producer -> consumer');
  console.log('  serviceCatalog             organisation -> environment');
  console.log('  serviceProjects            environment  -> workload');
  console.log('  network.primary            environment  -> workload');
  console.log('  services/staticBackends    workload     -> edge');
  console.log('  domainTopology             organisation -> edge/workload');
  console.log('');
  console.log('each surface has: types.ts, producer.ts, consumer.ts, component.ts');
}

function printContractLookups(): void {
  const demo = buildDemo();
  const catalogEntry = getCatalogEntry(demo.orgRef, 'workload-api').value;
  const assigned = getServiceProject(demo.envRef, 'workload-api').value;
  const network = getNetwork(demo.envRef, 'primary').value;
  const api = getServiceBackend(demo.apiRef, 'workload-api').value;
  const docs = getStaticBackend(demo.apiRef, 'workload-api-docs').value;
  const appZone = getDomainTopology(demo.orgRef, DOMAIN, 'app', ENV).value;

  title('contracts 2/4', 'Consumers ask by name');
  console.log(`getCatalogEntry("workload-api")      -> ${catalogEntry.artifactRegistry?.imagePath}`);
  console.log(`getServiceProject("workload-api")    -> ${assigned.project.projectId}`);
  console.log(`getNetwork("primary")                -> ${network.primarySubnetId}`);
  console.log(`getServiceBackend("workload-api")    -> ${api.backendServiceId}`);
  console.log(`getStaticBackend("workload-api-docs")-> ${docs.backendBucketId}`);
  console.log(`getDomainTopology("app", "${ENV}")    -> ${appZone.zoneId}`);
  console.log('');
  console.log('the address is stable even when backing resources move.');
}

function printContractMembership(): void {
  title('contracts 3/4', 'Membership: boundary lower, members higher');
  console.log('environment owns the project boundary');
  console.log('  project, APIs, deploy identity, key, OIDC, network access');
  console.log('');
  console.log('workload owns members inside that boundary');
  console.log('  runtime identity, service, bucket, workload secret rules');
  console.log('');
  console.log('edge owns shared routing');
  console.log('  reads workload backends after they exist');
  console.log('');
  console.log('read: lib/service-project/component.ts and workloads/*/index.ts');
}

function printContractSeam(): void {
  const demo = buildDemo();
  const seamEntry = withFileBackedOrganisationRef(demo.orgOutputs, (fileOrgRef) =>
    getCatalogEntry(fileOrgRef, 'workload-api').value
  );

  title('contracts 4/4', 'The file-backed StackReference seam');
  console.log('transitional path');
  console.log('  producer outputs -> JSON file -> StackReference wrapper');
  console.log('');
  console.log('consumer call-site stays the same');
  console.log('  getCatalogEntry(fileRef, "workload-api")');
  console.log('');
  console.log(`resolved: ${seamEntry.name}`);
  console.log('point: transport can change without changing the contract.');
}

function shorten(value: string, max = 54): string {
  return value.length <= max ? value : `${value.slice(0, max - 3)}...`;
}

function refusal(label: string, fn: () => unknown): string {
  try {
    fn();
    return `[missed] ${label}`;
  } catch (err) {
    return `[refused] ${label} -> ${shorten((err as Error).message)}`;
  }
}

function printRefusals(): void {
  const demo = buildDemo();
  const checks = [
    refusal('unknown assigned service', () =>
      getServiceProject(demo.envRef, 'unknown-worker').value
    ),
    refusal('unknown catalogue entry', () =>
      getCatalogEntry(demo.orgRef, 'missing-service').value
    ),
    refusal('undeclared capability', () =>
      withRegistry(getCatalogEntry(demo.orgRef, 'web-app')).artifactRegistry.value
    ),
    refusal('missing network key', () => getNetwork(demo.envRef, 'secondary').value),
    refusal('missing DNS zone', () =>
      getDomainTopology(demo.orgRef, DOMAIN, 'api', 'dev').value
    ),
    refusal('duplicate DNS owner', () => {
      const z1 = new EnvZone('dup-a', { fqdn: `api.${ENV}.${DOMAIN}` });
      const z2 = new EnvZone('dup-b', { fqdn: `api.${ENV}.${DOMAIN}` });
      const entries: ZoneEntry[] = [
        { parentDomain: DOMAIN, appKey: 'api', env: ENV, output: z1.output },
        { parentDomain: DOMAIN, appKey: 'api', env: ENV, output: z2.output },
      ];
      return buildDomainTopology(entries).value;
    }),
    refusal('secret outside prefix', () =>
      assertSecretRequest(
        { prefix: 'sidecar-', operations: ['access'], holder: 'runtime' },
        { secretName: 'outside-token', operation: 'access', principal: 'runtime' }
      )
    ),
    refusal('DNS write outside zone', () =>
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
    ),
  ];

  const manifest = loadManifest(new URL('../deploy/manifest.json', import.meta.url).pathname);
  const waves = expandWaves(
    manifest,
    ['organisation', 'environment', 'edge'],
    ['test', ENV, 'prod']
  );
  const previews: PreviewResult[] = [
    { stack: 'organisation', env: 'prod', ok: true },
    { stack: 'environment', env: ENV, ok: false, error: 'serviceProjects missing key' },
  ];
  const gate = gateDeploy(previews);

  title('view 3/3', 'Refusals: bad composition dies before apply');
  for (const check of checks) console.log(`  ${check}`);
  console.log('');
  console.log(`wave plan: ${waves.map((w) => `wave ${w.wave}=${w.entries.length}`).join(', ')}`);
  console.log(`deploy gate: ${gate.blocked ? 'blocked' : 'open'}`);
  console.log(`reason: ${gate.reasons.join('; ')}`);
}

function printRefusalHelpers(): void {
  const demo = buildDemo();
  const checks = [
    refusal('unknown assigned service', () =>
      getServiceProject(demo.envRef, 'unknown-worker').value
    ),
    refusal('unknown catalogue entry', () =>
      getCatalogEntry(demo.orgRef, 'missing-service').value
    ),
    refusal('undeclared capability', () =>
      withRegistry(getCatalogEntry(demo.orgRef, 'web-app')).artifactRegistry.value
    ),
    refusal('missing network key', () => getNetwork(demo.envRef, 'secondary').value),
  ];

  title('refusals 1/4', 'Validated helpers refuse bad reads');
  for (const check of checks) console.log(`  ${check}`);
  console.log('');
  console.log('provider calls never run when the contract cannot resolve.');
}

function printRefusalTopology(): void {
  const demo = buildDemo();
  const checks = [
    refusal('missing DNS zone', () =>
      getDomainTopology(demo.orgRef, DOMAIN, 'api', 'dev').value
    ),
    refusal('duplicate DNS owner', () => {
      const z1 = new EnvZone('dup-a', { fqdn: `api.${ENV}.${DOMAIN}` });
      const z2 = new EnvZone('dup-b', { fqdn: `api.${ENV}.${DOMAIN}` });
      const entries: ZoneEntry[] = [
        { parentDomain: DOMAIN, appKey: 'api', env: ENV, output: z1.output },
        { parentDomain: DOMAIN, appKey: 'api', env: ENV, output: z2.output },
      ];
      return buildDomainTopology(entries).value;
    }),
  ];

  title('refusals 2/4', 'Domain topology names ownership failures');
  for (const check of checks) console.log(`  ${check}`);
  console.log('');
  console.log('DNS is resolved by parent domain, app key, and environment.');
  console.log('the topology refuses to guess when ownership is missing or ambiguous.');
}

function printRefusalBindings(): void {
  const checks = [
    refusal('secret outside prefix', () =>
      assertSecretRequest(
        { prefix: 'sidecar-', operations: ['access'], holder: 'runtime' },
        { secretName: 'outside-token', operation: 'access', principal: 'runtime' }
      )
    ),
    refusal('DNS write outside zone', () =>
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
    ),
  ];

  title('refusals 3/4', 'Shared surfaces need binding rules');
  console.log('rule fields: surface, admitted name/prefix, ops, principal');
  console.log('');
  for (const check of checks) console.log(`  ${check}`);
  console.log('');
  console.log('a resolved value is not enough when a tier mutates a shared surface.');
}

function printRefusalWaves(): void {
  const manifest = loadManifest(new URL('../deploy/manifest.json', import.meta.url).pathname);
  const waves = expandWaves(
    manifest,
    ['organisation', 'environment', 'edge'],
    ['test', ENV, 'prod']
  );
  const previews: PreviewResult[] = [
    { stack: 'organisation', env: 'prod', ok: true },
    { stack: 'environment', env: ENV, ok: false, error: 'serviceProjects missing key' },
  ];
  const gate = gateDeploy(previews);

  title('refusals 4/4', 'Preview gates the deploy path');
  for (const wave of waves) {
    console.log(`wave ${wave.wave}: ${wave.entries.map((e) => `${e.stack}/${e.env}`).join(', ')}`);
  }
  console.log('');
  console.log(`deploy gate: ${gate.blocked ? 'blocked' : 'open'}`);
  console.log(`reason: ${gate.reasons.join('; ')}`);
  console.log('');
  console.log('full error detail: node demo/run.ts');
}

const views: Record<string, () => void> = {
  shape: printShape,
  'shape:intro': printShapeIntro,
  'shape:contracts': printShapeContracts,
  'shape:plan': printShapePlan,
  'shape:code': printShapeCode,
  contracts: printContracts,
  'contracts:surfaces': printContractSurfaces,
  'contracts:lookups': printContractLookups,
  'contracts:membership': printContractMembership,
  'contracts:seam': printContractSeam,
  refusals: printRefusals,
  'refusals:helpers': printRefusalHelpers,
  'refusals:topology': printRefusalTopology,
  'refusals:bindings': printRefusalBindings,
  'refusals:waves': printRefusalWaves,
};

function usage(): never {
  console.error('usage: node demo/views.ts <shape|contracts|refusals|all>');
  console.error('       or a tape view such as shape:intro or refusals:waves');
  process.exit(1);
}

const view = process.argv[2] ?? 'all';
if (view !== 'all' && !views[view]) usage();

if (view !== 'all') {
  views[view]();
  process.exit(0);
}

printShape();
console.log('\n');
printContracts();
console.log('\n');
printRefusals();
