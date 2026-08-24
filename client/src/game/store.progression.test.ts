import { beforeEach, describe, expect, it } from "vitest";
import { defaultProgress } from "./persistence";
import { useGameStore } from "./store";

const freshProgress = () => ({ ...defaultProgress, inventory: [...defaultProgress.inventory], equipmentLevels: { ...defaultProgress.equipmentLevels }, equipped: {}, daily: { ...defaultProgress.daily, claimed: [] }, dungeonClears: {}, shop: { ...defaultProgress.shop, offers: [...defaultProgress.shop.offers], purchased: [] }, lobbyRead: {} });

beforeEach(() => {
  useGameStore.setState({ screen: "title", selectedHeroes: ["knight", "fireMage", "ranger"], leaderId: "knight", selectedDungeonId: undefined, run: undefined, progress: freshProgress() });
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

  it("buys a shop item once and uses the daily free refresh", () => {
    const initialSigils = useGameStore.getState().progress.sigils;
    useGameStore.getState().buyShopOffer("forgeBundle");
    expect(useGameStore.getState().progress.sigils).toBe(initialSigils - 8);
    expect(useGameStore.getState().progress.materials).toBe(defaultProgress.materials + 20);
    useGameStore.getState().refreshShop();
    expect(useGameStore.getState().progress.shop.freeRefreshAvailable).toBe(false);
    expect(useGameStore.getState().progress.shop.purchased).toHaveLength(0);
  });

  it("upgrades and then dismantles an owned item for materials", () => {
    const initialMaterials = useGameStore.getState().progress.materials;
    useGameStore.getState().upgradeEquipment("morningBlade");
    expect(useGameStore.getState().progress.equipmentLevels.morningBlade).toBe(2);
    expect(useGameStore.getState().progress.materials).toBe(initialMaterials - 8);
    useGameStore.getState().dismantleEquipment("morningBlade");
    expect(useGameStore.getState().progress.inventory).not.toContain("morningBlade");
    expect(useGameStore.getState().progress.materials).toBeGreaterThan(initialMaterials - 8);
  });

  it("marks lobby notifications read on module entry and daily reward claim", () => {
    useGameStore.getState().openScreen("shop");
    expect(useGameStore.getState().progress.lobbyRead.shop).toBe(true);
    const progress = freshProgress();
    useGameStore.setState({ progress: { ...progress, daily: { ...progress.daily, battles: 3 } } });
    useGameStore.getState().claimDailyReward("battle");
    expect(useGameStore.getState().progress.lobbyRead.daily).toBe(true);
  });

  it("edits a formation slot in the lobby without opening an expedition or creating a run", () => {
    useGameStore.getState().setTeamSlot(1, "bard");
    expect(useGameStore.getState().selectedHeroes).toEqual(["knight", "bard", "ranger"]);
    expect(useGameStore.getState().screen).toBe("title");
    expect(useGameStore.getState().run).toBeUndefined();
  });

  it("keeps leader selection within the currently active formation", () => {
    useGameStore.getState().chooseLeader("ranger");
    expect(useGameStore.getState().leaderId).toBe("ranger");
    useGameStore.getState().chooseLeader("bard");
    expect(useGameStore.getState().leaderId).toBe("ranger");
  });
});
