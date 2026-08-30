import { describe, expect, it } from "vitest";
import { RUN_ENGINE_CONFIG } from "./config";
import type { MetaProgressionAdapter } from "./metaAdapter";
import {
  acknowledgeWavePreview,
  advanceCombat,
  advanceToNextWave,
  buyExtraReposition,
  chooseComboEffect,
  chooseSummonHero,
  chooseTalentReward,
  confirmFate,
  confirmFormation,
  createRun,
  mergeSelection,
  repositionHero,
  resolveWaveEnd,
  rerollDice,
  spendEnergyForChosenSummon,
  spendEnergyForRandomSummon,
  toggleDiceLock,
} from "./orchestrator";

/** Fixed-face fake random -- randomDie(() => 0.4) always rolls a 3, so every Dice
 * Decision in these tests deterministically lands on FIVE_KIND/FOUR_KIND/
 * THREE_KIND/PAIR/NONE (five identical dice), never anything reroll-order-
 * dependent. Combat itself only calls `random` from resolver/registry code paths
 * these tests don't exercise (no multi-target-tiebreak Hero Auto Skill triggers
 * within the tick budget below), so a constant is fine there too. */
const fixedRandom = () => 0.4;

const fakeAdapter: MetaProgressionAdapter = {
  getHeroSnapshot: (heroId) => ({ heroId, level: 1, starRank: 1, signatureWeaponUnlocked: false }),
  getEquipmentLoadout: () => ({ attackMultiplier: 0, castleBonus: 0, extraRerolls: 0 }),
};

/** Drives Dice -> Preparation and places a single hero at board zone 2 (Wave 1's
 * only activeRoute, per waves.ts) so its coverage actually reaches the spawned
 * enemies -- the default first-empty-cell auto-placement lands at zone 1. */
function setupRunWithHeroAtZone2(heroId: "ranger" = "ranger") {
  let run = createRun({ selectedHeroes: [heroId], leaderHeroId: heroId, adapter: fakeAdapter });
  run = acknowledgeWavePreview(run, fixedRandom);
  run = confirmFate(run);
  run = chooseComboEffect(run, "THREE_KIND", fakeAdapter, fixedRandom);
  run = chooseSummonHero(run, heroId, fakeAdapter);
  run = repositionHero(run, "1-front", "2-front");
  return confirmFormation(run);
}

function runCombatUntil(run: ReturnType<typeof setupRunWithHeroAtZone2>, predicate: (r: typeof run) => boolean, maxTicks = 600, delta = 0.1) {
  let current = run;
  for (let tick = 0; tick < maxTicks && !predicate(current); tick += 1) {
    current = advanceCombat(current, delta, fixedRandom);
  }
  return current;
}

describe("orchestrator end-to-end Wave lifecycle", () => {
  it("每局首個 Preparation 可免費隨機召喚一次，之後才消耗命運能量", () => {
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    run = confirmFate(run);
    run = chooseComboEffect(run, "NONE", fakeAdapter, fixedRandom);

    expect(run.initialFreeRandomSummonAvailable).toBe(true);
    expect(run.fateEnergy.current).toBe(1);

    run = spendEnergyForRandomSummon(run, fakeAdapter, fixedRandom);

    expect(run.initialFreeRandomSummonAvailable).toBe(false);
    expect(run.fateEnergy.current).toBe(1);
    expect(Object.keys(run.board.cells)).toHaveLength(1);
  });

  it("一般三名同英雄同階可合成，並保留目標格作為升階英雄位置", () => {
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    run = confirmFate(run);
    run = chooseComboEffect(run, "THREE_KIND", fakeAdapter, fixedRandom);
    run = chooseSummonHero(run, "ranger", fakeAdapter);
    const first = run.board.cells["1-front"]!;
    run = { ...run, board: { cells: { ...run.board.cells, "2-front": { ...first, instanceId: "ranger-regression-second" }, "3-front": { ...first, instanceId: "ranger-regression-third" } } } };

    run = mergeSelection(run, ["1-front", "2-front", "3-front"], "2-front");

    expect(run.board.cells["2-front"]?.tier).toBe(2);
    expect(run.board.cells["1-front"]).toBeUndefined();
    expect(run.board.cells["3-front"]).toBeUndefined();
  });

  it("葫蘆的兩名免費同英雄同階合成可完成並消耗免費合成狀態", () => {
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    run = confirmFate(run);
    run = chooseComboEffect(run, "THREE_KIND", fakeAdapter, fixedRandom);
    run = chooseSummonHero(run, "ranger", fakeAdapter);
    const first = run.board.cells["1-front"]!;
    run = { ...run, board: { cells: { ...run.board.cells, "2-front": { ...first, instanceId: "ranger-regression-free-second" } } }, pendingFreeMerge: true };

    run = mergeSelection(run, ["1-front", "2-front"], "1-front");

    expect(run.board.cells["1-front"]?.tier).toBe(2);
    expect(run.board.cells["2-front"]).toBeUndefined();
    expect(run.pendingFreeMerge).toBe(false);
  });

  it("Ranger 在棋盤上可獨自清光 Wave 1 並進入 Reward，城堡不受損", () => {
    let run = setupRunWithHeroAtZone2("ranger");
    expect(run.phase).toBe("COMBAT_RUNNING");
    expect(run.waveRuntime?.routes.some((route) => route.routeId === 2 && route.active)).toBe(true);

    run = runCombatUntil(run, (r) => r.phase !== "COMBAT_RUNNING");

    expect(run.phase).toBe("REWARD_RESOLVE");
    expect(run.castle.hp).toBe(run.castle.maxHp);
    // Talent/Blessing offers only land on their configured Wave intervals (every
    // 2nd Wave for Talent, every 5th for Blessing per RUN_ENGINE_CONFIG) -- Wave 1
    // clears with no reward offer, so advanceToNextWave should proceed immediately.
    expect(run.talentChoices).toHaveLength(0);
    expect(run.blessingChoices).toHaveLength(0);

    run = advanceToNextWave(run);
    expect(run.phase).toBe("WAVE_PREVIEW");
    expect(run.wave).toBe(2);
  });

  it("波次結束時重置英雄的技能攻擊計數與冷卻，不帶到下一波", () => {
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    run = confirmFate(run);
    run = chooseComboEffect(run, "THREE_KIND", fakeAdapter, fixedRandom);
    run = chooseSummonHero(run, "ranger", fakeAdapter);
    const hero = run.board.cells["1-front"]!;
    const midCycleHero = { ...hero, skill: { ...hero.skill, attackCountSinceWaveStart: 3, cooldownRemainingSeconds: 0.4 }, attackCooldownRemainingSeconds: 0.7 };
    run = { ...run, phase: "COMBAT_END", board: { cells: { "1-front": midCycleHero } } };

    run = resolveWaveEnd(run);

    const recovered = run.board.cells["1-front"]!;
    expect(recovered.skill.attackCountSinceWaveStart).toBe(0);
    expect(recovered.skill.cooldownRemainingSeconds).not.toBe(0.4);
    expect(recovered.attackCooldownRemainingSeconds).toBe(0);
  });

  it("天賦每 2 波、核心祝福每 5 波才提供三選一", () => {
    const base = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    const atWave = (wave: number) => resolveWaveEnd({ ...base, phase: "COMBAT_END", wave });

    expect(atWave(1).talentChoices).toHaveLength(0);
    expect(atWave(1).blessingChoices).toHaveLength(0);
    expect(atWave(3).talentChoices).toHaveLength(0);

    const wave2 = atWave(2);
    expect(wave2.talentChoices.length).toBeGreaterThan(0);
    expect(wave2.blessingChoices).toHaveLength(0);
    const afterPick = chooseTalentReward(wave2, wave2.talentChoices[0].id);
    expect(afterPick.talents).toHaveLength(1);

    expect(atWave(5).blessingChoices.length).toBeGreaterThan(0);
  });

  it("待命區已滿時，召喚被擋下但不會扣命運能量或消耗免費召喚", () => {
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    run = confirmFate(run);
    run = chooseComboEffect(run, "THREE_KIND", fakeAdapter, fixedRandom);
    run = chooseSummonHero(run, "ranger", fakeAdapter);
    const filler = run.board.cells["1-front"]!;

    // Fill all 16 board cells and both Pending slots so the next summon must block.
    const cells: typeof run.board.cells = {};
    const zones = ["front", "midFront", "midBack", "back"] as const;
    let n = 0;
    for (let col = 1; col <= 4; col += 1) for (const zone of zones) { n += 1; cells[`${col}-${zone}` as keyof typeof cells] = { ...filler, instanceId: `filler-${n}` }; }
    run = { ...run, board: { cells }, pending: { heroes: [{ ...filler, instanceId: "pending-1" }, { ...filler, instanceId: "pending-2" }] }, fateEnergy: { ...run.fateEnergy, current: 10 } };

    const energyBefore = run.fateEnergy.current;
    run = spendEnergyForRandomSummon(run, fakeAdapter, fixedRandom);
    expect(run.fateEnergy.current).toBe(energyBefore);
    expect(run.pending.heroes).toHaveLength(2);

    run = spendEnergyForChosenSummon(run, "ranger", fakeAdapter);
    expect(run.fateEnergy.current).toBe(energyBefore);
    expect(run.pending.heroes).toHaveLength(2);

    // The free first-summon flag must also survive being blocked, not get burned.
    run = { ...run, initialFreeRandomSummonAvailable: true };
    run = spendEnergyForRandomSummon(run, fakeAdapter, fixedRandom);
    expect(run.initialFreeRandomSummonAvailable).toBe(true);
  });

  it("三條指定召喚在待命區已滿時暫停，不會清空 pendingHeroChoice", () => {
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    run = confirmFate(run);
    run = chooseComboEffect(run, "THREE_KIND", fakeAdapter, fixedRandom);
    // Board is still empty here (chooseSummonHero not yet called) -- fabricate a
    // full board + full Pending using a hero instance from a throwaway run.
    let seed = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    seed = acknowledgeWavePreview(seed, fixedRandom);
    seed = confirmFate(seed);
    seed = chooseComboEffect(seed, "THREE_KIND", fakeAdapter, fixedRandom);
    seed = chooseSummonHero(seed, "ranger", fakeAdapter);
    const template = seed.board.cells["1-front"]!;

    const cells: typeof run.board.cells = {};
    const zones = ["front", "midFront", "midBack", "back"] as const;
    let n = 0;
    for (let col = 1; col <= 4; col += 1) for (const zone of zones) { n += 1; cells[`${col}-${zone}` as keyof typeof cells] = { ...template, instanceId: `filler-${n}` }; }
    run = { ...run, board: { cells }, pending: { heroes: [{ ...template, instanceId: "pending-1" }, { ...template, instanceId: "pending-2" }] } };

    expect(run.pendingHeroChoice).toBe(true);
    run = chooseSummonHero(run, "ranger", fakeAdapter);
    expect(run.pendingHeroChoice).toBe(true);
    expect(run.pending.heroes).toHaveLength(2);
  });

  it("+1 調度每波最多只能購買一次", () => {
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    run = confirmFate(run);
    run = chooseComboEffect(run, "NONE", fakeAdapter, fixedRandom);
    run = { ...run, fateEnergy: { ...run.fateEnergy, current: 10 } };

    const allowanceBefore = run.reposition.baseAllowance;
    run = buyExtraReposition(run);
    expect(run.reposition.baseAllowance).toBe(allowanceBefore + 1);
    expect(run.reposition.extraPurchasesThisWave).toBe(1);
    expect(run.fateEnergy.current).toBe(10 - RUN_ENGINE_CONFIG.fateEnergy.extraRepositionCost);

    const energyAfterFirstBuy = run.fateEnergy.current;
    run = buyExtraReposition(run);
    expect(run.reposition.baseAllowance).toBe(allowanceBefore + 1);
    expect(run.reposition.extraPurchasesThisWave).toBe(1);
    expect(run.fateEnergy.current).toBe(energyAfterFirstBuy);
  });

  it("棋盤上沒有英雄時，敵人會抵達城堡造成傷害，且整波仍會正常結束", () => {
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    run = confirmFate(run);
    // NONE is always eligible (every hand qualifies) and only grants Fate Energy --
    // no summon happens, so the board stays empty on purpose for this test.
    run = chooseComboEffect(run, "NONE", fakeAdapter, fixedRandom);
    run = confirmFormation(run);
    expect(run.phase).toBe("COMBAT_RUNNING");

    run = runCombatUntil(run, (r) => r.phase !== "COMBAT_RUNNING");

    expect(run.phase).toBe("REWARD_RESOLVE");
    expect(run.castle.hp).toBeLessThan(run.castle.maxHp);
  });

  it("重骰只影響玩家點選（取消 locked）的骰子，其餘維持原值；未選取任何骰子時重骰為無效操作", () => {
    const sixRandom = () => 0.99; // randomDie(0.99) = 6, distinct from fixedRandom's 3
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    expect(run.dice.values).toEqual([3, 3, 3, 3, 3]);
    // Nothing selected by default -- every die starts "kept" (locked === true).
    expect(run.dice.locked).toEqual([true, true, true, true, true]);

    const rerollsBefore = run.dice.rerollsLeft;
    const noopReroll = rerollDice(run, sixRandom);
    expect(noopReroll.dice.values).toEqual([3, 3, 3, 3, 3]);
    expect(noopReroll.dice.rerollsLeft).toBe(rerollsBefore);

    run = toggleDiceLock(run, 2);
    expect(run.dice.locked).toEqual([true, true, false, true, true]);

    run = rerollDice(run, sixRandom);
    expect(run.dice.values).toEqual([3, 3, 6, 3, 3]);
    expect(run.dice.rerollsLeft).toBe(rerollsBefore - 1);
    // Selection resets to "nothing selected" after the reroll resolves.
    expect(run.dice.locked).toEqual([true, true, true, true, true]);
  });
});
