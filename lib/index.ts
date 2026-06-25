/**
 * @platform/iac - the shared library every tier depends on.
 *
 * It carries the four producer/consumer surfaces the system is cut along, the
 * resolver helpers that refuse bad composition before apply, the shared-surface
 * binding rules (secrets, DNS), and the provider-neutral resource stand-ins.
 */

export * from './runtime.ts';
export * from './cloud.ts';
export * from './bootstrap.ts';
export * from './secrets.ts';

export * from './service-catalog/index.ts';
export * from './service-project/index.ts';
export * from './service/index.ts';
export * from './static-backend/index.ts';
export * from './dns/index.ts';
export * from './load-balancer/index.ts';
export * from './network/index.ts';
