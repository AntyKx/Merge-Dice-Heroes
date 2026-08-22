import { describe, expect, it } from "vitest";
import { evaluateDice } from "./dice";

describe("evaluateDice", () => {
  it("辨識一對", () => expect(evaluateDice([1, 1, 3, 4, 6]).kind).toBe("PAIR"));
  it("辨識兩對", () => expect(evaluateDice([1, 1, 3, 3, 6]).kind).toBe("TWO_PAIR"));
  it("辨識三條", () => expect(evaluateDice([2, 2, 2, 4, 6]).kind).toBe("THREE_KIND"));
  it("辨識小順子", () => expect(evaluateDice([1, 2, 3, 4, 6]).kind).toBe("SMALL_STRAIGHT"));
  it("辨識大順子", () => expect(evaluateDice([2, 3, 4, 5, 6]).kind).toBe("LARGE_STRAIGHT"));
  it("辨識葫蘆", () => expect(evaluateDice([2, 2, 2, 5, 5]).kind).toBe("FULL_HOUSE"));
  it("辨識四條", () => expect(evaluateDice([4, 4, 4, 4, 2]).kind).toBe("FOUR_KIND"));
  it("辨識五條", () => expect(evaluateDice([6, 6, 6, 6, 6]).kind).toBe("FIVE_KIND"));
  it("依優先序以大順子壓過小順子", () => expect(evaluateDice([1, 2, 3, 4, 5]).kind).toBe("LARGE_STRAIGHT"));
});

