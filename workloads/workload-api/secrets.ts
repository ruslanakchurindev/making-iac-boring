import type { SecretBindingRule } from '../../lib/index.ts';

/**
 * Secrets this workload uses, by access shape ("secrets by prefix").
 *
 * The same store is written by CI and read at runtime, so each access is a
 * binding rule scoped to a name prefix:
 *   - CI distributes:  create/update/version under `preview-*` and `deploy-*`
 *   - runtime reads:   access only under `sidecar-*`
 *
 * Secret values live nowhere in this repo; only the access shape does.
 */

export function ciSecretRules(deployMember: string): SecretBindingRule[] {
  const distribute: SecretBindingRule['operations'] = [
    'create',
    'update',
    'addVersion',
  ];
  return [
    { prefix: 'preview-', operations: distribute, holder: deployMember },
    { prefix: 'deploy-', operations: distribute, holder: deployMember },
  ];
}

export function runtimeSecretRule(runtimeMember: string): SecretBindingRule {
  return { prefix: 'sidecar-', operations: ['access'], holder: runtimeMember };
}
