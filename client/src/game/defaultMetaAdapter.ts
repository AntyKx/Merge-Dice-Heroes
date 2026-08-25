/**
 * Concrete MetaProgressionAdapter wired to the existing lobby/meta systems.
 *
 * This file is the ONE place allowed to import both the meta layer (config.ts,
 * heroProgress.ts, types.ts PlayerProgress) and the Run Engine's adapter interface
 * (run-engine/metaAdapter.ts). run-engine/** itself never imports from here or from
 * store.ts/persistence.ts -- see run-engine/metaAdapter.ts for why.
 */
import { getEquipmentBonuses, HEROES } from "./config";
import { getHeroProgress } from "./heroProgress";
import type { MetaProgressionAdapter, HeroMetaSnapshot } from "./run-engine/metaAdapter";
import type { EquipmentLoadout } from "./run-engine/types";
import type { HeroId, PlayerProgress } from "./types";

export function createDefaultMetaAdapter(progress: PlayerProgress): MetaProgressionAdapter {
  return {
    getHeroSnapshot(heroId: HeroId): HeroMetaSnapshot {
      // HEROES[heroId] existing means the hero is a valid selectable hero; XP is
      // read from the existing heroProgress.ts system untouched.
      void HEROES[heroId];
      const { level } = getHeroProgress(progress.heroProgress[heroId]);
      return { heroId, level, starRank: 1, signatureWeaponUnlocked: false };
    },
    getEquipmentLoadout(): EquipmentLoadout {
      const bonuses = getEquipmentBonuses(progress.equipped, progress.equipmentLevels);
      return { attackMultiplier: bonuses.attackMultiplier, castleBonus: bonuses.castleBonus, extraRerolls: bonuses.extraRerolls };
    },
  };
}
