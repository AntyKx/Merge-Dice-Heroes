import { describe, expect, it } from "vitest";
import { applyCastleDamage, isRunFailure } from "./castle";

describe("applyCastleDamage", () => {
  it("扣血且不低於 0", () => {
    expect(applyCastleDamage({ hp: 5, maxHp: 20 }, 3).hp).toBe(2);
    expect(applyCastleDamage({ hp: 2, maxHp: 20 }, 5).hp).toBe(0);
  });
});

describe("isRunFailure", () => {
  it("Castle HP <= 0 才判定 Run Failure", () => {
    expect(isRunFailure({ hp: 1, maxHp: 20 })).toBe(false);
    expect(isRunFailure({ hp: 0, maxHp: 20 })).toBe(true);
  });
});
