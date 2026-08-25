import { describe, expect, it } from "vitest";
import { grantControlImmunity, hasControlImmunity, removeExpiredStatusEffects, totalMagnitudeCapped, upsertStatusEffect } from "./status";

describe("upsertStatusEffect", () => {
  it("同 id 同 source 取代而非疊加", () => {
    const buffs = upsertStatusEffect([{ id: "slow", source: "frostQueen-1", magnitude: 0.2 }], { id: "slow", source: "frostQueen-1", magnitude: 0.35 });
    expect(buffs).toHaveLength(1);
    expect(buffs[0].magnitude).toBe(0.35);
  });

  it("不同 source 各自保留，可疊加", () => {
    const buffs = upsertStatusEffect([{ id: "slow", source: "frostQueen-1", magnitude: 0.2 }], { id: "slow", source: "frostQueen-2", magnitude: 0.2 });
    expect(buffs).toHaveLength(2);
  });
});

describe("removeExpiredStatusEffects", () => {
  it("移除已過期的效果，永久效果（無 expiresAtMs）保留", () => {
    const buffs = removeExpiredStatusEffects([
      { id: "a", source: "x", magnitude: 1, expiresAtMs: 100 },
      { id: "b", source: "x", magnitude: 1, expiresAtMs: 500 },
      { id: "c", source: "x", magnitude: 1 },
    ], 200);
    expect(buffs.map((buff) => buff.id)).toEqual(["b", "c"]);
  });
});

describe("totalMagnitudeCapped", () => {
  it("不同來源加總但不超過 Cap", () => {
    const buffs = [
      { id: "shield", source: "knight-1", magnitude: 30 },
      { id: "shield", source: "knight-2", magnitude: 30 },
    ];
    expect(totalMagnitudeCapped(buffs, "shield", 50)).toBe(50);
  });
});

describe("control immunity", () => {
  it("免疫期間內不可再套用控場", () => {
    const state = grantControlImmunity({ immuneUntilMs: {} }, "boss-1", 1000);
    expect(hasControlImmunity(state, "boss-1", 500)).toBe(true);
    expect(hasControlImmunity(state, "boss-1", 1500)).toBe(false);
  });
});
