/**
 * Shared network contract (produced by environment, consumed by workloads).
 *
 * The environment owns the shared-network host project and publishes the
 * network under `network`, keyed by name (`primary`). A workload resolves the
 * key it needs through `getNetwork` instead of reading the raw output. The
 * contract exposes the usable shape (network identity, attachable subnet), not
 * every consumer.
 */
export interface NetworkRef {
  networkId: string;
  primarySubnetId: string;
}
