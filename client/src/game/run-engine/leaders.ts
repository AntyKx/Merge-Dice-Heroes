/**
 * Leader Config (Phase 9), per 玩法核心.txt 三十三.
 *
 * Burst effects are carried over (in flavor and rough magnitude) from the
 * existing game/engine/run.ts applyLeaderSkill(), translated into the new
 * opaque-effectId-through-a-registry pattern. Burst always acts on the WHOLE
 * board/battlefield (not a per-hero coverage pool like Auto Skills), so it gets
 * its own light GlobalEffectContext rather than reusing CombatEffectContext,
 * which requires a real `self` HeroInstance -- a Leader's Burst fires even if
 * that hero currently has zero Instances summoned (三十三).
 *
 * Passives are plain always-on modifier deltas rather than a discrete "resolve
 * on some trigger" effect -- they're constant for the whole Run, so there's
 * nothing to re-evaluate per tick.
 */
import type { EnemyInstance, LeaderBurstDefinition, LeaderPassiveDefinition, LeaderState } from "./types";
import type { HeroId } from "../types";
import type { CombatEffectResult } from "./rules/combat";

export interface GlobalEffectContext {
  allyPool: Array<{ instanceId: string; hp: number; maxHp: number }>;
  enemyPool: EnemyInstance[];
  random: () => number;
}

export type LeaderBurstResolver = (context: GlobalEffectContext) => CombatEffectResult;

export interface RunModifiersDelta {
  damageMultiplier?: number;
  castleBonus?: number;
}

export type LeaderPassiveResolver = () => RunModifiersDelta;

function topByPathProgress(pool: EnemyInstance[], count: number): EnemyInstance[] {
  return [...pool].sort((a, b) => b.pathProgress - a.pathProgress).slice(0, count);
}

export const LEADER_PASSIVE_REGISTRY: Record<string, LeaderPassiveResolver> = {
  "knight.passive": () => ({ castleBonus: 2 }),
  "deathKnight.passive": () => ({ castleBonus: 1 }),
  "fighter.passive": () => ({ damageMultiplier: 0.03 }),
  "assassin.passive": () => ({ damageMultiplier: 0.04 }),
  "fireMage.passive": () => ({ damageMultiplier: 0.04 }),
  "frostQueen.passive": () => ({ damageMultiplier: 0.03 }),
  "ranger.passive": () => ({ damageMultiplier: 0.03 }),
  "engineer.passive": () => ({ damageMultiplier: 0.03 }),
  "priest.passive": () => ({ castleBonus: 1 }),
  "bard.passive": () => ({ damageMultiplier: 0.02 }),
};

export const LEADER_BURST_REGISTRY: Record<string, LeaderBurstResolver> = {
  "knight.burst": (context) => ({ shieldToAllies: context.allyPool.map((ally) => ({ instanceId: ally.instanceId, amount: 35 })) }),
  "fireMage.burst": (context) => ({ damageToEnemies: context.enemyPool.map((enemy) => ({ instanceId: enemy.instanceId, amount: 95 })) }),
  "ranger.burst": (context) => ({ damageToEnemies: topByPathProgress(context.enemyPool, 2).map((enemy) => ({ instanceId: enemy.instanceId, amount: 118 })) }),
  "engineer.burst": (context) => ({ damageToEnemies: context.enemyPool.map((enemy) => ({ instanceId: enemy.instanceId, amount: 58 })) }),
  "deathKnight.burst": (context) => ({
    shieldToAllies: context.allyPool.map((ally) => ({ instanceId: ally.instanceId, amount: 24 })),
    damageToEnemies: topByPathProgress(context.enemyPool, 2).map((enemy) => ({ instanceId: enemy.instanceId, amount: 66 })),
  }),
  "bard.burst": (context) => ({
    healToAllies: context.allyPool.map((ally) => ({ instanceId: ally.instanceId, amount: 25 })),
    buffToAllies: context.allyPool.map((ally) => ({ instanceId: ally.instanceId, statusId: "attackSpeed", magnitude: 0.26, durationMs: 3000 })),
  }),
  "fighter.burst": (context) => ({ damageToEnemies: topByPathProgress(context.enemyPool, 3).map((enemy) => ({ instanceId: enemy.instanceId, amount: 92 })) }),
  "frostQueen.burst": (context) => ({ damageToEnemies: context.enemyPool.map((enemy) => ({ instanceId: enemy.instanceId, amount: 76 })) }),
  "assassin.burst": (context) => {
    const target = topByPathProgress(context.enemyPool, 1)[0];
    return target ? { damageToEnemies: [{ instanceId: target.instanceId, amount: 185 }] } : {};
  },
  "priest.burst": (context) => ({
    healToAllies: context.allyPool.map((ally) => ({ instanceId: ally.instanceId, amount: 42 })),
    buffToAllies: context.allyPool.map((ally) => ({ instanceId: ally.instanceId, statusId: "attackSpeed", magnitude: 0.28, durationMs: 3000 })),
  }),
};

const LEADER_DEFINITIONS: Record<HeroId, { passive: LeaderPassiveDefinition; burst: LeaderBurstDefinition }> = {
  knight: { passive: { id: "knightPassive", effectId: "knight.passive" }, burst: { id: "knightBurst", kind: "buffShield", effectId: "knight.burst", requiresRouteChoice: false } },
  deathKnight: { passive: { id: "deathKnightPassive", effectId: "deathKnight.passive" }, burst: { id: "deathKnightBurst", kind: "buffShield", effectId: "deathKnight.burst", requiresRouteChoice: false } },
  fighter: { passive: { id: "fighterPassive", effectId: "fighter.passive" }, burst: { id: "fighterBurst", kind: "attackSkill", effectId: "fighter.burst", requiresRouteChoice: false } },
  assassin: { passive: { id: "assassinPassive", effectId: "assassin.passive" }, burst: { id: "assassinBurst", kind: "attackSkill", effectId: "assassin.burst", requiresRouteChoice: false } },
  fireMage: { passive: { id: "fireMagePassive", effectId: "fireMage.passive" }, burst: { id: "fireMageBurst", kind: "attackSkill", effectId: "fireMage.burst", requiresRouteChoice: false } },
  frostQueen: { passive: { id: "frostQueenPassive", effectId: "frostQueen.passive" }, burst: { id: "frostQueenBurst", kind: "attackSkill", effectId: "frostQueen.burst", requiresRouteChoice: false } },
  ranger: { passive: { id: "rangerPassive", effectId: "ranger.passive" }, burst: { id: "rangerBurst", kind: "attackSkill", effectId: "ranger.burst", requiresRouteChoice: false } },
  engineer: { passive: { id: "engineerPassive", effectId: "engineer.passive" }, burst: { id: "engineerBurst", kind: "attackSkill", effectId: "engineer.burst", requiresRouteChoice: false } },
  priest: { passive: { id: "priestPassive", effectId: "priest.passive" }, burst: { id: "priestBurst", kind: "buffShield", effectId: "priest.burst", requiresRouteChoice: false } },
  bard: { passive: { id: "bardPassive", effectId: "bard.passive" }, burst: { id: "bardBurst", kind: "buffShield", effectId: "bard.burst", requiresRouteChoice: false } },
  // "archer" exists in the old HeroId union but isn't one of the 10 selectable
  // heroes (十二 never lists it) -- kept out of SELECTABLE scope, not given a
  // Leader definition.
  archer: { passive: { id: "archerPassive", effectId: "ranger.passive" }, burst: { id: "archerBurst", kind: "attackSkill", effectId: "ranger.burst", requiresRouteChoice: false } },
};

export function buildLeaderState(heroId: HeroId): LeaderState {
  const definition = LEADER_DEFINITIONS[heroId];
  return { heroId, passive: definition.passive, burst: definition.burst, burstReady: false };
}
