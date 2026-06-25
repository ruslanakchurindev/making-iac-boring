import { type Output, all } from '../runtime.ts';
import type { CatalogEntryInstance, CatalogEntryRef } from './types.ts';

export type ServiceCatalogOutput = Output<Record<string, CatalogEntryRef>>;

/** Aggregate catalogue entries into the `serviceCatalog` producer output. */
export function buildServiceCatalogOutput(
  entries: CatalogEntryInstance[]
): ServiceCatalogOutput {
  return all(entries.map((e) => e.output)).apply((schemas) =>
    Object.fromEntries(schemas.map((s) => [s.name, s]))
  );
}
