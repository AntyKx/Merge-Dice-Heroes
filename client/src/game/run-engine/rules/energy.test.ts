import { describe, expect, it } from "vitest";
import { RUN_ENGINE_CONFIG } from "../config";
import { canAfford, canBuyExtraReposition, gainEnergy, recycleRewardFor, spendEnergy } from "./energy";

const costTable = RUN_ENGINE_CONFIG.fateEnergy;

describe("Fate Energy", () => {
  it("gainEnergy 不超過上限", () => {
    const state = { current: 9, max: 10 };
    expect(gainEnergy(state, 5).current).toBe(10);
  });

  it("spendEnergy 足夠時扣除", () => {
    const state = { current: 5, max: 10 };
    expect(spendEnergy(state, 3).current).toBe(2);
  });

  it("spendEnergy 不足時不變", () => {
    const state = { current: 2, max: 10 };
    expect(spendEnergy(state, 3)).toEqual(state);
    expect(canAfford(state, 3)).toBe(false);
  });

  it("回收獎勵依 Tier：T1=1 T2=3 T3=7", () => {
    expect(recycleRewardFor(1, costTable)).toBe(1);
    expect(recycleRewardFor(2, costTable)).toBe(3);
    expect(recycleRewardFor(3, costTable)).toBe(7);
  });

  it("每 Wave 額外調度限購 1 次，且需付得起", () => {
    const state = { current: 2, max: 10 };
    expect(canBuyExtraReposition(state, 0, costTable)).toBe(true);
    expect(canBuyExtraReposition(state, 1, costTable)).toBe(false);
    expect(canBuyExtraReposition({ current: 1, max: 10 }, 0, costTable)).toBe(false);
  });
});
