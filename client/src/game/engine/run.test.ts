import { describe, expect, it } from "vitest";
import { advanceCombat, makeCombatState } from "./combat";
import { chooseTalent, createRun, nextWave, prepareTalents } from "./run";

const seeded = () => 0.21;

describe("run engine", () => {
  it("城堡生命歸零時失敗", () => {
    const run = createRun(["knight", "archer", "priest"], "knight", seeded);
    const combat = makeCombatState(1);
    combat.castleHp = 1;
    combat.pendingEnemies = [];
    combat.enemies = [{ id: "near", enemyId: "eliteGiant", hp: 10, maxHp: 10, pathProgress: 1, cooldown: 0 }];
    const result = advanceCombat({ ...run, phase: "COMBAT", combat }, 0.1, seeded);
    expect(result.phase).toBe("DEFEAT");
  });

  it("波次清空時進入結算", () => {
    const run = createRun(["knight", "archer", "priest"], "knight", seeded);
    const combat = makeCombatState(1);
    combat.pendingEnemies = [];
    const result = advanceCombat({ ...run, phase: "COMBAT", combat }, 0.1, seeded);
    expect(result.phase).toBe("WAVE_CLEAR");
  });

  it("天賦不得超出指定層數", () => {
    const run = createRun(["knight", "archer", "priest"], "knight", seeded);
    const reward = prepareTalents({ ...run, phase: "REWARD" }, seeded);
    const first = reward.talentChoices[0];
    const capped = { ...reward, activeTalents: [{ id: first.id, stacks: first.maxStacks }] };
    expect(chooseTalent(capped, first.id).activeTalents[0].stacks).toBe(first.maxStacks);
  });

  it("第十波結算後勝利", () => {
    const run = createRun(["knight", "archer", "priest"], "knight", seeded);
    expect(nextWave({ ...run, wave: 10, phase: "WAVE_CLEAR" }).phase).toBe("VICTORY");
  });

  it("Boss 生命低於一半時切入第二階段並封鎖棋盤", () => {
    const run = createRun(["knight", "archer", "priest"], "knight", seeded);
    const combat = makeCombatState(10);
    combat.pendingEnemies = [];
    combat.enemies = [{ id: "boss", enemyId: "boss", hp: 340, maxHp: 720, pathProgress: 0.2, cooldown: 0 }];
    const result = advanceCombat({ ...run, phase: "COMBAT", wave: 10, combat }, 0.1, seeded);
    expect(result.combat.enemies[0]?.phaseTwo).toBe(true);
    expect(result.combat.lockedTile).toBeDefined();
  });
});
