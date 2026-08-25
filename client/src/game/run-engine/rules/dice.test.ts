import { describe, expect, it } from "vitest";
import { evaluateDiceHand, getEligibleComboEffects, rerollUnlocked, toggleDiceLock } from "./dice";

describe("evaluateDiceHand", () => {
  it("辨識一對，且同時合格 NONE", () => expect(evaluateDiceHand([1, 1, 3, 4, 6])).toEqual(["PAIR", "NONE"]));
  it("辨識兩對", () => expect(evaluateDiceHand([1, 1, 3, 3, 6])).toEqual(["TWO_PAIR", "PAIR", "NONE"]));
  it("辨識三條", () => expect(evaluateDiceHand([2, 2, 2, 4, 6])).toEqual(["THREE_KIND", "PAIR", "NONE"]));
  it("辨識小順子", () => expect(evaluateDiceHand([1, 2, 3, 4, 6])).toEqual(["SMALL_STRAIGHT", "NONE"]));
  it("辨識大順子", () => expect(evaluateDiceHand([2, 3, 4, 5, 6])).toEqual(["LARGE_STRAIGHT", "SMALL_STRAIGHT", "NONE"]));
  it("辨識五條", () => expect(evaluateDiceHand([6, 6, 6, 6, 6])).toEqual(["FIVE_KIND", "FOUR_KIND", "THREE_KIND", "PAIR", "NONE"]));

  it("葫蘆同時合格三條與一對，但不合格兩對（文件二十八範例）", () => {
    expect(evaluateDiceHand([2, 2, 2, 5, 5])).toEqual(["FULL_HOUSE", "THREE_KIND", "PAIR", "NONE"]);
  });
  it("四條同時合格三條與一對，但不合格兩對", () => {
    expect(evaluateDiceHand([4, 4, 4, 4, 2])).toEqual(["FOUR_KIND", "THREE_KIND", "PAIR", "NONE"]);
  });
});

describe("getEligibleComboEffects", () => {
  it("回傳所有合格 Combo 而非單一最高牌型", () => {
    const effects = getEligibleComboEffects([2, 2, 2, 5, 5]);
    expect(effects.map((entry) => entry.kind)).toEqual(["FULL_HOUSE", "THREE_KIND", "PAIR", "NONE"]);
    expect(effects[0].effect).toEqual({ kind: "freeMergeWithTwo" });
  });
});

describe("dice lock / reroll", () => {
  it("reroll 只改變未鎖定的骰子", () => {
    const values = [1, 2, 3, 4, 5];
    const locked = [true, false, true, false, true];
    const result = rerollUnlocked(values, locked, () => 0.999);
    expect(result[0]).toBe(1);
    expect(result[2]).toBe(3);
    expect(result[4]).toBe(5);
    expect(result[1]).toBe(6);
    expect(result[3]).toBe(6);
  });

  it("toggleDiceLock 只切換指定索引", () => {
    const locked = [false, false, false, false, false];
    const next = toggleDiceLock(locked, 2);
    expect(next).toEqual([false, false, true, false, false]);
    expect(locked).toEqual([false, false, false, false, false]);
  });
});
