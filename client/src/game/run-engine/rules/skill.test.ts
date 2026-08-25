import { describe, expect, it } from "vitest";
import { advanceAutoSkill, deterministicInitialOffset, resetSkillRuntime } from "./skill";

describe("resetSkillRuntime", () => {
  const attackCountTrigger = { kind: "attackCount" as const, every: 4 };
  const intervalTrigger = { kind: "interval" as const, seconds: 2 };

  it("attackCount 觸發：CD 欄位無意義，恆為 0", () => {
    const state = resetSkillRuntime("fireMage-1", attackCountTrigger);
    expect(state.attackCountSinceWaveStart).toBe(0);
    expect(state.cooldownRemainingSeconds).toBe(0);
  });

  it("interval 觸發：第一輪 CD 是 trigger.seconds 加上微小 offset，避免一開戰就觸發", () => {
    const state = resetSkillRuntime("priest-1", intervalTrigger);
    expect(state.cooldownRemainingSeconds).toBeGreaterThanOrEqual(2);
    expect(state.cooldownRemainingSeconds).toBeLessThan(2.35);
  });

  it("同英雄不同 instanceId 有不同（但確定性）的 offset，避免完全同步", () => {
    const a = deterministicInitialOffset("fireMage-1");
    const b = deterministicInitialOffset("fireMage-2");
    expect(a).not.toBe(b);
    expect(deterministicInitialOffset("fireMage-1")).toBe(a); // 確定性：同輸入同輸出
  });
});

describe("advanceAutoSkill - attackCount trigger", () => {
  const trigger = { kind: "attackCount" as const, every: 4 };

  it("只在真正命中攻擊時累加，且每 4 次觸發一次", () => {
    let state = resetSkillRuntime("fireMage-1", trigger);
    let firedCount = 0;
    for (let i = 0; i < 8; i += 1) {
      const result = advanceAutoSkill(state, trigger, 0.1, true);
      state = result.state;
      if (result.triggered) firedCount += 1;
    }
    expect(state.attackCountSinceWaveStart).toBe(8);
    expect(firedCount).toBe(2);
  });

  it("非攻擊 tick 不消耗次數也不觸發", () => {
    const state = resetSkillRuntime("fireMage-1", trigger);
    const result = advanceAutoSkill(state, trigger, 0.1, false);
    expect(result.triggered).toBe(false);
    expect(result.state.attackCountSinceWaveStart).toBe(0);
  });
});

describe("advanceAutoSkill - interval trigger", () => {
  it("倒數到 0 才觸發，並重置為下一輪秒數（不含 offset）", () => {
    const trigger = { kind: "interval" as const, seconds: 2 };
    let state = { attackCountSinceWaveStart: 0, cooldownRemainingSeconds: 2, initialOffsetSeconds: 0 };
    const first = advanceAutoSkill(state, trigger, 1.5, false);
    expect(first.triggered).toBe(false);
    expect(first.state.cooldownRemainingSeconds).toBeCloseTo(0.5);
    state = first.state;
    const second = advanceAutoSkill(state, trigger, 1, false);
    expect(second.triggered).toBe(true);
    expect(second.state.cooldownRemainingSeconds).toBeCloseTo(1.5); // 2 - overshoot(0.5)
  });
});

describe("advanceAutoSkill - condition trigger", () => {
  it("完全交由呼叫端判斷，engine 不持有額外狀態", () => {
    const trigger = { kind: "condition" as const, conditionId: "high-value-target" };
    const state = resetSkillRuntime("assassin-1", trigger);
    expect(advanceAutoSkill(state, trigger, 0.1, false, true).triggered).toBe(true);
    expect(advanceAutoSkill(state, trigger, 0.1, false, false).triggered).toBe(false);
  });
});
