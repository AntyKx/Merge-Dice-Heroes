import { describe, expect, it } from "vitest";
import { RUN_ENGINE_CONFIG } from "./config";
import { ENEMY_DEFINITIONS } from "./enemies";
import { HERO_DEFINITIONS } from "./heroes";
import { resetSkillRuntime } from "./rules/skill";
import type { EnemyInstance, HeroInstance } from "./types";
import type { HeroId } from "../types";
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
  declineFreeMerge,
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

// Every field orchestrator.ts's equipment getters read must be a real 0, not
// undefined -- several are read unconditionally every combat tick (e.g.
// attackSpeedMultiplier), and `1 + undefined`/`undefined >= x` silently
// produce NaN/false, which then propagates through the whole Run (a hero
// whose attack cooldown goes NaN stops attacking forever).
const EMPTY_LOADOUT = {
  attackMultiplier: 0, castleBonus: 0, extraRerolls: 0, attackSpeedMultiplier: 0,
  critChance: 0, critDamageMultiplier: 0, bossDamageMultiplier: 0, hpMultiplier: 0,
  recoveryPctBonus: 0, shieldOnWaveStartPctCastleHp: 0, damageReductionPct: 0,
  tankBlockCapacityBonus: 0, repositionBonus: 0, fateEnergyMaxBonus: 0,
  summonCostReduction: 0, freeMergeChance: 0, comboUpgradeChance: 0,
  protectedDieCount: 0, chainLightningProcChance: 0,
};

const fakeAdapter: MetaProgressionAdapter = {
  getHeroSnapshot: (heroId) => ({ heroId, level: 1, starRank: 1, signatureWeaponUnlocked: false }),
  getEquipmentLoadout: () => ({ ...EMPTY_LOADOUT }),
};

function makeHero(instanceId: string, heroId: HeroId): HeroInstance {
  const definition = HERO_DEFINITIONS[heroId]!;
  return {
    instanceId, heroId, tier: 1, hp: definition.baseHp, maxHp: definition.baseHp, shield: 0, cell: null, status: "active", buffs: [],
    skill: resetSkillRuntime(instanceId, definition.autoSkill.trigger),
    attackCooldownRemainingSeconds: 0,
  };
}

/** Drives Dice -> Preparation and places a single hero at board zone 2 (Wave 1's
 * only activeRoute, per waves.ts) so its coverage actually reaches the spawned
 * enemies -- the default first-empty-cell auto-placement lands at zone 1. */
function setupRunWithHeroAtZone2(heroId: HeroId = "ranger") {
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

  it("葫蘆待用時若棋盤上找不到任何一對同英雄同階可合成，開戰按鈕會被卡住；declineFreeMerge 可放棄並解鎖開戰", () => {
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    run = confirmFate(run);
    // fixedRandom always rolls five-of-a-kind, so FULL_HOUSE is never actually
    // among this hand's eligible choices -- set the flag directly, exactly as
    // the "葫蘆的兩名免費..." test above does, to reach the same RunState a real
    // Full House roll would produce without needing a different dice fixture.
    run = chooseComboEffect(run, "NONE", fakeAdapter, fixedRandom);
    run = { ...run, pendingFreeMerge: true };
    expect(run.pendingFreeMerge).toBe(true);

    // Board is still empty (FULL_HOUSE only sets the flag, it never summons) --
    // there is no cell pair to merge, so nothing the player does on the board
    // can ever clear pendingFreeMerge here.
    const blocked = confirmFormation(run);
    expect(blocked.phase).toBe("PREPARATION");

    run = declineFreeMerge(run);
    expect(run.pendingFreeMerge).toBe(false);
    run = confirmFormation(run);
    expect(run.phase).toBe("COMBAT_RUNNING");
  });

  it("declineFreeMerge 在沒有待用免費合成時，以及不在 PREPARATION 階段時都是 no-op", () => {
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    run = confirmFate(run);
    run = chooseComboEffect(run, "NONE", fakeAdapter, fixedRandom);
    expect(run.pendingFreeMerge).toBe(false);
    expect(declineFreeMerge(run)).toBe(run);

    run = confirmFormation(run);
    expect(run.phase).toBe("COMBAT_RUNNING");
    expect(declineFreeMerge(run)).toBe(run);
  });

  it("Priest 現在也會用 Basic Attack 打怪（原本 auraOnly 完全不會鎖定敵人）", () => {
    const totalEnemyHp = (r: ReturnType<typeof setupRunWithHeroAtZone2>) => r.waveRuntime?.routes.flatMap((route) => route.enemies).reduce((sum, enemy) => sum + enemy.hp, 0) ?? 0;
    let run = setupRunWithHeroAtZone2("priest");
    expect(run.phase).toBe("COMBAT_RUNNING");

    // Wait for the first enemy to actually spawn before reading a baseline HP.
    run = runCombatUntil(run, (r) => totalEnemyHp(r) > 0, 300, 0.1);
    const initialEnemyHp = totalEnemyHp(run);
    expect(initialEnemyHp).toBeGreaterThan(0);

    run = runCombatUntil(run, (r) => totalEnemyHp(r) < initialEnemyHp, 300, 0.1);

    expect(totalEnemyHp(run)).toBeLessThan(initialEnemyHp);
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

  it("「ranged」標籤敵人一旦推進到交戰距離，會無視 Block 直接打到後排英雄——這正是原本「後排英雄永遠不會被任何怪物攻擊到」的缺口", () => {
    let run = createRun({ selectedHeroes: ["knight"], leaderHeroId: "knight", adapter: fakeAdapter });
    run = acknowledgeWavePreview(run, fixedRandom);
    run = confirmFate(run);
    // NONE keeps the board empty via the normal flow -- both heroes below are
    // hand-placed afterwards so this test controls their exact cells/hp directly.
    run = chooseComboEffect(run, "NONE", fakeAdapter, fixedRandom);
    run = confirmFormation(run);
    expect(run.phase).toBe("COMBAT_RUNNING");

    const tank = makeHero("tank-1", "knight");
    const mage = makeHero("mage-1", "fireMage");
    const archer: EnemyInstance = {
      instanceId: "archer-1",
      defId: "goblinArcher",
      hp: ENEMY_DEFINITIONS.goblinArcher.baseHp,
      maxHp: ENEMY_DEFINITIONS.goblinArcher.baseHp,
      occupiedRoutes: [2],
      pathProgress: 0.9, // past both Knight's ~0.75 Block-engage threshold and the 0.45 ranged threshold
      blockedBy: "tank-1", // already engaged with the tank -- proves the snipe fires independently of Block
      debuffs: [],
      attackCooldownRemainingSeconds: 999, // suppress this tick's Block counterattack so the test isolates the ranged snipe
      rangedAttackCooldownRemainingSeconds: 0,
    };
    run = {
      ...run,
      board: { cells: { "2-front": tank, "2-back": mage } },
      waveRuntime: {
        ...run.waveRuntime!,
        spawnedCount: run.waveRuntime!.spawnQueue.length, // no more natural Wave 1 spawns this tick
        routes: run.waveRuntime!.routes.map((route) => (route.routeId === 2 ? { ...route, enemies: [archer] } : { ...route, enemies: [] })),
      },
    };

    const tankHpBefore = run.board.cells["2-front"]!.hp;
    const mageHpBefore = run.board.cells["2-back"]!.hp;
    run = advanceCombat(run, 0.1, fixedRandom);

    // Block itself still holds (the tank keeps fighting it) -- but the mage in
    // the same DefenseZone's back row also takes damage this same tick, which
    // was impossible before this fix (only the blockedBy hero could ever be hit).
    const archerAfter = run.waveRuntime?.routes.find((route) => route.routeId === 2)?.enemies.find((enemy) => enemy.instanceId === "archer-1");
    expect(archerAfter?.blockedBy).toBe("tank-1");
    expect(run.board.cells["2-front"]!.hp).toBe(tankHpBefore);
    expect(run.board.cells["2-back"]!.hp).toBe(mageHpBefore - ENEMY_DEFINITIONS.goblinArcher.baseAttack);
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

  it("命運雙子骰 (protectedDieCount)：首次擲骰後保護的骰子索引無法被選取重骰，其餘骰子不受影響", () => {
    const gearedAdapter: MetaProgressionAdapter = {
      getHeroSnapshot: fakeAdapter.getHeroSnapshot,
      getEquipmentLoadout: () => ({ ...EMPTY_LOADOUT, protectedDieCount: 2 }),
    };
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: gearedAdapter });
    run = acknowledgeWavePreview(run, fixedRandom); // fixedRandom -> every die rolls 3 (a tie)
    // A stable sort over an all-tied hand keeps original index order, so the
    // first `protectedDieCount` indices are protected -- deterministic here.
    expect(run.dice.protectedIndices).toEqual([0, 1]);

    const beforeToggle = run.dice.locked[0];
    run = toggleDiceLock(run, 0);
    expect(run.dice.locked[0]).toBe(beforeToggle); // refused, unchanged

    run = toggleDiceLock(run, 2); // not protected
    expect(run.dice.locked[2]).toBe(false);
  });

  it("賭徒的算計 (comboUpgradeChance)：只會升到這手骰子本來就合法的較高一階效果，不會發明不合法的骰型", () => {
    const gearedAdapter: MetaProgressionAdapter = {
      getHeroSnapshot: fakeAdapter.getHeroSnapshot,
      getEquipmentLoadout: () => ({ ...EMPTY_LOADOUT, comboUpgradeChance: 1 }),
    };
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: gearedAdapter });
    // "2 2 2 5 5" 同時合法於 FULL_HOUSE / THREE_KIND / PAIR / NONE (per rules/dice.ts).
    run = { ...run, phase: "DICE_DECISION", dice: { ...run.dice, values: [2, 2, 2, 5, 5] } };
    run = confirmFate(run);
    expect(run.pendingComboChoices.map((choice) => choice.kind).sort()).toEqual(["FULL_HOUSE", "NONE", "PAIR", "THREE_KIND"].sort());

    run = chooseComboEffect(run, "PAIR", gearedAdapter, fixedRandom);
    // Upgrades to the NEAREST higher-priority kind the hand also qualifies
    // for (THREE_KIND), never straight to the top (FULL_HOUSE).
    expect(run.comboHistory.at(-1)?.kind).toBe("THREE_KIND");
    expect(run.pendingHeroChoice).toBe(true); // THREE_KIND's effect, not PAIR's summonRandom
  });

  it("英雄專武 (Signature Weapon) 一旦解鎖，會透過 run.effectiveHeroes 實際套用到該英雄的定義上", () => {
    const unlockedAdapter: MetaProgressionAdapter = {
      getHeroSnapshot: (heroId) => ({ heroId, level: 1, starRank: 1, signatureWeaponUnlocked: true }),
      getEquipmentLoadout: () => ({ ...EMPTY_LOADOUT }),
    };
    const lockedRun = createRun({ selectedHeroes: ["fighter"], leaderHeroId: "fighter", adapter: fakeAdapter });
    const unlockedRun = createRun({ selectedHeroes: ["fighter"], leaderHeroId: "fighter", adapter: unlockedAdapter });
    const baseRangeAlongRoute = HERO_DEFINITIONS.fighter!.rangeAlongRoute;
    // Locked: effectiveHeroes should carry the raw (unpatched) definition.
    expect(lockedRun.effectiveHeroes.fighter?.rangeAlongRoute).toBeCloseTo(baseRangeAlongRoute);
    // Unlocked: 破陣之拳 (breakersFist) patches extraRangeAlongRoute +0.15.
    expect(unlockedRun.effectiveHeroes.fighter?.rangeAlongRoute).toBeCloseTo(baseRangeAlongRoute + 0.15);
  });

  it("章節 (遠征輿圖 v1)：createRun 預設走第一章，指定 chapterId 會實際換成該章的 Wave 內容", () => {
    const defaultChapterRun = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter });
    expect(defaultChapterRun.chapterId).toBe("courtyard");

    let battlefieldRun = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter, chapterId: "battlefield" });
    expect(battlefieldRun.chapterId).toBe("battlefield");
    battlefieldRun = acknowledgeWavePreview(battlefieldRun, fixedRandom);
    battlefieldRun = confirmFate(battlefieldRun);
    battlefieldRun = chooseComboEffect(battlefieldRun, "NONE", fakeAdapter, fixedRandom);
    battlefieldRun = confirmFormation(battlefieldRun);
    // Wave 1 of the "battlefield" chapter spawns mistStalker, never Chapter 1's slime.
    expect(battlefieldRun.waveRuntime?.spawnQueue.every((spawn) => spawn.enemyId === "mistStalker")).toBe(true);
  });

  it("章節 (遠征輿圖 v1)：advanceToNextWave 的通關判定依該章自己的 Wave 長度，而非固定 10", () => {
    let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter, chapterId: "moonlit" });
    run = { ...run, wave: 10, phase: "REWARD_RESOLVE", talentChoices: [], blessingChoices: [] };
    run = advanceToNextWave(run);
    expect(run.phase).toBe("RUN_WIN");
  });

  it("副本 (深域狩令 v1)：createRun 的 startWave 會實際成為起始波數，並解析出該波的敵人", () => {
    const run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter, chapterId: "battlefield", startWave: 6 });
    expect(run.wave).toBe(6);
    expect(run.phase).toBe("WAVE_PREVIEW");
  });

  it("副本 (深域狩令 v1)：enemyRule.hpMultiplier 會實際放大出怪的 hp/maxHp", () => {
    let buffed = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter, enemyRule: { hpMultiplier: 1.5, speedMultiplier: 1 } });
    buffed = acknowledgeWavePreview(buffed, fixedRandom);
    buffed = confirmFate(buffed);
    buffed = chooseComboEffect(buffed, "NONE", fakeAdapter, fixedRandom);
    buffed = confirmFormation(buffed);
    // Wave 1 of courtyard is all "slime" (baseHp 34).
    buffed = advanceCombat(buffed, 0.01, fixedRandom);
    const spawnedEnemy = buffed.waveRuntime?.routes.flatMap((route) => route.enemies)[0];
    expect(spawnedEnemy?.maxHp).toBeCloseTo(34 * 1.5);
  });

  it("副本 (深域狩令 v1)：enemyRule.speedMultiplier 會實際影響敵人移動速度", () => {
    function pathProgressAfterOneTick(speedMultiplier: number): number {
      let run = createRun({ selectedHeroes: ["ranger"], leaderHeroId: "ranger", adapter: fakeAdapter, enemyRule: { hpMultiplier: 1, speedMultiplier } });
      run = acknowledgeWavePreview(run, fixedRandom);
      run = confirmFate(run);
      run = chooseComboEffect(run, "NONE", fakeAdapter, fixedRandom);
      run = confirmFormation(run);
      run = advanceCombat(run, 1, fixedRandom);
      return run.waveRuntime?.routes.flatMap((route) => route.enemies)[0]?.pathProgress ?? 0;
    }
    const normalProgress = pathProgressAfterOneTick(1);
    const doubledProgress = pathProgressAfterOneTick(2);
    expect(doubledProgress).toBeCloseTo(normalProgress * 2, 5);
  });
});
