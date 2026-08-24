import { describe, expect, it } from "vitest";
import { awardHeroExperience, getHeroProgress, heroXpRequirement } from "./heroProgress";

describe("hero progression", () => {
  it("starts heroes at level one with empty experience", () => {
    expect(getHeroProgress()).toEqual({ level: 1, experience: 0 });
  });

  it("carries experience across a level and only rewards the active team", () => {
    const progress = awardHeroExperience({ knight: { level: 1, experience: 82 } }, ["knight", "ranger"], 36);
    expect(progress.knight).toEqual({ level: 2, experience: 18 });
    expect(progress.ranger).toEqual({ level: 1, experience: 36 });
    expect(progress.fireMage).toBeUndefined();
    expect(heroXpRequirement(2)).toBe(135);
  });
});
