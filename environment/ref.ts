import {
  FileStackReference,
  InMemoryStackReference,
  type StackOutputs,
  type StackReference,
} from '../lib/index.ts';

/**
 * The organisation reference, two ways.
 *
 * Transitional seam: CI materialises the organisation stack's outputs to a JSON
 * file, and consumers keep calling the same helpers through a fake
 * StackReference wrapped around that file. The stable part is the helper call;
 * the file is just transport. `ORG_OUTPUTS_PATH` selects it.
 *
 * When tiers run together in the demo, an in-memory reference stands in for the
 * same transport without touching disk.
 */
export function loadOrganisationRef(inMemory?: StackOutputs): StackReference {
  const path = process.env.ORG_OUTPUTS_PATH;
  if (path) {
    return new FileStackReference(path);
  }
  if (inMemory) {
    return new InMemoryStackReference(inMemory);
  }
  throw new Error(
    'no organisation outputs: set ORG_OUTPUTS_PATH or pass in-memory outputs'
  );
}
