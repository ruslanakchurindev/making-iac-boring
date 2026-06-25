/**
 * The wave planner for the shared-foundation pipeline.
 *
 * It expands a manifest of requested stacks into wave matrices in dependency
 * order - organisation, each environment, then edge - and previews every stack
 * before any deploy. A failed preview blocks the default deploy path; staging
 * and production require named approval. Workloads deploy on their own release
 * path and are not part of this manifest.
 */

import { readFileSync } from 'node:fs';
import { ALL_ENVIRONMENTS, type EnvironmentName } from '../lib/index.ts';

export interface StackConfig {
  tier: number;
  environments: EnvironmentName[];
}

export interface Manifest {
  stacks: Record<string, StackConfig>;
}

/** Tiers map to waves; a gap in tiers just leaves a wave empty. */
const TIER_TO_WAVE: Record<number, number> = { 1: 0, 2: 1, 3: 2 };
const WAVES = [0, 1, 2];

const APPROVAL_ENVS: EnvironmentName[] = ['staging', 'prod'];

export interface WaveEntry {
  stack: string;
  env: EnvironmentName;
  tier: number;
  requiresApproval: boolean;
}

export interface Wave {
  wave: number;
  entries: WaveEntry[];
}

export function loadManifest(path: string): Manifest {
  return JSON.parse(readFileSync(path, 'utf-8')) as Manifest;
}

/**
 * Expand the manifest into ordered waves. Each entry is one stack in one
 * environment; entries are ordered by wave, then by environment lifecycle
 * (dev → test → staging → prod).
 */
export function expandWaves(
  manifest: Manifest,
  requestedStacks: string[],
  requestedEnvs: EnvironmentName[]
): Wave[] {
  // Refuse before planning: an unknown stack, or a tier that maps to no wave,
  // is named here rather than silently dropped from every wave.
  for (const stack of requestedStacks) {
    const config = manifest.stacks[stack];
    if (!config) {
      throw new Error(`stack '${stack}' not found in manifest`);
    }
    if (!(config.tier in TIER_TO_WAVE)) {
      throw new Error(
        `stack '${stack}' has tier ${config.tier}, which maps to no wave ` +
          `(known tiers: ${Object.keys(TIER_TO_WAVE).join(', ')}).`
      );
    }
  }

  const waves: Wave[] = [];

  for (const wave of WAVES) {
    const entries: WaveEntry[] = [];

    for (const env of ALL_ENVIRONMENTS) {
      if (!requestedEnvs.includes(env)) continue;

      for (const stack of requestedStacks) {
        const config = manifest.stacks[stack];
        if (TIER_TO_WAVE[config.tier] !== wave) continue;
        if (!config.environments.includes(env)) continue;

        entries.push({
          stack,
          env,
          tier: config.tier,
          requiresApproval: APPROVAL_ENVS.includes(env),
        });
      }
    }

    if (entries.length > 0) waves.push({ wave, entries });
  }

  return waves;
}

export interface PreviewResult {
  stack: string;
  env: EnvironmentName;
  ok: boolean;
  error?: string;
}

/**
 * Gate the deploy path on preview results: a failed preview stops the deploy and
 * names what failed. Workloads deploy on their own path, gated separately.
 */
export function gateDeploy(
  previews: PreviewResult[]
): { blocked: boolean; reasons: string[] } {
  const failed = previews.filter((p) => !p.ok);
  const reasons = failed.map(
    (p) => `${p.stack}/${p.env}: ${p.error ?? 'preview failed'}`
  );
  return { blocked: failed.length > 0, reasons };
}
