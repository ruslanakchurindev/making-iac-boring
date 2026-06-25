import type { Output, StackReference } from '../runtime.ts';
import type { CatalogEntryRef } from './types.ts';

/**
 * Resolve one catalogue entry by name. Refuses, naming the contract, when the
 * `serviceCatalog` output is missing or the requested service is absent.
 */
export function getCatalogEntry(
  stackRef: StackReference,
  serviceName: string
): Output<CatalogEntryRef> {
  return stackRef
    .getOutput('serviceCatalog')
    .apply((catalog) => {
      if (!catalog) {
        throw new Error(
          `'serviceCatalog' output not found. Ensure the organisation stack ` +
            `exports it via buildServiceCatalogOutput().`
        );
      }

      const entries = catalog as Record<string, CatalogEntryRef>;
      const entry = entries[serviceName];
      if (entry) return entry;

      const available = Object.keys(entries).join(', ') || '(none)';
      throw new Error(
        `service '${serviceName}' not found in catalogue. Available: ${available}`
      );
    });
}
