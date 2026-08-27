import { describe, expect, it } from "vitest";
import type { MetaProgressionAdapter } from "./metaAdapter";
import { acknowledgeWavePreview, chooseComboEffect, chooseSummonHero, confirmFate, createRun } from "./orchestrator";
import { isBurstReadyToFire } from "./rules/leader";
import type { DiceComboKind, RunState } from "./types";

const adapter: MetaProgressionAdapter = {
  getHeroSnapshot: (heroId) => ({ heroId, level: 1, starRank: 1, signatureWeaponUnlocked: false }),
  getEquipmentLoadout: () => ({ attackMultiplier: 0, castleBonus: 0, extraRerolls: 0 }),
};

const fixedRandom = () => 0.4;

function resolveHand(values: [number, number, number, number, number]): RunState {
  let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter });
  run = acknowledgeWavePreview(run, fixedRandom);
  run = { ...run, dice: { ...run.dice, values } };
  return confirmFate(run);
}

function choose(values: [number, number, number, number, number], kind: DiceComboKind): RunState {
  return chooseComboEffect(resolveHand(values), kind, adapter, fixedRandom);
}

describe("all dice combo effects through the Run Engine", () => {
  it("NONE grants Fate Energy", () => {
    const run = choose([1, 2, 3, 5, 6], "NONE");
    expect(run.phase).toBe("PREPARATION");
    expect(run.fateEnergy.current).toBe(1);
  });

  it("PAIR summons one random hero", () => {
    const run = choose([1, 1, 3, 4, 6], "PAIR");
    expect(Object.keys(run.board.cells)).toHaveLength(1);
  });

  it("TWO_PAIR summons two random heroes", () => {
    const run = choose([1, 1, 3, 3, 6], "TWO_PAIR");
    expect(Object.keys(run.board.cells)).toHaveLength(2);
  });

  it("THREE_KIND opens chosen-summon and resolves the selected hero", () => {
    let run = choose([2, 2, 2, 4, 6], "THREE_KIND");
    expect(run.pendingHeroChoice).toBe(true);
    run = chooseSummonHero(run, "ranger", adapter);
    expect(run.pendingHeroChoice).toBe(false);
    expect(Object.keys(run.board.cells)).toHaveLength(1);
  });

  it("SMALL_STRAIGHT applies the attack-speed combat buff", () => {
    const run = choose([1, 2, 3, 4, 6], "SMALL_STRAIGHT");
    expect(run.waveCombatBuff).toEqual({ attackSpeedMultiplier: 1.15, damageMultiplier: 1 });
  });

  it("LARGE_STRAIGHT applies both attack-speed and damage buffs", () => {
    const run = choose([2, 3, 4, 5, 6], "LARGE_STRAIGHT");
    expect(run.waveCombatBuff).toEqual({ attackSpeedMultiplier: 1.2, damageMultiplier: 1.1 });
  });

  it("FULL_HOUSE enables exactly one two-hero free merge", () => {
    const run = choose([2, 2, 2, 5, 5], "FULL_HOUSE");
    expect(run.pendingFreeMerge).toBe(true);
    expect(run.message).toContain("2 名");
  });

  it("FOUR_KIND marks the leader burst as ready", () => {
    const run = choose([4, 4, 4, 4, 2], "FOUR_KIND");
    expect(isBurstReadyToFire(run.leader)).toBe(true);
  });

  it("FIVE_KIND enables direct tier-up and marks leader burst as ready", () => {
    const run = choose([6, 6, 6, 6, 6], "FIVE_KIND");
    expect(run.pendingJackpotTierUp).toBe(true);
    expect(isBurstReadyToFire(run.leader)).toBe(true);
  });
});
