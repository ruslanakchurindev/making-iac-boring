# Demo output

The expected output of the walkthrough, captured verbatim, for readers (and
agents) who want the transcript without watching the [recordings](../README.md#recordings).

One command, no install, on Node >= 22.6:

```sh
node demo/run.ts
```

It applies the four tiers in order, resolves every cross-tier contract, prints
the resource plan and the release waves, then fires the refusal probes. The run
exits `0` when every probe refuses as expected. The output is deterministic; the
only per-run value is the temporary file path in the contract-seam section,
masked below as `/tmp/iac-example-XXXXXX`.

```text
====================================================================
  Tier 1 - organisation (publishes serviceCatalog, domainTopology)
====================================================================
  serviceCatalog: workload-api, web-app
  domainTopology[example.invalid]: api.test, docs.test, app.test, api.staging, docs.staging, app.staging, api.prod, docs.prod, app.prod

====================================================================
  Tier 2 - environment (consumes catalogue, publishes serviceProjects)
====================================================================
  serviceProjects: workload-api, web-app
  network: {"primary":{"networkId":"networks/shared-network","primarySubnetId":"subnets/primary"}}
  getNetwork(envRef, "primary"): subnet subnets/primary

====================================================================
  Workload - workload-api (consumes serviceProjects, publishes services)
====================================================================
  services: workload-api
  staticBackends: workload-api-docs

====================================================================
  Workload - web-app (managed frontend, owns delegated DNS record)
====================================================================
  domain: app.staging.example.invalid

====================================================================
  Tier 3 - edge (consumes services + staticBackends + topology)
====================================================================
  load balancer address: lb-ip/edge

====================================================================
  Resource plan (what the program would create)
====================================================================
    2  cloud:ApiEnablement
    2  cloud:Bucket
    1  cloud:ContainerService
    3  cloud:DnsRecord
    9  cloud:DnsZone
    1  cloud:FrontendEnvironment
    1  cloud:FrontendProject
   10  cloud:IdentityBinding
    3  cloud:KeyResource
    1  cloud:LoadBalancer
    1  cloud:Network
    4  cloud:Project
    5  cloud:ServiceAccount
    1  cloud:Subnetwork
    2  cloud:WorkloadIdentityBinding
    1  cloud:WorkloadIdentityPool
    1  cloud:WorkloadIdentityProvider
  ----------------------------------------
   48  total

====================================================================
  Contract seam - organisation outputs via a file-backed StackReference
====================================================================
  wrote /tmp/iac-example-XXXXXX/org-outputs.json
  getCatalogEntry(file-backed ref, "workload-api"): workload-api

====================================================================
  Wave plan - shared-foundation pipeline (organisation → environment → edge)
====================================================================
  wave 0:
      organisation/prod  (named approval)
  wave 1:
      environment/test
      environment/staging  (named approval)
      environment/prod  (named approval)
  wave 2:
      edge/test
      edge/staging  (named approval)
      edge/prod  (named approval)

====================================================================
  Release-path refusals - bad composition fails before apply
====================================================================

  validated helpers:
  ✓ unknown service in serviceProjects
      refused: 'unknown-worker' not found. Available: workload-api, web-app
  ✓ unknown service in catalogue
      refused: service 'missing-service' not found in catalogue. Available: workload-api, web-app
  ✓ capability the entry never declared
      refused: service 'web-app' has no artifactRegistry capability. Use withFolder() only, or declare it in the catalogue entry.

  network contract:
  ✓ missing key in network (no secondary)
      refused: network 'secondary' not found. Available: primary
  ✓ network output absent from the reference
      refused: 'network' output not found. Ensure the environment stack exports it via buildNetwork().

  domain topology:
  ✓ missing zone (api has no dev zone)
      refused: zone 'api.dev' not found under 'example.invalid'. Available: api.test, docs.test, app.test, api.staging, docs.staging, app.staging, api.prod, docs.prod, app.prod
  ✓ two zones claim the same name in the same environment
      refused: duplicate zone 'api.staging' under 'example.invalid': two entries claim the same name in the same environment

  shared-surface binding rules:
  ✓ secret request outside admitted prefix
      refused: secret 'outside-token' is outside admitted prefix 'sidecar-*'
  ✓ DNS write outside the app zone (a sibling zone)
      refused: name 'api.staging.example.invalid' is outside admitted pattern '*.app.staging.example.invalid'

  wave planner:
  ✓ failed preview blocks deploy
      reason: environment/staging: serviceProjects missing key

Done.
```

## What the output shows

- **Ownership cut and apply order.** The tiers print in dependency order:
  organisation, then environment, then the workloads, then edge. Each consumes
  only the contract below it.
- **Contracts resolve by name.** `getNetwork(envRef, "primary")` and
  `getCatalogEntry(..., "workload-api")` ask a producer for a named capability
  rather than reaching into raw outputs.
- **The contract seam is transport-only.** The same `getCatalogEntry` call works
  against a file-backed `StackReference`, so the value's transport can change
  without touching consumer call-sites.
- **The plan is a count, not an apply.** 48 placeholder resources are planned;
  nothing calls a provider.
- **Waves gate the release.** `staging` and `prod` stacks carry
  `(named approval)`; `test` does not.
- **Refusals stop bad composition before apply.** Every probe under
  release-path refusals is expected to throw: unknown service, missing network
  key, missing or duplicate zone, out-of-prefix secret, out-of-pattern DNS
  write, and a failed preview blocking the deploy.

Regenerate this transcript with `node demo/run.ts`. The recordings under
`docs/assets/` show the same walkthrough narrated via `node demo/views.ts`.
