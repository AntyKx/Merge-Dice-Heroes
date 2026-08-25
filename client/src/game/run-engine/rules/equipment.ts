/**
 * Team Equipment application (Phase 8), per 玩法核心.txt 三十四.
 *
 * EquipmentLoadout itself (types.ts) hasn't changed since Phase 2 -- it's exactly
 * what MetaProgressionAdapter.getEquipmentLoadout() already delivers today from
 * the existing (untouched) meta-layer equipment system. This module is just the
 * canonical, single place the rest of the engine reads those three numbers from,
 * instead of every call site poking at loadout.attackMultiplier directly.
 *
 * The old equipment system only has one fixed Weapon/Armor/Relic item each with a
 * narrow bonus (attackMultiplier/castleBonus/extraRerolls) -- the doc's fuller
 * target design (Weapon: crit/boss-damage/combat-style, Armor: shield/damage-
 * reduction/block/recovery, Relic: dice/summon/merge/reposition hooks) is real
 * future CONTENT, not something this phase invents data for. What Phase 8 DOES
 * add is the extension points (below, and relic.ts / signatureWeapon.ts) so that
 * richer equipment can plug in later without another architecture change.
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
