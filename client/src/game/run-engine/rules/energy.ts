/**
 * Fate Energy rules (Phase 3), per 玩法核心.txt 二十九.
 *
 * Summon-energy and recycle-energy from the old system are merged into one pool
 * here. Recycling a board hero for energy is a new base rule (the old recycleEnergy
 * only ever came from forced-summon overflow); spending energy to summon or buy an
 * extra Reposition are the two base sinks -- everything else (free reroll, energy ->
 * castle heal, etc.) is explicitly out of core rules per 玩法核心.txt and left for
 * Talent/Relic effects to add later.
 */
import type { FateEnergyState, FateEnergyCostTable, HeroTier } from "../types";

export function gainEnergy(state: FateEnergyState, amount: number): FateEnergyState {
  return { ...state, current: Math.min(state.max, state.current + amount) };
}

export function canAfford(state: FateEnergyState, cost: number): boolean {
  return state.current >= cost;
}

export function spendEnergy(state: FateEnergyState, cost: number): FateEnergyState {
  if (!canAfford(state, cost)) return state;
  return { ...state, current: state.current - cost };
}

/** Recycling a hero currently on the board returns Fate Energy scaled by its Tier. */
export function recycleRewardFor(tier: HeroTier, costTable: FateEnergyCostTable): number {
  return costTable.recycleReward[tier];
}

export function canBuyExtraReposition(state: FateEnergyState, purchasesUsedThisWave: number, costTable: FateEnergyCostTable): boolean {
  return purchasesUsedThisWave < costTable.extraRepositionPurchaseLimitPerWave && canAfford(state, costTable.extraRepositionCost);
}
