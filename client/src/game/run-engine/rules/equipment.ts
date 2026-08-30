/**
 * Team Equipment application (Phase 8, expanded per 素材/軍需官密卷), per
 * 玩法核心.txt 三十四.
 *
 * EquipmentLoadout (types.ts) is a straight alias of game/types.ts's
 * EquipmentBonuses -- MetaProgressionAdapter.getEquipmentLoadout() already
 * resolves everything (base items + role-leaning items' team-composition check)
 * before the run engine ever sees it, so every function below is a pure,
 * trivial field read/transform. This module stays the canonical, single place
 * the rest of the engine reads those numbers from, instead of every call site
 * poking at loadout.xxx directly -- keeps the meaning (e.g. "+1" vs "already a
 * 1+x multiplier") documented in exactly one spot per stat.
 */
import type { EquipmentLoadout } from "../types";

export function getEquipmentDamageMultiplier(loadout: EquipmentLoadout): number {
  return 1 + loadout.attackMultiplier;
}

export function getEquipmentCastleBonus(loadout: EquipmentLoadout): number {
  return loadout.castleBonus;
}

export function getEquipmentExtraRerolls(loadout: EquipmentLoadout): number {
  return loadout.extraRerolls;
}

export function getEquipmentAttackSpeedMultiplier(loadout: EquipmentLoadout): number {
  return 1 + loadout.attackSpeedMultiplier;
}

export function getEquipmentCritChance(loadout: EquipmentLoadout): number {
  return loadout.critChance;
}

/** Already resolved into a ready-to-multiply factor (e.g. 0.5 -> 1.5), not the
 * raw stored fraction -- see rules/combat.ts's rollCritMultiplier. */
export function getEquipmentCritDamageFactor(loadout: EquipmentLoadout): number {
  return 1 + loadout.critDamageMultiplier;
}

export function getEquipmentBossDamageMultiplier(loadout: EquipmentLoadout): number {
  return 1 + loadout.bossDamageMultiplier;
}

export function getEquipmentHpMultiplier(loadout: EquipmentLoadout): number {
  return 1 + loadout.hpMultiplier;
}

export function getEquipmentRecoveryPctBonus(loadout: EquipmentLoadout): number {
  return loadout.recoveryPctBonus;
}

export function getEquipmentWaveStartShieldPct(loadout: EquipmentLoadout): number {
  return loadout.shieldOnWaveStartPctCastleHp;
}

/** Capped well short of 100% so no stacking of future sources can ever make a
 * hero literally unable to take damage. */
export function getEquipmentDamageReductionPct(loadout: EquipmentLoadout): number {
  return Math.min(0.9, Math.max(0, loadout.damageReductionPct));
}

export function getEquipmentTankBlockCapacityBonus(loadout: EquipmentLoadout): number {
  return loadout.tankBlockCapacityBonus;
}

export function getEquipmentRepositionBonus(loadout: EquipmentLoadout): number {
  return loadout.repositionBonus;
}

export function getEquipmentFateEnergyMaxBonus(loadout: EquipmentLoadout): number {
  return loadout.fateEnergyMaxBonus;
}

export function getEquipmentSummonCostReduction(loadout: EquipmentLoadout): number {
  return loadout.summonCostReduction;
}

export function getEquipmentFreeMergeChance(loadout: EquipmentLoadout): number {
  return loadout.freeMergeChance;
}

export function getEquipmentComboUpgradeChance(loadout: EquipmentLoadout): number {
  return loadout.comboUpgradeChance;
}

/** Rounded since it gates an integer count of dice, not a continuous magnitude
 * -- a fractional upgrade increment (there currently is none, but future
 * upgradeBonus data might add one) should never leave this at e.g. 1.5. */
export function getEquipmentProtectedDieCount(loadout: EquipmentLoadout): number {
  return Math.max(0, Math.round(loadout.protectedDieCount));
}

export function getEquipmentChainLightningProcChance(loadout: EquipmentLoadout): number {
  return loadout.chainLightningProcChance;
}
