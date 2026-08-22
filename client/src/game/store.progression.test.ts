import { beforeEach, describe, expect, it } from "vitest";
import { defaultProgress } from "./persistence";
import { useGameStore } from "./store";

const freshProgress = () => ({ ...defaultProgress, inventory: [...defaultProgress.inventory], equipped: {}, daily: { ...defaultProgress.daily, claimed: [] }, dungeonClears: {} });

beforeEach(() => {
  useGameStore.setState({ screen: "title", selectedDungeonId: undefined, progress: freshProgress() });
});

describe("persistent lobby progression", () => {
  it("equips and unequips a real backpack item in its slot", () => {
    useGameStore.getState().equipItem("morningBlade");
    expect(useGameStore.getState().progress.equipped.weapon).toBe("morningBlade");
    useGameStore.getState().unequipItem("weapon");
    expect(useGameStore.getState().progress.equipped.weapon).toBeUndefined();
  });

  it("claims a completed daily reward once", () => {
    const progress = freshProgress();
    useGameStore.setState({ progress: { ...progress, daily: { ...progress.daily, merges: 3 } } });
    const initialCrystals = useGameStore.getState().progress.crystals;
    useGameStore.getState().claimDailyReward("merge");
    expect(useGameStore.getState().progress.crystals).toBe(initialCrystals + 20);
    expect(useGameStore.getState().progress.daily.claimed).toContain("merge");
    useGameStore.getState().claimDailyReward("merge");
    expect(useGameStore.getState().progress.crystals).toBe(initialCrystals + 20);
  });

  it("selects an unlocked dungeon only when enough stamina is available", () => {
    useGameStore.getState().selectDungeon("ruinCorridor");
    expect(useGameStore.getState().selectedDungeonId).toBe("ruinCorridor");
    expect(useGameStore.getState().screen).toBe("team");
  });
});
