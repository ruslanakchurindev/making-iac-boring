/**
 * Shared-surface secret access, modelled as binding rules.
 *
 * A shared secret store is mutated and read by more than one tier, so a
 * resolved value is not enough: each access needs a binding rule that names the
 * admitted name prefix, the permitted operations, and the bound principal.
 *
 * Two access shapes use the same rule:
 *   - CI distributes secrets:  create/update/version under `preview-*` and `deploy-*`
 *   - runtime reads secrets:   access only under `sidecar-*`
 *
 * `bindSecretAccess` writes the identity binding (prefix scoped). `assertSecretRequest`
 * is the resolver-side check: it refuses a request whose name, operation, or
 * principal falls outside the rule - before any provider call runs.
 */

import { IdentityBinding, type IdentityCondition } from './cloud.ts';
import { type Output, read } from './runtime.ts';

export type SecretOperation = 'access' | 'create' | 'update' | 'addVersion';

export interface SecretBindingRule {
  /** Admitted secret-name prefix, e.g. `deploy-`, `preview-`, `sidecar-`. */
  prefix: string;
  /** Operations this principal may perform on names under the prefix. */
  operations: SecretOperation[];
  /** The bound principal string. */
  holder: Output<string> | string;
}

function prefixCondition(prefix: string): IdentityCondition {
  return {
    title: `secrets-${prefix}only`,
    description: `Access only to secrets named ${prefix}*`,
    // The backing platform enforces this after IaC writes the policy.
    expression: `secret.name.startsWith("${prefix}")`,
  };
}

/** Write the prefix-scoped identity binding for one access shape on a shared store. */
export function bindSecretAccess(
  name: string,
  args: { projectId: Output<string> | string; rule: SecretBindingRule; role: string }
): IdentityBinding {
  return new IdentityBinding(`${name}-secrets-${args.rule.prefix}binding`, {
    scope: args.projectId,
    role: args.role,
    member: args.rule.holder,
    condition: prefixCondition(args.rule.prefix),
  });
}

export interface SecretRequest {
  secretName: string;
  operation: SecretOperation;
  principal: string;
}

/**
 * Resolver-side refusal for a shared secret request. A request outside the
 * admitted prefix, a disallowed operation, or a wrong principal is refused and
 * named - the same failure the backing identity condition enforces after apply.
 */
export function assertSecretRequest(
  rule: SecretBindingRule,
  request: SecretRequest
): void {
  if (!request.secretName.startsWith(rule.prefix)) {
    throw new Error(
      `secret '${request.secretName}' is outside admitted prefix '${rule.prefix}*'`
    );
  }
  if (!rule.operations.includes(request.operation)) {
    throw new Error(
      `operation '${request.operation}' not permitted on '${rule.prefix}*' ` +
        `(permitted: ${rule.operations.join(', ')})`
    );
  }
  const holder = read(rule.holder);
  if (request.principal !== holder) {
    throw new Error(
      `principal '${request.principal}' is not the bound holder for '${rule.prefix}*'`
    );
  }
}
