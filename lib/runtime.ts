/**
 * A tiny IaC-shaped runtime so the contract code in this illustration reads like
 * a real infrastructure program without pulling in a provider SDK.
 *
 * It pulls in no provider SDK: the cloud resources (see `cloud.ts`) are abstract
 * stand-ins that only record what they *would* create. The meaningful part is the
 * typed cross-tier contracts, the resolver that refuses bad composition before
 * any "apply", and the producer/consumer surfaces between tiers.
 *
 * Outputs are eager (they hold a resolved value) so the demo can run start to
 * finish and show a resolver refusal as a thrown error at the call site. In a
 * concrete IaC engine, the same refusal would surface during preview/planning.
 */

import { readFileSync } from 'node:fs';

export class Output<T> {
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  apply<U>(fn: (value: T) => U | Output<U>): Output<U> {
    const result = fn(this.value);
    return result instanceof Output ? (result as Output<U>) : new Output(result);
  }
}

export function output<T>(value: T | Output<T>): Output<T> {
  return value instanceof Output ? value : new Output(value);
}

/**
 * Resolve an array of Outputs (or plain values) into one Output of an array.
 * The homogeneous overload keeps producers strongly typed; the heterogeneous
 * overload returns `unknown[]` for tuple-style use in components.
 */
export function all<T>(values: Array<Output<T> | T>): Output<T[]>;
export function all(values: unknown[]): Output<unknown[]>;
export function all(values: unknown[]): Output<unknown[]> {
  return new Output(values.map((v) => (v instanceof Output ? v.value : v)));
}

/** Template tag that resolves embedded Outputs, mirroring common IaC helpers. */
export function interpolate(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Output<string> {
  let out = '';
  strings.forEach((part, i) => {
    out += part;
    if (i < values.length) {
      const v = values[i];
      out += v instanceof Output ? String(v.value) : String(v);
    }
  });
  return new Output(out);
}

/** Unwrap an Output (illustration-only convenience; real code never does this). */
export function read<T>(value: Output<T> | T): T {
  return value instanceof Output ? value.value : value;
}

// --- StackReference: the cross-tier transport -------------------------------

export interface StackReference {
  /** Producer namespace lookup. Returns the published value or `undefined`. */
  getOutput(name: string): Output<unknown>;
}

/** The plain, serialised values a tier publishes for consumers to resolve. */
export type StackOutputs = Record<string, unknown>;

/** An in-process producer, used when tiers run in the same demo. */
export class InMemoryStackReference implements StackReference {
  private readonly outputs: Record<string, unknown>;

  constructor(outputs: Record<string, unknown>) {
    this.outputs = outputs;
  }

  getOutput(name: string): Output<unknown> {
    return new Output(this.outputs[name]);
  }
}

/**
 * The transitional seam: a fake StackReference wrapped around a JSON file on
 * disk. CI materialises a producer's outputs to a file,
 * and consumers keep calling the same helpers. A missing file fails loudly; a
 * missing key still resolves to `undefined` - which is exactly why the typed
 * resolver above it has to refuse, rather than trusting the read.
 */
export class FileStackReference implements StackReference {
  private readonly outputs: Record<string, unknown>;

  constructor(path: string) {
    let raw: string;
    try {
      raw = readFileSync(path, 'utf-8');
    } catch {
      throw new Error(
        `stack outputs file not found: ${path}. ` +
          `CI must materialise the producer's outputs before consumers resolve.`
      );
    }
    this.outputs = JSON.parse(raw) as Record<string, unknown>;
  }

  getOutput(name: string): Output<unknown> {
    return new Output(this.outputs[name]);
  }
}

// --- Resource plan: what the program "would" create -------------------------

export interface PlannedResource {
  type: string;
  name: string;
  props: Record<string, unknown>;
}

const PLAN: PlannedResource[] = [];

export function recordResource(entry: PlannedResource): void {
  PLAN.push(entry);
}

export function getPlan(): PlannedResource[] {
  return PLAN;
}

export function resetPlan(): void {
  PLAN.length = 0;
}

/**
 * Base for abstract cloud resources. Construction records the resource in the
 * plan instead of calling a provider. Subclasses expose realistic output
 * attributes (ids, members, hostnames) so component code reads naturally.
 */
export class Resource {
  readonly resourceType: string;
  readonly resourceName: string;

  constructor(type: string, name: string, props: Record<string, unknown> = {}) {
    this.resourceType = type;
    this.resourceName = name;
    recordResource({ type, name, props });
  }
}

/** Base for higher-level components that group resources. */
export class ComponentResource {
  readonly componentType: string;
  readonly componentName: string;

  constructor(type: string, name: string) {
    this.componentType = type;
    this.componentName = name;
  }
}

export type EnvironmentName = 'dev' | 'test' | 'staging' | 'prod';

export const ALL_ENVIRONMENTS: EnvironmentName[] = [
  'dev',
  'test',
  'staging',
  'prod',
];
