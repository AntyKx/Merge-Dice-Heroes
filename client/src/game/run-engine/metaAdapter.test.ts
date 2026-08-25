import { describe, expect, it } from "vitest";
import type { HeroDefinition } from "./types";
import { applyLevelScaling } from "./metaAdapter";

const definition: Partial<HeroDefinition> = { baseAttack: 10, baseHp: 100 };

describe("applyLevelScaling", () => {
  it("Level 1 不加成", () => {
    const result = applyLevelScaling(definition as HeroDefinition, { heroId: "knight", level: 1, starRank: 1, signatureWeaponUnlocked: false });
    expect(result).toEqual({ baseAttack: 10, baseHp: 100 });
  });

  it("每級加成依 Config 百分比疊加", () => {
    const result = applyLevelScaling(definition as HeroDefinition, { heroId: "knight", level: 6, starRank: 1, signatureWeaponUnlocked: false });
    // levelsAboveOne = 5, 2% per level -> +10%
    expect(result.baseAttack).toBeCloseTo(11);
    expect(result.baseHp).toBeCloseTo(110);
  });
});
