/**
 * Combat orchestration (Phase 6), per 玩法核心.txt 十四、Hero Auto Skill.
 *
 * This is the module that actually composes Phase 3-5's pure rules into one
 * per-tick update: movement (wave.ts) -> block assignment (block.ts) -> targeting
 * (targeting.ts) -> basic attack + skill trigger (skill.ts) -> effect resolution
 * (the CombatEffectRegistry below) -> castle damage on reach (castle.ts). Hero-
 * specific behavior (what a Fire Mage's T2 Auto Skill actually does) is never
 * hard-coded here -- it's an opaque `effectId` resolved through the registry, kept
 * in run-engine/config/heroes.ts. This file only knows the three generic trigger
 * kinds and how to apply whatever CombatEffectResult a resolver returns.
 */
import type { EnemyInstance, HeroDefinition, HeroInstance, HeroTier } from "../types";
import { RUN_ENGINE_CONFIG } from "../config";

// ---------------------------------------------------------------------------
// Basic Attack
// ---------------------------------------------------------------------------

export function getTierStatMultiplier(definition: HeroDefinition, tier: HeroTier): number {
  return definition.tiers[tier].statMultiplierOverride ?? RUN_ENGINE_CONFIG.tierStatMultiplier[tier];
}

/** Base damage is the hero's baseAttack, scaled by the tier multiplier (十一's
 * 1.0/1.6/2.4, tentative -- per-hero overridable, see HeroTierConfig) and any
 * external combat modifiers (Talent/Blessing/Equipment aggregate -- Phase 7/8
 * territory, kept as a plain multiplier here so this function doesn't need to
 * know where it came from). */
export function getBasicAttackDamage(definition: HeroDefinition, tier: HeroTier, externalDamageMultiplier = 1): number {
  return definition.baseAttack * getTierStatMultiplier(definition, tier) * externalDamageMultiplier;
}

export function getEffectiveAttackInterval(definition: HeroDefinition, externalSpeedMultiplier = 1): number {
  return definition.attackInterval / Math.max(0.1, externalSpeedMultiplier);
}

// ---------------------------------------------------------------------------
// Effect Registry (hero-specific Auto Skill / Trait behavior, filled in per-hero
// in config/heroes.ts -- never inline here)
// ---------------------------------------------------------------------------

export interface CombatEffectContext {
  self: HeroInstance;
  selfDefinition: HeroDefinition;
  /** Pre-computed by targeting.ts's getEnemyTargetPool() -- already respects this
   * hero's coverage + range. Empty for auraOnly (pure Support) heroes. */
  enemyTargetPool: EnemyInstance[];
  /** Pre-computed by targeting.ts's getSupportTargets() -- board-adjacency based,
   * never Route-based (per 九's Support rule). Empty for non-support heroes unless
   * they have a supportRange configured (e.g. a hybrid trait). */
  allySupportPool: Array<{ instanceId: string; hp: number; maxHp: number }>;
  random: () => number;
}

export interface CombatEffectResult {
  damageToEnemies?: Array<{ instanceId: string; amount: number }>;
  healToAllies?: Array<{ instanceId: string; amount: number }>;
  shieldToAllies?: Array<{ instanceId: string; amount: number }>;
  buffToAllies?: Array<{ instanceId: string; statusId: string; magnitude: number; durationMs?: number }>;
  debuffToEnemies?: Array<{ instanceId: string; statusId: string; magnitude: number; durationMs?: number }>;
}

export type CombatEffectResolver = (context: CombatEffectContext) => CombatEffectResult;

export interface CombatEffectRegistry {
  [effectId: string]: CombatEffectResolver;
}

export function resolveEffect(registry: CombatEffectRegistry, effectId: string, context: CombatEffectContext): CombatEffectResult {
  const resolver = registry[effectId];
  if (!resolver) return {};
  return resolver(context);
}
