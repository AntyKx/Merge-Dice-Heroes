import { describe, expect, it } from "vitest";
import { RELIC_DICE_EFFECT_EXAMPLES, resolveDiceRelicEffects } from "./relic";

describe("resolveDiceRelicEffects", () => {
  it("符合條件的骰子重新解讀規則會加成，未知 effectId 靜默忽略", () => {
    const context = { finalValues: [6, 6, 6, 6, 6], rerollsUsed: 1, maxRerolls: 2 };
    const result = resolveDiceRelicEffects(RELIC_DICE_EFFECT_EXAMPLES, ["example.allSixes", "does-not-exist"], context);
    expect(result.damageMultiplierBonus).toBeCloseTo(0.2);
    expect(result.fateEnergyBonus).toBe(0);
  });

  it("多個 effectId 的加成會疊加", () => {
    const context = { finalValues: [6, 6, 6, 6, 6], rerollsUsed: 2, maxRerolls: 2 };
    const result = resolveDiceRelicEffects(RELIC_DICE_EFFECT_EXAMPLES, ["example.allSixes", "example.usedAllRerolls"], context);
    expect(result.damageMultiplierBonus).toBeCloseTo(0.2);
    expect(result.extraRewardMultiplier).toBeCloseTo(0.1);
  });

  it("四顆偶數的規則只在條件成立時給予 Fate Energy", () => {
    const matches = resolveDiceRelicEffects(RELIC_DICE_EFFECT_EXAMPLES, ["example.fourEvens"], { finalValues: [2, 4, 6, 6, 1], rerollsUsed: 0, maxRerolls: 2 });
    expect(matches.fateEnergyBonus).toBe(1);
    const noMatch = resolveDiceRelicEffects(RELIC_DICE_EFFECT_EXAMPLES, ["example.fourEvens"], { finalValues: [2, 4, 1, 1, 1], rerollsUsed: 0, maxRerolls: 2 });
    expect(noMatch.fateEnergyBonus).toBe(0);
  });
});
