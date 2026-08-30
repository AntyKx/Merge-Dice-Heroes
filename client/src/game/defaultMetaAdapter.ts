/**
 * Concrete MetaProgressionAdapter wired to the existing lobby/meta systems.
 *
 * This file is the ONE place allowed to import both the meta layer (config.ts,
 * heroProgress.ts, types.ts PlayerProgress) and the Run Engine's adapter interface
 * (run-engine/metaAdapter.ts). run-engine/** itself never imports from here or from
 * store.ts/persistence.ts -- see run-engine/metaAdapter.ts for why.
 */
import { EQUIPMENT, getEquipmentBonuses, HEROES, mergeEquipmentBonuses } from "./config";
import { getHeroProgress } from "./heroProgress";
import { HERO_DEFINITIONS } from "./run-engine/heroes";
import type { MetaProgressionAdapter, HeroMetaSnapshot } from "./run-engine/metaAdapter";
import type { EquipmentLoadout } from "./run-engine/types";
import type { EquipmentId, HeroId, PlayerProgress } from "./types";

/** Role-leaning items' bonus grows a further +10%/level of upgrade (a blanket
 * escalation, not a per-stat upgrade table like ordinary equipment -- there
 * are only 10 of these and each already carries two hand-authored value sets
 * (bonus + fallback), a third (upgradeBonus) per item would be a lot of
 * near-duplicate data for a small return). */
function roleBonusScaleForLevel(level: number): number {
  return 1 + 0.1 * (level - 1);
}

export function createDefaultMetaAdapter(progress: PlayerProgress): MetaProgressionAdapter {
  return {
    getHeroSnapshot(heroId: HeroId): HeroMetaSnapshot {
      // HEROES[heroId] existing means the hero is a valid selectable hero; XP is
      // read from the existing heroProgress.ts system untouched.
      void HEROES[heroId];
      const { level } = getHeroProgress(progress.heroProgress[heroId]);
      // Signature Weapon acquisition (fragments/exchange/events) doesn't exist
      // yet -- ships unlocked for everyone so 素材/軍需官密卷's 英雄專武能力 are
      // actually observable in play instead of registered-but-inert data.
      // Swap to a real unlock check once that economy exists; nothing else
      // needs to change when it does (see signatureWeapons.ts's doc comment).
      return { heroId, level, starRank: 1, signatureWeaponUnlocked: true };
    },
    getEquipmentLoadout(selectedHeroes: HeroId[]): EquipmentLoadout {
      let bonuses = getEquipmentBonuses(progress.equipped, progress.equipmentLevels);
      const teamRoles = new Set(selectedHeroes.map((heroId) => HERO_DEFINITIONS[heroId]?.role).filter((role) => role !== undefined));
      (Object.values(progress.equipped) as Array<EquipmentId | undefined>).forEach((id) => {
        if (!id) return;
        const item = EQUIPMENT[id];
        if (!item.roleBonus) return;
        const level = Math.max(1, progress.equipmentLevels[id] ?? 1);
        const matched = teamRoles.has(item.roleBonus.role);
        const partial = matched ? item.roleBonus.bonus : item.roleBonus.fallback;
        bonuses = mergeEquipmentBonuses(bonuses, partial, roleBonusScaleForLevel(level));
      });
      return bonuses;
    },
  };
}
