import { describe, expect, it } from "vitest";
import { getRunModifiers } from "./combat";
import { advanceCombat } from "./combat";
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

  it("scales equipped bonuses with the equipment level", () => {
    const bonuses = getRunModifiers(createRun(["knight", "fireMage", "ranger"], "knight", () => 0.5, { attackMultiplier: 0.13, castleBonus: 0, extraRerolls: 0 }));
    expect(bonuses.attackMultiplier).toBeCloseTo(1.13);
  });

  it("applies a dungeon’s dedicated movement rule to spawned enemies", () => {
    const base = createDungeonRun(["knight", "fireMage", "ranger"], "knight", "ruinCorridor", { attackMultiplier: 0, castleBonus: 0, extraRerolls: 0 }, () => 0.5);
    const run = { ...base, phase: "COMBAT" as const, combat: { ...base.combat, spawnCooldown: 0 } };
    const advanced = advanceCombat(run, 0.1, () => 0.5);
    expect(advanced.combat.enemies[0].dungeonSpeedMultiplier).toBe(1.3);
  });
});
