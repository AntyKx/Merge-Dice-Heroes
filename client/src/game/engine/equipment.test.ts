import { describe, expect, it } from "vitest";
import { getRunModifiers } from "./combat";
import { createDungeonRun, createRun } from "./run";

describe("equipment-backed runs", () => {
  it("applies the equipped reroll, castle, and attack bonuses at run creation", () => {
    const run = createRun(["knight", "fireMage", "ranger"], "knight", () => 0.5, { attackMultiplier: 0.08, castleBonus: 3, extraRerolls: 1 });
    expect(run.dice.maxRerolls).toBe(3);
    expect(run.combat.castleMaxHp).toBe(23);
    expect(getRunModifiers(run).attackMultiplier).toBeCloseTo(1.08);
  });

  it("keeps a default run free of equipment bonuses", () => {
    const run = createRun(["knight", "fireMage", "ranger"], "knight", () => 0.5);
    expect(run.dice.maxRerolls).toBe(2);
    expect(run.combat.castleMaxHp).toBe(20);
    expect(getRunModifiers(run).attackMultiplier).toBe(1);
  });

  it("creates a stamina-selected dungeon run at the configured stage", () => {
    const run = createDungeonRun(["knight", "fireMage", "ranger"], "knight", "ruinCorridor", { attackMultiplier: 0, castleBonus: 3, extraRerolls: 0 }, () => 0.5);
    expect(run.dungeonId).toBe("ruinCorridor");
    expect(run.wave).toBe(3);
    expect(run.combat.castleMaxHp).toBe(23);
  });
});
