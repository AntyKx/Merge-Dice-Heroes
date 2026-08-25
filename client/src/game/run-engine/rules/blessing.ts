/**
 * Blessing rules (Phase 7), per 玩法核心.txt 三十二、Core Blessing.
 *
 * Unlike Talents, a Blessing is a single pick with no levels -- "拿到即完整"
 * (complete the instant it's taken). Once owned it's dropped from future offers
 * (re-offering something that can't be picked again or upgraded wouldn't mean
 * anything).
 */
import type { BlessingDefinition } from "../types";
import type { HeroId } from "../../types";

export function hasBlessing(ownedBlessingIds: string[], blessingId: string): boolean {
  return ownedBlessingIds.includes(blessingId);
}

export function applyBlessingChoice(ownedBlessingIds: string[], blessingId: string): string[] {
  if (hasBlessing(ownedBlessingIds, blessingId)) return ownedBlessingIds;
  return [...ownedBlessingIds, blessingId];
}

function isRelatedToBuild(definition: BlessingDefinition, buildHeroIds: HeroId[]): boolean {
  return !!definition.relatedHeroIds?.some((heroId) => buildHeroIds.includes(heroId));
}

function pickMany<T>(pool: T[], count: number, random: () => number): T[] {
  const remaining = [...pool];
  const picked: T[] = [];
  while (picked.length < count && remaining.length) {
    const index = Math.floor(random() * remaining.length);
    picked.push(remaining.splice(index, 1)[0]);
  }
  return picked;
}

/** Offers up to 3 Blessings, trying to guarantee at least one relates to the
 * current build (三十二: "至少一個最好與目前 Build 有高度關聯") when such a
 * candidate exists, filling the rest randomly from whatever's left. */
export function generateBlessingChoices(pool: BlessingDefinition[], ownedBlessingIds: string[], selectedHeroes: HeroId[], leaderId: HeroId, random: () => number = Math.random): BlessingDefinition[] {
  const buildHeroIds = [...selectedHeroes, leaderId];
  const available = pool.filter((definition) => !hasBlessing(ownedBlessingIds, definition.id));
  const related = available.filter((definition) => isRelatedToBuild(definition, buildHeroIds));

  const chosen: BlessingDefinition[] = [];
  if (related.length) chosen.push(...pickMany(related, 1, random));
  const rest = available.filter((definition) => !chosen.includes(definition));
  chosen.push(...pickMany(rest, 3 - chosen.length, random));
  return chosen;
}
