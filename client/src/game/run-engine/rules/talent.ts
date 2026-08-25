/**
 * Talent rules (Phase 7), per 玩法核心.txt 三十、三十一.
 *
 * Talents level 1 -> 2 -> 3 (MAX), then drop out of future offers. This module
 * never decides what a Talent's effect actually DOES (that's an opaque effectId,
 * resolved the same way Hero Auto Skills are in rules/combat.ts) -- it only
 * manages level state and which 3 choices to offer.
 */
import type { RunTalentState, TalentDefinition } from "../types";
import type { HeroId } from "../../types";

export function getTalentLevel(talents: RunTalentState[], talentId: string): 0 | 1 | 2 | 3 {
  return talents.find((entry) => entry.talentId === talentId)?.level ?? 0;
}

export function isTalentMaxed(talents: RunTalentState[], talentId: string): boolean {
  return getTalentLevel(talents, talentId) === 3;
}

/** Levels up an owned Talent, or adds it at level 1 if new. No-ops if already MAX
 * -- callers should have excluded maxed Talents from the offered choices anyway,
 * this is a defensive second guard (十四/四十四 test-list style: never silently
 * do the wrong thing on bad input). */
export function applyTalentChoice(talents: RunTalentState[], talentId: string): RunTalentState[] {
  const existingIndex = talents.findIndex((entry) => entry.talentId === talentId);
  if (existingIndex === -1) return [...talents, { talentId, level: 1 }];
  const current = talents[existingIndex];
  if (current.level >= 3) return talents;
  const copy = [...talents];
  copy[existingIndex] = { ...current, level: (current.level + 1) as 1 | 2 | 3 };
  return copy;
}

export function getTalentEffectId(definition: TalentDefinition, level: 1 | 2 | 3): string {
  return definition.levels[level - 1].effectId;
}

function isRelatedToBuild(definition: TalentDefinition, buildHeroIds: HeroId[]): boolean {
  return !!definition.relatedHeroIds?.some((heroId) => buildHeroIds.includes(heroId));
}

function pickOne<T>(pool: T[], random: () => number): T | undefined {
  if (!pool.length) return undefined;
  return pool[Math.floor(random() * pool.length)];
}

/**
 * Builds a 3-choice offer following 三十's typical composition:
 *   A. An already-owned, not-yet-maxed Talent (upgrade path).
 *   B. A new Talent related to the current build (同 Build 新 Talent).
 *   C. A new Talent NOT related to the current build (不同方向新 Talent).
 * Falls back to any remaining unused candidate if a category is empty, so this
 * always returns up to 3 choices even with a very small pool (down to 0 if the
 * whole pool is exhausted/maxed).
 */
export function generateTalentChoices(pool: TalentDefinition[], currentTalents: RunTalentState[], selectedHeroes: HeroId[], leaderId: HeroId, random: () => number = Math.random): TalentDefinition[] {
  const buildHeroIds = [...selectedHeroes, leaderId];
  const available = pool.filter((definition) => !isTalentMaxed(currentTalents, definition.id));
  const owned = available.filter((definition) => getTalentLevel(currentTalents, definition.id) > 0);
  const notOwned = available.filter((definition) => getTalentLevel(currentTalents, definition.id) === 0);
  const related = notOwned.filter((definition) => isRelatedToBuild(definition, buildHeroIds));
  const unrelated = notOwned.filter((definition) => !isRelatedToBuild(definition, buildHeroIds));

  const chosen: TalentDefinition[] = [];
  const remainingPools = [owned, related, unrelated];
  remainingPools.forEach((categoryPool) => {
    if (chosen.length >= 3) return;
    const candidates = categoryPool.filter((definition) => !chosen.includes(definition));
    const pick = pickOne(candidates, random);
    if (pick) chosen.push(pick);
  });
  // Backfill from whatever's left if any category came up empty.
  while (chosen.length < 3) {
    const candidates = available.filter((definition) => !chosen.includes(definition));
    const pick = pickOne(candidates, random);
    if (!pick) break;
    chosen.push(pick);
  }
  return chosen;
}
