import { beforeEach, describe, expect, it } from "vitest";
import { defaultProgress } from "./persistence";
import { HERO_XP_PER_VICTORY } from "./heroProgress";
import { useGameStore } from "./store";

const freshProgress = () => ({ ...defaultProgress, inventory: [...defaultProgress.inventory], equipmentLevels: { ...defaultProgress.equipmentLevels }, equipped: {}, daily: { ...defaultProgress.daily, claimed: [] }, dungeonClears: {}, shop: { ...defaultProgress.shop, offers: [...defaultProgress.shop.offers], purchased: [] }, lobbyRead: {}, chaptersCleared: {}, bestWaveByChapter: {} });

beforeEach(() => {
  useGameStore.setState({ screen: "title", selectedHeroes: ["knight", "fireMage", "ranger"], leaderId: "knight", selectedChapterId: "courtyard", selectedDungeonId: undefined, activeDungeonId: undefined, run: undefined, progress: freshProgress() });
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

  it("starts an unlocked trial directly only when enough stamina is available", () => {
    const initialStamina = useGameStore.getState().progress.stamina;
    useGameStore.getState().selectDungeon("ruinCorridor");
    expect(useGameStore.getState().selectedDungeonId).toBeUndefined();
    expect(useGameStore.getState().screen).toBe("game");
    expect(useGameStore.getState().activeDungeonId).toBe("ruinCorridor");
    expect(useGameStore.getState().progress.stamina).toBe(initialStamina - 5);
    const progress = freshProgress();
    useGameStore.setState({ screen: "title", run: undefined, progress: { ...progress, stamina: 4 } });
    useGameStore.getState().selectDungeon("ruinCorridor");
    expect(useGameStore.getState().screen).toBe("title");
    expect(useGameStore.getState().run).toBeUndefined();
    expect(useGameStore.getState().progress.stamina).toBe(4);
  });

  it("records trial clear rewards and experience when the final wave is won", () => {
    const initialCrystals = useGameStore.getState().progress.crystals;
    useGameStore.getState().selectDungeon("ruinCorridor");
    const activeRun = useGameStore.getState().run!;
    // Fast-forward straight to "final Wave's Reward already resolved" -- exercises
    // the same advanceToNextWave() -> RUN_WIN transition a real playthrough hits,
    // without needing to simulate a full Wave 10 combat tick-by-tick.
    useGameStore.setState({ run: { ...activeRun, wave: 10, phase: "REWARD_RESOLVE", talentChoices: [], blessingChoices: [] } });
    useGameStore.getState().advanceToNextWave();
    const state = useGameStore.getState();
    expect(state.run?.phase).toBe("RUN_WIN");
    expect(state.progress.crystals).toBe(initialCrystals + 45);
    expect(state.progress.dungeonClears.ruinCorridor).toBe(1);
    expect(state.progress.heroProgress.knight?.experience).toBe(HERO_XP_PER_VICTORY);
    expect(state.progress.heroProgress.fireMage?.experience).toBe(HERO_XP_PER_VICTORY);
    expect(state.progress.heroProgress.ranger?.experience).toBe(HERO_XP_PER_VICTORY);
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

  it("campaign chapters (遠征輿圖 v1)：開始遠征永遠打玩家目前的最前緣章節（尚未切換到下一章前仍是第一章）", () => {
    useGameStore.getState().startRun();
    expect(useGameStore.getState().run?.chapterId).toBe("courtyard");
  });

  it("campaign chapters (遠征輿圖 v1)：通關整章 Wave10 後記錄 chaptersCleared、依章節分級鑽石，且首通額外給材料，下一局自動打下一章", () => {
    useGameStore.setState({ progress: { ...freshProgress(), chaptersCleared: { courtyard: true } } });
    useGameStore.getState().startRun();
    const activeRun = useGameStore.getState().run!;
    expect(activeRun.chapterId).toBe("battlefield");
    const initialCrystals = useGameStore.getState().progress.crystals;
    const initialMaterials = useGameStore.getState().progress.materials;
    useGameStore.setState({ run: { ...activeRun, wave: 10, phase: "REWARD_RESOLVE", talentChoices: [], blessingChoices: [] } });
    useGameStore.getState().advanceToNextWave();
    const state = useGameStore.getState();
    expect(state.run?.phase).toBe("RUN_WIN");
    expect(state.progress.chaptersCleared.battlefield).toBe(true);
    expect(state.progress.crystals).toBe(initialCrystals + 30);
    expect(state.progress.materials).toBe(initialMaterials + 10);
    expect(state.progress.bestWaveByChapter.battlefield).toBe(10);
    useGameStore.getState().startRun();
    expect(useGameStore.getState().run?.chapterId).toBe("moonlit");
  });
});
