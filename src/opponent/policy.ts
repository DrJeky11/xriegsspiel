import * as sector from './sector-policy.ts';
import * as geographic from './geographic-policy.ts';
import type { Difficulty, Observation } from './types.ts';
export { DIFFICULTIES, randomGenerator } from './geographic-policy.ts';
export const POLICY_VERSION = geographic.POLICY_VERSION;
export const decide = (observation: Observation, difficulty: Difficulty, seed: number) => (observation.geography ? geographic : sector).decide(observation, difficulty, seed);
export const baseline = (observation: Observation, kind: Parameters<typeof sector.baseline>[1], seed = 1) => (observation.geography ? geographic : sector).baseline(observation, kind, seed);
