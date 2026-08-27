import { describe, expect, it } from "vitest";
import type { MetaProgressionAdapter } from "./metaAdapter";
import {
  acknowledgeWavePreview,
  advanceCombat,
  advanceToNextWave,
  chooseComboEffect,
  chooseSummonHero,
  chooseTalentReward,
  confirmFate,
  confirmFormation,
  createRun,
  mergeSelection,
  repositionHero,
  spendEnergyForRandomSummon,
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
    expect(run.talentChoices.length).toBeGreaterThan(0);
    expect(run.talentChoices.length).toBeLessThanOrEqual(3);

    run = chooseTalentReward(run, run.talentChoices[0].id);
    expect(run.talents).toHaveLength(1);
    expect(run.talentChoices).toHaveLength(0);

    run = advanceToNextWave(run);
    expect(run.phase).toBe("WAVE_PREVIEW");
    expect(run.wave).toBe(2);
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
});
