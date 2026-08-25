/**
 * Relic Dice-reinterpretation hooks (Phase 8), per 玩法核心.txt 三十五.
 *
 * Core Dice rules (rules/dice.ts) stay simple on purpose -- extra readings like
 * "every die is 6" or "used every Reroll before confirming" are Relic/Talent
 * territory, plugged in through this registry rather than baked into
 * evaluateDiceHand()/getEligibleComboEffects(). Same opaque-effectId-through-a-
 * registry pattern as rules/combat.ts's CombatEffectRegistry and rules/talent.ts.
 *
 * No real Relic item lives here -- content belongs to the (untouched) meta/
 * economy layer. RELIC_DICE_EFFECT_EXAMPLES below exists only to prove the hook
 * works end-to-end (and is exercised by relic.test.ts); real Relics register
 * their own resolvers into the same registry shape once that content exists.
 */
export interface DiceRelicEffectContext {
  finalValues: number[];
  rerollsUsed: number;
  maxRerolls: number;
}

export interface DiceRelicEffectResult {
  fateEnergyBonus?: number;
  damageMultiplierBonus?: number;
  extraRewardMultiplier?: number;
}

export type DiceRelicEffectResolver = (context: DiceRelicEffectContext) => DiceRelicEffectResult;
export type DiceRelicEffectRegistry = Record<string, DiceRelicEffectResolver>;

/** Merges every listed effectId's result -- a hero/relic loadout can carry more
 * than one active Dice-reinterpretation hook at once, and their bonuses combine
 * additively (direct numeric bonuses always stack, per 十三). Unknown effectIds
 * are silently skipped, matching rules/combat.ts's resolveEffect(). */
export function resolveDiceRelicEffects(registry: DiceRelicEffectRegistry, effectIds: string[], context: DiceRelicEffectContext): Required<DiceRelicEffectResult> {
  const total: Required<DiceRelicEffectResult> = { fateEnergyBonus: 0, damageMultiplierBonus: 0, extraRewardMultiplier: 0 };
  effectIds.forEach((effectId) => {
    const result = registry[effectId]?.(context);
    if (!result) return;
    total.fateEnergyBonus += result.fateEnergyBonus ?? 0;
    total.damageMultiplierBonus += result.damageMultiplierBonus ?? 0;
    total.extraRewardMultiplier += result.extraRewardMultiplier ?? 0;
  });
  return total;
}

// ---------------------------------------------------------------------------
// Illustrative examples only (matches the doc's own 三十五 examples) -- not real
// shipped content, just proof the hook shape actually works.
// ---------------------------------------------------------------------------

export const RELIC_DICE_EFFECT_EXAMPLES: DiceRelicEffectRegistry = {
  "example.allSixes": (context) => (context.finalValues.every((value) => value === 6) ? { damageMultiplierBonus: 0.2 } : {}),
  "example.fourEvens": (context) => (context.finalValues.filter((value) => value % 2 === 0).length >= 4 ? { fateEnergyBonus: 1 } : {}),
  "example.usedAllRerolls": (context) => (context.rerollsUsed >= context.maxRerolls ? { extraRewardMultiplier: 0.1 } : {}),
};
