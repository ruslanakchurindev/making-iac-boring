# Migrating to this shape

The migration order is: publish explicit producer/consumer contracts, move
consumers, then remove the legacy outputs.

The code shows the destination state, with the old boundary already gone. Each
step below points to the file or seam that embodies that stage of the migration,
so the order still has a code counterpart.

## The deletion order

1. **Publish the new contract beside the old path.**
   The `build*Output` producers and the `*Ref` contract types, one pair per
   surface: `buildServiceCatalogOutput` / `CatalogEntryRef`,
   `buildServiceProjectsOutput` / `ServiceProjectRef`, `buildServicesOutput` /
   `ServiceBackendRef`, `buildStaticBackendsOutput` / `StaticBackendRef`, and
   `buildDomainTopology` / `DomainTopologyRef` (`lib/*/producer.ts`,
   `lib/*/types.ts`).

2. **Publish binding rules for each shared surface touched by the removal,
   where mutation is delegated across tiers.**
   `SecretBindingRule` (`lib/secrets.ts`) and `DnsBindingRule` with its resolver
   `assertDnsRequest` (`lib/dns/types.ts`, `lib/dns/consumer.ts`).

3. **Send new consumers to the contract only.**
   The `get*` resolvers, each refusing before any provider call:
   `getServiceProject`, `getCatalogEntry`, `getNetwork`, `getDomainTopology`,
   `getServiceBackend`, and `getStaticBackend` (`lib/*/consumer.ts`).

4. **Move existing consumers from raw reads to contract resolution.**
   The file-backed seam in `environment/ref.ts` (`loadOrganisationRef`, over
   `FileStackReference` in `lib/runtime.ts`): CI materialises a producer's
   outputs to a file and call-sites keep calling the same helper, so a missing
   key still resolves to `undefined` and the typed resolver above it has to
   refuse.

5. **Move workload-owned members into the workload tier.**
   `workloads/*/index.ts` create the runtime identity, secret bindings, and
   records inside their assigned project; `lib/service-project/component.ts`
   owns the project boundary the workload consumes but never creates.

6. **Block new reads of the old path.**
   The resolver refusals (every `get*` above) and the wave planner's
   preview-before-deploy gate, which blocks a deploy when any stack's preview
   failed (`gateDeploy`, `deploy/plan.ts`).

7. **Remove legacy outputs and resources after consumers are gone.**
   The repo already shows this end state: published outputs no consumer reads
   are gone, and each contract surface exposes the shape a consumer resolves
   rather than the tier's full internal state.

Every refusal in steps 3 and 6 is shown firing in `demo/run.ts`.
