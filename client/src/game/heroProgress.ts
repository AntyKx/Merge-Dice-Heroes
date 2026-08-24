import type { HeroId, HeroProgress } from "./types";

export const HERO_XP_PER_VICTORY = 36;

export function heroXpRequirement(level: number) {
  return 100 + Math.max(0, level - 1) * 35;
}

export function getHeroProgress(progress?: HeroProgress): HeroProgress {
  return { level: Math.max(1, progress?.level ?? 1), experience: Math.max(0, progress?.experience ?? 0) };
}

export function awardHeroExperience(progress: Partial<Record<HeroId, HeroProgress>>, heroIds: HeroId[], experience: number = HERO_XP_PER_VICTORY) {
  const next = { ...progress };
  heroIds.forEach((heroId) => {
    const current = getHeroProgress(next[heroId]);
    let level = current.level;
    let remainingExperience = current.experience + experience;
    while (remainingExperience >= heroXpRequirement(level)) {
      remainingExperience -= heroXpRequirement(level);
      level += 1;
    }
    next[heroId] = { level, experience: remainingExperience };
  });
  return next;
}
