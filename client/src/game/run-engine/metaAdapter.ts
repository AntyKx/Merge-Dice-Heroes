/**
 * Meta-progression Adapter (架構重構 Phase 2).
 *
 * The only bridge between the new Run Engine and the existing lobby/meta systems
 * (hero Level/XP, shop, equipment inventory, dungeons, daily quests). Nothing in
 * game/run-engine/** may import from game/store.ts, game/persistence.ts, or
 * game/heroProgress.ts directly -- they go through this interface instead, so the
 * meta layer stays untouched this phase and future additions (Hero Star/Fragment,
 * Signature Weapon) only need a new field here, not a Run Engine rewrite.
 */
import type { HeroId } from "../types";
import type { HeroDefinition, EquipmentLoadout } from "./types";
import { RUN_ENGINE_CONFIG } from "./config";

export interface HeroMetaSnapshot {
  heroId: HeroId;
  /** From the existing heroProgress.ts XP system. */
  level: number;
  /** Placeholder until the future Hero Star/Fragment system exists (always 1 today). */
  starRank: number;
  /** Placeholder until the future Signature Weapon system exists (always false today). */
  signatureWeaponUnlocked: boolean;
}

export interface MetaProgressionAdapter {
  getHeroSnapshot(heroId: HeroId): HeroMetaSnapshot;
  getEquipmentLoadout(): EquipmentLoadout;
}

/**
 * Applies the permanent Hero Level's stat bonus on top of a HeroDefinition's base
 * stats, producing the "entry" stats a Run actually starts a hero at. Pure function,
 * safe to unit test without touching the meta layer.
 */
export function applyLevelScaling(definition: HeroDefinition, snapshot: HeroMetaSnapshot): { baseAttack: number; baseHp: number } {
  const levelsAboveOne = Math.max(0, snapshot.level - 1);
  const { attackPctPerLevel, hpPctPerLevel } = RUN_ENGINE_CONFIG.heroLevelScaling;
  return {
    baseAttack: definition.baseAttack * (1 + levelsAboveOne * attackPctPerLevel),
    baseHp: definition.baseHp * (1 + levelsAboveOne * hpPctPerLevel),
  };
}
