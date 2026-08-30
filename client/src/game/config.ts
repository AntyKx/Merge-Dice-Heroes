import type {
  DiceCombination,
  DiceCombinationKind,
  EnemyDefinition,
  EnemyId,
  HeroDefinition,
  HeroId,
  TalentDefinition,
  WaveDefinition,
  DailyQuestDefinition,
  DungeonDefinition,
  EquipmentBonuses,
  EquipmentDefinition,
  EquipmentId,
  EquipmentSlot,
  ShopOfferDefinition,
  ShopOfferId,
} from "./types";

export const HEROES: Record<HeroId, HeroDefinition> = {
  knight: {
    id: "knight",
    name: "蒼鋼騎士",
    classLabel: "守護",
    color: "#3d82d8",
    icon: "K",
    range: 0.2,
    attack: 7,
    maxHp: 112,
    attackInterval: 1.05,
    role: "tank",
    tierNotes: { 1: "阻擋 1 名敵人", 2: "阻擋 2 名，帶擊退", 3: "阻擋 3 名，定期護盾" },
  },
  fireMage: {
    id: "fireMage",
    name: "燼焰法師",
    classLabel: "火術",
    color: "#e76450",
    icon: "F",
    range: 0.62,
    attack: 16,
    maxHp: 56,
    attackInterval: 1.35,
    role: "area",
    tierNotes: { 1: "火球單體", 2: "命中小範圍爆炸", 3: "三目標燃燒" },
  },
  archer: {
    id: "archer",
    name: "翠羽弓手",
    classLabel: "疾射",
    color: "#40a56f",
    icon: "A",
    range: 0.78,
    attack: 11,
    maxHp: 62,
    attackInterval: 0.64,
    role: "single",
    tierNotes: { 1: "快速單箭", 2: "第四箭穿透", 3: "連射與暴擊" },
  },
  priest: {
    id: "priest",
    name: "晨曦祭司",
    classLabel: "祈禱",
    color: "#a877c7",
    icon: "P",
    range: 0.56,
    attack: 5,
    maxHp: 72,
    attackInterval: 1.25,
    role: "support",
    tierNotes: { 1: "治療最虛弱者", 2: "治療 2 名", 3: "治療並加速" },
  },
  ranger: {
    id: "ranger", name: "森林遊俠", classLabel: "狙擊", color: "#4f9a64", icon: "R", range: 0.88, attack: 14, maxHp: 58, attackInterval: 0.72, role: "single",
    tierNotes: { 1: "遠距狙擊", 2: "箭矢穿透", 3: "連環獵射" },
  },
  engineer: {
    id: "engineer", name: "機關技師", classLabel: "工坊", color: "#c7803f", icon: "E", range: 0.66, attack: 10, maxHp: 74, attackInterval: 1.08, role: "area",
    tierNotes: { 1: "部署齒輪彈", 2: "小範圍連鎖", 3: "過載砲塔" },
  },
  deathKnight: {
    id: "deathKnight", name: "死亡騎士", classLabel: "冥衛", color: "#6d5da3", icon: "D", range: 0.28, attack: 12, maxHp: 128, attackInterval: 1.15, role: "tank",
    tierNotes: { 1: "阻擋 1 名敵人", 2: "吸收傷害", 3: "冥火護幕" },
  },
  bard: {
    id: "bard", name: "水樂吟遊詩人", classLabel: "和鳴", color: "#48aab8", icon: "B", range: 0.58, attack: 6, maxHp: 68, attackInterval: 1.02, role: "support",
    tierNotes: { 1: "治療最虛弱者", 2: "治療並加速", 3: "全隊和鳴" },
  },
  fighter: {
    id: "fighter", name: "武鬥家", classLabel: "格鬥", color: "#c85a43", icon: "F", range: 0.34, attack: 17, maxHp: 92, attackInterval: 0.84, role: "single",
    tierNotes: { 1: "近戰連擊", 2: "重拳追擊", 3: "暴烈旋風" },
  },
  frostQueen: {
    id: "frostQueen", name: "皇家公主", classLabel: "晶霜", color: "#5d91d5", icon: "Q", range: 0.76, attack: 14, maxHp: 61, attackInterval: 1.3, role: "area",
    tierNotes: { 1: "冰晶單體", 2: "寒霜擴散", 3: "凍結風暴" },
  },
  assassin: {
    id: "assassin", name: "暗影刺客", classLabel: "瞬擊", color: "#85529d", icon: "S", range: 0.67, attack: 21, maxHp: 50, attackInterval: 0.9, role: "single",
    tierNotes: { 1: "伏擊最前敵人", 2: "影步追斬", 3: "雙刃處決" },
  },
};

export const SELECTABLE_HERO_IDS: HeroId[] = ["knight", "fireMage", "priest", "assassin", "frostQueen", "ranger", "bard", "deathKnight", "engineer", "fighter"];

export const EQUIPMENT: Record<EquipmentId, EquipmentDefinition> = {
  morningBlade: { id: "morningBlade", name: "晨星長劍", slot: "weapon", rarity: "稀有", description: "全隊起始攻擊 +8%。", icon: "⚔", bonuses: { attackMultiplier: 0.08 }, upgradeBonus: { attackMultiplier: 0.025 } },
  watcherCloak: { id: "watcherCloak", name: "守望者披風", slot: "armor", rarity: "普通", description: "城堡最大生命 +3。", icon: "◒", bonuses: { castleBonus: 3 }, upgradeBonus: { castleBonus: 1 } },
  fateDiceBox: { id: "fateDiceBox", name: "命運骰匣", slot: "relic", rarity: "史詩", description: "每局額外獲得 1 次重骰。", icon: "⚄", bonuses: { extraRerolls: 1 }, upgradeBonus: { attackMultiplier: 0.02 } },

  // ---- 共用武器 Shared Weapons -----------------------------------------
  ironedgeBlade: { id: "ironedgeBlade", name: "精鋼利刃", slot: "weapon", rarity: "普通", description: "全隊起始攻擊 +5%。", icon: "⚔", bonuses: { attackMultiplier: 0.05 }, upgradeBonus: { attackMultiplier: 0.015 } },
  windrushEdge: { id: "windrushEdge", name: "疾風之刃", slot: "weapon", rarity: "稀有", description: "全隊攻擊速度 +8%。", icon: "🗡", bonuses: { attackSpeedMultiplier: 0.08 }, upgradeBonus: { attackSpeedMultiplier: 0.02 } },
  killerInstinctSigil: { id: "killerInstinctSigil", name: "致命本能徽記", slot: "weapon", rarity: "稀有", description: "全隊暴擊率 +12%，暴擊傷害 +50%。", icon: "☠", bonuses: { critChance: 0.12, critDamageMultiplier: 0.5 }, upgradeBonus: { critChance: 0.03 } },
  dragonslayersMark: { id: "dragonslayersMark", name: "屠龍者印記", slot: "weapon", rarity: "史詩", description: "對精英／首領造成的傷害 +25%。", icon: "🐉", bonuses: { bossDamageMultiplier: 0.25 }, upgradeBonus: { bossDamageMultiplier: 0.06 } },
  chainlightRod: { id: "chainlightRod", name: "連鎖雷光杖", slot: "weapon", rarity: "史詩", description: "普攻有 15% 機率額外電擊，造成 50% 傷害。", icon: "⚡", bonuses: { chainLightningProcChance: 0.15 }, upgradeBonus: { chainLightningProcChance: 0.03 } },

  // ---- 共用護甲 Shared Armor --------------------------------------------
  stalwartBuckler: { id: "stalwartBuckler", name: "堅木盾牌", slot: "armor", rarity: "普通", description: "全隊生命上限 +5%。", icon: "🛡", bonuses: { hpMultiplier: 0.05 }, upgradeBonus: { hpMultiplier: 0.015 } },
  sacredDewVial: { id: "sacredDewVial", name: "聖光凝露", slot: "armor", rarity: "普通", description: "波間生命恢復比例 +10%。", icon: "💧", bonuses: { recoveryPctBonus: 0.1 }, upgradeBonus: { recoveryPctBonus: 0.02 } },
  royalWardplate: { id: "royalWardplate", name: "王室徽甲", slot: "armor", rarity: "稀有", description: "每波開始時，全隊獲得等同城堡 5% 生命的護盾。", icon: "🏰", bonuses: { shieldOnWaveStartPctCastleHp: 0.05 }, upgradeBonus: { shieldOnWaveStartPctCastleHp: 0.01 } },
  mistweaveCloak: { id: "mistweaveCloak", name: "迷霧斗篷", slot: "armor", rarity: "稀有", description: "全隊受到的傷害 -8%。", icon: "🌫", bonuses: { damageReductionPct: 0.08 }, upgradeBonus: { damageReductionPct: 0.02 } },
  bastionHeart: { id: "bastionHeart", name: "磐石之心", slot: "armor", rarity: "史詩", description: "城堡最大生命 +8。", icon: "◒", bonuses: { castleBonus: 8 }, upgradeBonus: { castleBonus: 2 } },
  vanguardBanner: { id: "vanguardBanner", name: "前線軍旗", slot: "armor", rarity: "史詩", description: "所有坦克角色的阻擋容量 +1。", icon: "🚩", bonuses: { tankBlockCapacityBonus: 1 }, upgradeBonus: { damageReductionPct: 0.05 } },

  // ---- 共用遺物 Shared Relics --------------------------------------------
  nimbleToolkit: { id: "nimbleToolkit", name: "巧手匠具", slot: "relic", rarity: "普通", description: "每波調度次數 +1。", icon: "🔧", bonuses: { repositionBonus: 1 }, upgradeBonus: {} },
  gluttonousCoinpurse: { id: "gluttonousCoinpurse", name: "貪婪錢袋", slot: "relic", rarity: "普通", description: "命運能量上限 +2。", icon: "💰", bonuses: { fateEnergyMaxBonus: 2 }, upgradeBonus: { fateEnergyMaxBonus: 1 } },
  conscriptionOrder: { id: "conscriptionOrder", name: "徵兵令", slot: "relic", rarity: "稀有", description: "隨機召喚花費 -1 命運能量。", icon: "📜", bonuses: { summonCostReduction: 1 }, upgradeBonus: {} },
  fusionCatalyst: { id: "fusionCatalyst", name: "熔合催化劑", slot: "relic", rarity: "稀有", description: "普通合成完成後，10% 機率讓下一次合成也只需 2 名。", icon: "🧪", bonuses: { freeMergeChance: 0.1 }, upgradeBonus: { freeMergeChance: 0.025 } },
  twinFateDice: { id: "twinFateDice", name: "命運雙子骰", slot: "relic", rarity: "稀有", description: "每波第一次擲骰後，自動保護點數最高的骰子不被選取重骰。", icon: "🎲", bonuses: { protectedDieCount: 1 }, upgradeBonus: {} },
  gamblersReckoning: { id: "gamblersReckoning", name: "賭徒的算計", slot: "relic", rarity: "史詩", description: "骰型結算非「無組合」時，20% 機率視為高一階效果結算。", icon: "🃏", bonuses: { comboUpgradeChance: 0.2 }, upgradeBonus: { comboUpgradeChance: 0.05 } },

  // ---- 職業傾向裝備 Role-leaning Equipment -------------------------------
  vengeanceGauntlets: { id: "vengeanceGauntlets", name: "復仇者護手", slot: "weapon", rarity: "稀有", description: "坦克角色普攻傷害 +20%（無坦克時全隊 +5%）。", icon: "🥊", bonuses: {}, upgradeBonus: {}, roleBonus: { role: "tank", bonus: { attackMultiplier: 0.2 }, fallback: { attackMultiplier: 0.05 } } },
  bulwarkOfTheVanguard: { id: "bulwarkOfTheVanguard", name: "巨盾壁壘", slot: "armor", rarity: "稀有", description: "坦克阻擋容量 +1、反擊傷害 -15%（無坦克時全隊生命 +2%）。", icon: "🛡", bonuses: {}, upgradeBonus: {}, roleBonus: { role: "tank", bonus: { tankBlockCapacityBonus: 1, damageReductionPct: 0.15 }, fallback: { hpMultiplier: 0.02 } } },
  heavystrikeKnuckles: { id: "heavystrikeKnuckles", name: "重擊拳套", slot: "weapon", rarity: "稀有", description: "近戰角色暴擊率 +15%（無近戰時全隊 +3%）。", icon: "👊", bonuses: {}, upgradeBonus: {}, roleBonus: { role: "melee", bonus: { critChance: 0.15 }, fallback: { critChance: 0.03 } } },
  warfuryPlate: { id: "warfuryPlate", name: "戰意戰甲", slot: "armor", rarity: "普通", description: "近戰角色生命 +10%（無近戰時全隊 +2%）。", icon: "🩸", bonuses: {}, upgradeBonus: {}, roleBonus: { role: "melee", bonus: { hpMultiplier: 0.1 }, fallback: { hpMultiplier: 0.02 } } },
  shadowstrikeDagger: { id: "shadowstrikeDagger", name: "影襲匕首", slot: "weapon", rarity: "稀有", description: "刺客攻速 +15%（無刺客時全隊 +3%）。", icon: "🗡", bonuses: {}, upgradeBonus: {}, roleBonus: { role: "assassin", bonus: { attackSpeedMultiplier: 0.15, critChance: 0.1 }, fallback: { attackSpeedMultiplier: 0.03 } } },
  cloakOfUmbra: { id: "cloakOfUmbra", name: "隱匿斗篷", slot: "armor", rarity: "稀有", description: "刺客受到的傷害 -20%（無刺客時全隊 -4%）。", icon: "🌑", bonuses: {}, upgradeBonus: {}, roleBonus: { role: "assassin", bonus: { damageReductionPct: 0.2 }, fallback: { damageReductionPct: 0.04 } } },
  farsightLens: { id: "farsightLens", name: "千里之眼", slot: "weapon", rarity: "稀有", description: "遠程角色傷害 +10%（無遠程時全隊 +3%）。", icon: "🔭", bonuses: {}, upgradeBonus: {}, roleBonus: { role: "ranged", bonus: { attackMultiplier: 0.1 }, fallback: { attackMultiplier: 0.03 } } },
  quiverResupply: { id: "quiverResupply", name: "箭袋補給", slot: "relic", rarity: "普通", description: "遠程角色攻速 +10%（無遠程時全隊重骰 +1，僅開局）。", icon: "🏹", bonuses: {}, upgradeBonus: {}, roleBonus: { role: "ranged", bonus: { attackSpeedMultiplier: 0.1 }, fallback: { extraRerolls: 1 } } },
  choristersStaff: { id: "choristersStaff", name: "頌者法杖", slot: "relic", rarity: "稀有", description: "輔助角色的治療／增益效果量 +25%（無輔助時全隊回復 +3%）。", icon: "✨", bonuses: {}, upgradeBonus: {}, roleBonus: { role: "support", bonus: { recoveryPctBonus: 0.25 }, fallback: { recoveryPctBonus: 0.03 } } },
  vowScripture: { id: "vowScripture", name: "誓詞聖典", slot: "armor", rarity: "稀有", description: "輔助角色的支援效果加乘（無輔助時城堡血量 +3%）。", icon: "📖", bonuses: {}, upgradeBonus: {}, roleBonus: { role: "support", bonus: { recoveryPctBonus: 0.1, shieldOnWaveStartPctCastleHp: 0.03 }, fallback: { castleBonus: 1 } } },
};

/** Every stat key EquipmentBonuses can carry -- kept as one list so the merge
 * helpers below never need updating when a new stat is added, only this array
 * and the interface itself (types.ts). */
const EQUIPMENT_BONUS_KEYS = [
  "attackMultiplier", "castleBonus", "extraRerolls", "attackSpeedMultiplier",
  "critChance", "critDamageMultiplier", "bossDamageMultiplier", "hpMultiplier",
  "recoveryPctBonus", "shieldOnWaveStartPctCastleHp", "damageReductionPct",
  "tankBlockCapacityBonus", "repositionBonus", "fateEnergyMaxBonus",
  "summonCostReduction", "freeMergeChance", "comboUpgradeChance",
  "protectedDieCount", "chainLightningProcChance",
] as const satisfies readonly (keyof EquipmentBonuses)[];

/** Adds every field of `partial` onto `total`, scaled by `scale` (defaults to a
 * plain add). Exported so defaultMetaAdapter.ts can reuse the exact same
 * accumulation rule when folding in a role-leaning item's resolved bonus. */
export function mergeEquipmentBonuses(total: EquipmentBonuses, partial: Partial<EquipmentBonuses> | undefined, scale = 1): EquipmentBonuses {
  if (!partial) return total;
  const next = { ...total };
  EQUIPMENT_BONUS_KEYS.forEach((key) => {
    const value = partial[key];
    if (value) next[key] = next[key] + value * scale;
  });
  return next;
}

export const SHOP_OFFERS: Record<ShopOfferId, ShopOfferDefinition> = {
  forgeBundle: { id: "forgeBundle", title: "鍛造銅礦 ×20", description: "可用於升級裝備。", price: 8, icon: "⛏", reward: { materials: 20 } },
  morningBladeOffer: { id: "morningBladeOffer", title: "晨星長劍", description: "稀有武器，初始攻擊加成。", price: 12, icon: "⚔", reward: { equipmentId: "morningBlade" } },
  watcherCloakOffer: { id: "watcherCloakOffer", title: "守望者披風", description: "普通護甲，提升城堡生命。", price: 9, icon: "◒", reward: { equipmentId: "watcherCloak" } },
  fateDiceBoxOffer: { id: "fateDiceBoxOffer", title: "命運骰匣", description: "史詩遺物，增加每局重骰。", price: 18, icon: "⚄", reward: { equipmentId: "fateDiceBox" } },
};

export const DAILY_QUESTS: DailyQuestDefinition[] = [
  { id: "battle", title: "完成 3 場戰鬥", target: 3, description: "完成波次戰鬥。", rewardCrystals: 30 },
  { id: "merge", title: "合成 3 次英雄", target: 3, description: "將相同英雄升階。", rewardCrystals: 20 },
  { id: "victory", title: "完成 1 局遠征", target: 1, description: "守住命運舞台。", rewardCrystals: 50 },
];

export const DUNGEONS: DungeonDefinition[] = [
  { id: "ruinCorridor", title: "廢墟迴廊", description: "敵軍攻速提高的遺跡戰場。", energyCost: 5, recommendedPower: 180, startWave: 3, reward: { crystals: 45, equipmentId: "watcherCloak", label: "守望者披風素材" }, enemyRule: { label: "急行軍：敵軍移速 +30%", hpMultiplier: 1, speedMultiplier: 1.3 }, unlocked: true },
  { id: "frostAltar", title: "霜凍祭壇", description: "寒霜壓境的高難度試煉。", energyCost: 8, recommendedPower: 320, startWave: 6, reward: { crystals: 70, equipmentId: "fateDiceBox", label: "霜華紋章" }, enemyRule: { label: "霜甲：敵軍生命 +25%、移速 -10%", hpMultiplier: 1.25, speedMultiplier: 0.9 }, unlocked: false },
  { id: "shadowTrial", title: "暮影試煉", description: "精英敵人的連戰舞台。", energyCost: 10, recommendedPower: 480, startWave: 9, reward: { crystals: 100, label: "暗影系列素材" }, enemyRule: { label: "影獵：敵軍生命 +45%、移速 +15%", hpMultiplier: 1.45, speedMultiplier: 1.15 }, unlocked: false },
];

export const EMPTY_EQUIPMENT_BONUSES: EquipmentBonuses = {
  attackMultiplier: 0, castleBonus: 0, extraRerolls: 0, attackSpeedMultiplier: 0,
  critChance: 0, critDamageMultiplier: 0, bossDamageMultiplier: 0, hpMultiplier: 0,
  recoveryPctBonus: 0, shieldOnWaveStartPctCastleHp: 0, damageReductionPct: 0,
  tankBlockCapacityBonus: 0, repositionBonus: 0, fateEnergyMaxBonus: 0,
  summonCostReduction: 0, freeMergeChance: 0, comboUpgradeChance: 0,
  protectedDieCount: 0, chainLightningProcChance: 0,
};

/** Sums every equipped item's OWN (role-agnostic) bonuses/upgradeBonus. Items
 * with a `roleBonus` (see EquipmentDefinition) intentionally leave `bonuses`
 * empty -- their whole effect is resolved separately, in defaultMetaAdapter.ts,
 * which is the one place that also knows the run's selectedHeroes. */
export function getEquipmentBonuses(equipped: Partial<Record<EquipmentSlot, EquipmentId>>, equipmentLevels: Partial<Record<EquipmentId, number>> = {}): EquipmentBonuses {
  return Object.values(equipped).reduce<EquipmentBonuses>((total, id) => {
    if (!id) return total;
    const equipment = EQUIPMENT[id];
    const level = Math.max(1, equipmentLevels[id] ?? 1);
    const withBase = mergeEquipmentBonuses(total, equipment.bonuses);
    return mergeEquipmentBonuses(withBase, equipment.upgradeBonus, level - 1);
  }, { ...EMPTY_EQUIPMENT_BONUSES });
}

export const ENEMIES: Record<EnemyId, EnemyDefinition> = {
  slime: { id: "slime", name: "藍史萊姆", color: "#55a5dd", hp: 34, speed: 0.04, attack: 7, attackInterval: 1.2, castleDamage: 1, tags: [] },
  wolf: { id: "wolf", name: "疾風狼", color: "#c49255", hp: 25, speed: 0.077, attack: 6, attackInterval: 0.85, castleDamage: 1, tags: [] },
  shieldSoldier: { id: "shieldSoldier", name: "盾牌兵", color: "#76869a", hp: 78, speed: 0.032, attack: 9, attackInterval: 1.3, castleDamage: 2, tags: ["shield"] },
  goblinArcher: { id: "goblinArcher", name: "哥布林弓手", color: "#a27a4d", hp: 45, speed: 0.038, attack: 8, attackInterval: 1.1, castleDamage: 1, range: 0.46, tags: ["ranged"] },
  shaman: { id: "shaman", name: "苔角薩滿", color: "#789f68", hp: 55, speed: 0.03, attack: 5, attackInterval: 1.4, castleDamage: 1, tags: ["healer"] },
  bomber: { id: "bomber", name: "爆彈怪", color: "#d8794f", hp: 42, speed: 0.052, attack: 10, attackInterval: 1.1, castleDamage: 2, tags: ["bomber"] },
  eliteGiant: { id: "eliteGiant", name: "苔岩巨人", color: "#66835f", hp: 320, speed: 0.022, attack: 15, attackInterval: 1.45, castleDamage: 4, tags: ["elite"] },
  boss: { id: "boss", name: "碎骰巨靈", color: "#5c4b9d", hp: 720, speed: 0.018, attack: 19, attackInterval: 1.3, castleDamage: 6, tags: ["boss", "elite"] },
};

export const DICE_COMBINATIONS: Record<DiceCombinationKind, DiceCombination> = {
  NONE: { kind: "NONE", label: "無組合", priority: 0, description: "獲得 1 點召喚能量" },
  PAIR: { kind: "PAIR", label: "一對", priority: 1, description: "隨機召喚 1 名 T1 英雄" },
  TWO_PAIR: { kind: "TWO_PAIR", label: "兩對", priority: 2, description: "隨機召喚 2 名 T1 英雄" },
  THREE_KIND: { kind: "THREE_KIND", label: "三條", priority: 3, description: "選擇 1 種英雄召喚" },
  SMALL_STRAIGHT: { kind: "SMALL_STRAIGHT", label: "小順子", priority: 4, description: "本波全體攻速 +20%" },
  LARGE_STRAIGHT: { kind: "LARGE_STRAIGHT", label: "大順子", priority: 5, description: "本波攻擊 +25%、攻速 +15%" },
  FULL_HOUSE: { kind: "FULL_HOUSE", label: "葫蘆", priority: 6, description: "免費升階 1 名可升級英雄" },
  FOUR_KIND: { kind: "FOUR_KIND", label: "四條", priority: 7, description: "發動隊長技能" },
  FIVE_KIND: { kind: "FIVE_KIND", label: "五條", priority: 8, description: "發動全畫面必殺技" },
};

export const TALENTS: TalentDefinition[] = [
  { id: "reroll-plus", name: "靈巧指節", description: "重骰次數 +1。", rarity: "common", maxStacks: 2, effect: "extra-reroll" },
  { id: "free-reroll", name: "第一次免費", description: "每波第一次重骰不消耗次數。", rarity: "rare", maxStacks: 1, effect: "free-first-reroll" },
  { id: "six-power", name: "六面加護", description: "每顆 6 使全隊攻擊 +5%。", rarity: "rare", maxStacks: 3, effect: "six-power" },
  { id: "pair-safety", name: "幸運保底", description: "無組合保底提前 1 回合。", rarity: "common", maxStacks: 1, effect: "pair-safety" },
  { id: "straight-call", name: "行軍節拍", description: "小順子額外召喚 1 名英雄。", rarity: "rare", maxStacks: 1, effect: "small-straight-summon" },
  { id: "pair-echo", name: "成對回響", description: "一對有 20% 機率多召喚 1 名。", rarity: "common", maxStacks: 2, effect: "pair-extra-summon" },
  { id: "merge-burst", name: "升階衝擊", description: "合成 T2 時對全場造成 36 傷害。", rarity: "rare", maxStacks: 2, effect: "merge-damage" },
  { id: "third-act", name: "終幕呼喚", description: "合成 T3 時隨機召喚 1 名 T1。", rarity: "epic", maxStacks: 1, effect: "t3-summon" },
  { id: "merge-shield", name: "聚光護幕", description: "合成後英雄獲得 22 護盾。", rarity: "common", maxStacks: 3, effect: "merge-shield" },
  { id: "quick-start", name: "首演捷徑", description: "本局第一次合成只需 2 名。", rarity: "epic", maxStacks: 1, effect: "two-merge" },
  { id: "t1-tempo", name: "新兵節奏", description: "T1 英雄攻速 +15%。", rarity: "common", maxStacks: 2, effect: "t1-speed" },
  { id: "t3-force", name: "金冠決意", description: "T3 英雄攻擊 +30%。", rarity: "rare", maxStacks: 2, effect: "t3-attack" },
  { id: "firecraft", name: "餘燼工坊", description: "火焰傷害 +25%。", rarity: "common", maxStacks: 3, effect: "fire-damage" },
  { id: "shield-wall", name: "鋼鐵陣列", description: "騎士阻擋數 +1。", rarity: "rare", maxStacks: 2, effect: "knight-block" },
  { id: "eagle-eye", name: "翠羽瞄準", description: "弓手暴擊率 +15%。", rarity: "common", maxStacks: 2, effect: "archer-crit" },
  { id: "morning-light", name: "曙光祈願", description: "祭司治療量 +30%。", rarity: "common", maxStacks: 3, effect: "priest-heal" },
  { id: "triad", name: "三色合鳴", description: "隊伍有 3 種職業時，全隊攻擊 +15%。", rarity: "epic", maxStacks: 1, effect: "three-job-attack" },
  { id: "neighbor-chorus", name: "相鄰合奏", description: "同職相鄰時，各自攻速 +10%。", rarity: "rare", maxStacks: 3, effect: "neighbor-speed" },
];

export const WAVES: WaveDefinition[] = [
  { wave: 1, title: "初幕：小小來客", enemies: [{ enemyId: "slime", count: 5 }], rewardTalent: false },
  { wave: 2, title: "疾步穿行", enemies: [{ enemyId: "slime", count: 4 }, { enemyId: "wolf", count: 3 }], rewardTalent: false },
  { wave: 3, title: "林間騷動", enemies: [{ enemyId: "slime", count: 5 }, { enemyId: "wolf", count: 4 }], rewardTalent: true },
  { wave: 4, title: "精英：苔岩巨人", enemies: [{ enemyId: "eliteGiant", count: 1 }, { enemyId: "shieldSoldier", count: 3 }], rewardTalent: false },
  { wave: 5, title: "盾陣推進", enemies: [{ enemyId: "shieldSoldier", count: 4 }, { enemyId: "goblinArcher", count: 3 }], rewardTalent: false },
  { wave: 6, title: "灼熱行軍", enemies: [{ enemyId: "bomber", count: 4 }, { enemyId: "shaman", count: 2 }, { enemyId: "wolf", count: 4 }], rewardTalent: true },
  { wave: 7, title: "長路混戰", enemies: [{ enemyId: "slime", count: 5 }, { enemyId: "goblinArcher", count: 4 }, { enemyId: "shieldSoldier", count: 3 }], rewardTalent: false },
  { wave: 8, title: "破陣的火花", enemies: [{ enemyId: "bomber", count: 5 }, { enemyId: "wolf", count: 5 }, { enemyId: "shaman", count: 2 }], rewardTalent: false },
  { wave: 9, title: "精英：巨人再臨", enemies: [{ enemyId: "eliteGiant", count: 1 }, { enemyId: "goblinArcher", count: 4 }, { enemyId: "shieldSoldier", count: 4 }], rewardTalent: true },
  { wave: 10, title: "終幕：碎骰巨靈", enemies: [{ enemyId: "boss", count: 1 }, { enemyId: "wolf", count: 4 }, { enemyId: "bomber", count: 3 }], rewardTalent: false },
];
