import { describe, expect, it } from "vitest";
import { computeBlockAssignments, getEffectiveBlockCapacity } from "./block";

describe("getEffectiveBlockCapacity", () => {
  const blockRule = { baseCapacity: 2, rowCapacityMultiplier: { front: 1, midFront: 0.5 } };

  it("前線拿到完整 Block", () => expect(getEffectiveBlockCapacity({ zone: 1, row: "front" }, blockRule)).toBe(2));
  it("中前只拿到有限 Block", () => expect(getEffectiveBlockCapacity({ zone: 1, row: "midFront" }, blockRule)).toBe(1));
  it("中後/後方沒有 Block（未列於 rowCapacityMultiplier）", () => {
    expect(getEffectiveBlockCapacity({ zone: 1, row: "midBack" }, blockRule)).toBe(0);
    expect(getEffectiveBlockCapacity({ zone: 1, row: "back" }, blockRule)).toBe(0);
  });
});

describe("computeBlockAssignments", () => {
  it("Block 容量足夠時，最靠近城堡的敵人優先被擋下", () => {
    const providers = [{ instanceId: "knight", zones: [1 as const], capacity: 1 }];
    const targets = [
      { instanceId: "far", occupiedZones: [1 as const], blockCost: 1, pathProgress: 0.3 },
      { instanceId: "near", occupiedZones: [1 as const], blockCost: 1, pathProgress: 0.9 },
    ];
    const assignments = computeBlockAssignments(providers, targets);
    expect(assignments.get("near")).toBe("knight");
    expect(assignments.has("far")).toBe(false);
  });

  it("Block 已滿時，多出來的怪不受影響繼續前進", () => {
    const providers = [{ instanceId: "knight", zones: [1 as const], capacity: 1 }];
    const targets = [
      { instanceId: "e1", occupiedZones: [1 as const], blockCost: 1, pathProgress: 0.9 },
      { instanceId: "e2", occupiedZones: [1 as const], blockCost: 1, pathProgress: 0.8 },
    ];
    const assignments = computeBlockAssignments(providers, targets);
    expect(assignments.size).toBe(1);
    expect(assignments.has("e2")).toBe(false);
  });

  it("寬體敵人可被佔據的任一防區英雄阻擋", () => {
    const providers = [{ instanceId: "hero-zone3", zones: [3 as const], capacity: 1 }];
    const targets = [{ instanceId: "wide", occupiedZones: [2 as const, 3 as const], blockCost: 1, pathProgress: 0.5 }];
    const assignments = computeBlockAssignments(providers, targets);
    expect(assignments.get("wide")).toBe("hero-zone3");
  });

  it("Provider 容量為 0（例如坦克倒地後被移出 providers）不會產生阻擋", () => {
    const targets = [{ instanceId: "e1", occupiedZones: [1 as const], blockCost: 1, pathProgress: 0.9 }];
    const assignments = computeBlockAssignments([], targets);
    expect(assignments.size).toBe(0);
  });

  it("Provider 可同時登記多個防區（例如騎士 T3 協防相鄰防區）", () => {
    const providers = [{ instanceId: "knight-t3", zones: [2 as const, 3 as const], capacity: 2 }];
    const targets = [
      { instanceId: "e-zone2", occupiedZones: [2 as const], blockCost: 1, pathProgress: 0.6 },
      { instanceId: "e-zone3", occupiedZones: [3 as const], blockCost: 1, pathProgress: 0.6 },
    ];
    const assignments = computeBlockAssignments(providers, targets);
    expect(assignments.get("e-zone2")).toBe("knight-t3");
    expect(assignments.get("e-zone3")).toBe("knight-t3");
  });

  it("previousAssignments 讓既有阻擋維持穩定，不會無故換人", () => {
    const providers = [
      { instanceId: "knight-a", zones: [1 as const], capacity: 1 },
      { instanceId: "knight-b", zones: [1 as const], capacity: 1 },
    ];
    const targets = [{ instanceId: "e1", occupiedZones: [1 as const], blockCost: 1, pathProgress: 0.9 }];
    const previous = new Map([["e1", "knight-b"]]);
    const assignments = computeBlockAssignments(providers, targets, previous);
    expect(assignments.get("e1")).toBe("knight-b");
  });
});
