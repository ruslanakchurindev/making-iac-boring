# iac-example

A runnable companion to
[Making IaC boring](https://ruslanakchurin.dev/blog/making-iac-boring/).

The series names the architecture. This repo makes the shape executable with
placeholder infrastructure: four tiers cut along ownership, typed cross-tier
contracts, and resolver probes that fail before any provider call.

[Read the series](https://ruslanakchurin.dev/blog/making-iac-boring/) |
[Run the demo](#run-it) |
[Watch the recordings](#guided-recordings)

No provider SDKs, credentials, live domains, or production configuration are
used. Domains use the reserved `.invalid` suffix, and all names are generic
fixtures.

## Run it

No install is needed for the demo. It uses native TypeScript on Node >= 22.6.

```sh
node demo/run.ts
```

The walkthrough applies the tiers in order, resolves every contract, prints the
resource plan and release waves, then fires the refusal probes.

## Verify it

Install dependencies only when running the repository checks.

```sh
npm ci
npm run check
```

`npm run check` type-checks the code, runs the full demo, and runs the condensed
recording views.

## Guided recordings

The same demo is split into three short recordings. Each recording clears the
terminal between cards so the frame stays readable in GitHub.

```sh
npm run demo:shape
npm run demo:contracts
npm run demo:refusals
```

The GIFs are committed. Regenerating them requires
[VHS](https://github.com/charmbracelet/vhs):

```sh
npm run recordings
```

### 1. Shape and ownership

![Shape and ownership](docs/assets/01-shape.gif)

The first recording shows the tier cut, what each tier publishes, the fake
resource plan, and the files that carry the shape.

### 2. Contracts and membership

![Contracts and membership](docs/assets/02-contracts.gif)

The second recording shows consumers resolving named contracts instead of raw
stack-output paths. It also shows the membership rule: environment owns the
project boundary; workloads create their runtime members inside it.

### 3. Refusals before apply

![Refusals before apply](docs/assets/03-refusals.gif)

The third recording fires the bad compositions deliberately: unknown service,
undeclared capability, missing network key, missing DNS zone, duplicate DNS
owner, invalid secret request, invalid DNS write, and a failed preview blocking
deploy.

## Shape

```mermaid
flowchart TD
  O["organisation<br/>service catalogue<br/>DNS roots<br/>key roots<br/>folders"]
  E["environment<br/>workload projects<br/>shared network<br/>deploy identity + OIDC"]
  W["workload release path<br/>services<br/>runtime identity<br/>delegated records"]
  G["edge<br/>load balancer<br/>routing<br/>certificates"]

  O -->|"serviceCatalog<br/>domainTopology"| E
  E -->|"serviceProjects<br/>network"| W
  W -->|"services<br/>staticBackends"| G
  O -->|"domainTopology"| G
```

## What to look for

- **Ownership cut:** organisation, environment, workload, and edge change for
  different reasons.
- **Contract resolution:** consumers ask for named capabilities such as
  `serviceProjects["workload-api"]` and `network["primary"]`.
- **Membership:** the environment creates the project boundary; the workload
  creates service-owned members inside it.
- **Shared-surface rules:** DNS and secret access need binding rules, not only
  resolved values.
- **Release gates:** failed previews block the deploy path before apply.

## Read the code

| Question | Start here |
| --- | --- |
| What does the full demo do? | `demo/run.ts` |
| Where are the tiers? | `organisation/`, `environment/`, `workloads/`, `edge/` |
| Where do resolver refusals live? | `lib/*/consumer.ts`, `lib/secrets.ts`, `lib/dns/consumer.ts` |
| How does this map to the migration order? | `MIGRATION.md` |
