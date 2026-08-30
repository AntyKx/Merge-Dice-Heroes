export type HeroId = "knight" | "fireMage" | "archer" | "priest" | "ranger" | "engineer" | "deathKnight" | "bard" | "fighter" | "frostQueen" | "assassin";
export type EnemyId =
  | "slime"
  | "wolf"
  | "shieldSoldier"
  | "goblinArcher"
  | "shaman"
  | "bomber"
  | "eliteGiant"
  | "boss"
  // 第二章 城外戰線．霧谷前線 (遠征輿圖 v1)
  | "mistStalker"
  | "mistbladeDuelist"
  | "ironwardenCommander"
  | "frostShaman"
  | "frostBomber"
  | "glacialColossus"
  | "fogSovereign"
  // 第三章 月影城垣．銀月守望 (遠征輿圖 v1)
  | "nightowlSniper"
  | "moonbladeRonin"
  | "siegeBombardier"
  | "haloCleric"
  | "moonfallCatapult"
  | "silverMoonEnforcer"
  | "silverMoonArbiter";

/** Three-chapter campaign per 遠征輿圖 v1 -- ids intentionally match
 * GameScreen.tsx's pre-existing CHAPTER_MAP_THEMES ids (courtyard/battlefield/
 * moonlit), which already carried the "霧谷前線"/"銀月守望" titles before any
 * chapter had real content behind it. */
export type ChapterId = "courtyard" | "battlefield" | "moonlit";
export const CHAPTER_IDS: readonly ChapterId[] = ["courtyard", "battlefield", "moonlit"];

export type HeroTier = 1 | 2 | 3;
export type TalentRarity = "common" | "rare" | "epic";
export type EquipmentSlot = "weapon" | "armor" | "relic";
export type EquipmentId =
  | "morningBlade" | "watcherCloak" | "fateDiceBox"
  // 共用武器 Shared Weapons
  | "ironedgeBlade" | "windrushEdge" | "killerInstinctSigil" | "dragonslayersMark" | "chainlightRod"
  // 共用護甲 Shared Armor
  | "stalwartBuckler" | "sacredDewVial" | "royalWardplate" | "mistweaveCloak" | "bastionHeart" | "vanguardBanner"
  // 共用遺物 Shared Relics
  | "nimbleToolkit" | "gluttonousCoinpurse" | "conscriptionOrder" | "fusionCatalyst" | "twinFateDice" | "gamblersReckoning"
  // 職業傾向裝備 Role-leaning Equipment
  | "vengeanceGauntlets" | "bulwarkOfTheVanguard"
  | "heavystrikeKnuckles" | "warfuryPlate"
  | "shadowstrikeDagger" | "cloakOfUmbra"
  | "farsightLens" | "quiverResupply"
  | "choristersStaff" | "vowScripture";
export type DailyQuestId = "battle" | "merge" | "victory";
export type DungeonId = "ruinCorridor" | "frostAltar" | "shadowTrial";
export type ShopOfferId = "forgeBundle" | "morningBladeOffer" | "watcherCloakOffer" | "fateDiceBoxOffer";
export type GamePhase =
  | "PREPARING"
  | "ROLLING"
  | "SELECTING_DICE"
  | "RESOLVING_DICE"
  | "MERGING"
  | "COMBAT"
  | "REWARD"
  | "WAVE_CLEAR"
  | "VICTORY"
  | "DEFEAT"
  | "PAUSED";

export type DiceCombinationKind =
  | "NONE"
  | "PAIR"
  | "TWO_PAIR"
  | "THREE_KIND"
  | "SMALL_STRAIGHT"
  | "LARGE_STRAIGHT"
  | "FULL_HOUSE"
  | "FOUR_KIND"
  | "FIVE_KIND";

export interface HeroDefinition {
  id: HeroId;
  name: string;
  classLabel: string;
  color: string;
  icon: string;
  range: number;
  attack: number;
  maxHp: number;
  attackInterval: number;
  role: "tank" | "area" | "single" | "support";
  tierNotes: Record<HeroTier, string>;
}

export interface HeroInstance {
  id: string;
  heroId: HeroId;
  tier: HeroTier;
  hp: number;
  maxHp: number;
  cooldown: number;
  attackCount: number;
  shield: number;
  speedBuff: number;
  attackBuff: number;
}

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  color: string;
  hp: number;
  speed: number;
  attack: number;
  attackInterval: number;
  castleDamage: number;
  range?: number;
  tags: Array<"ranged" | "shield" | "healer" | "bomber" | "elite" | "boss">;
}

export interface EnemyInstance {
  id: string;
  enemyId: EnemyId;
  hp: number;
  maxHp: number;
  pathProgress: number;
  cooldown: number;
  blockedBy?: string;
  phaseTwo?: boolean;
  dungeonSpeedMultiplier?: number;
}

export interface DiceState {
  values: number[];
  locked: boolean[];
  rerollsLeft: number;
  maxRerolls: number;
  noComboStreak: number;
  isRolling: boolean;
}

export interface DiceCombination {
  kind: DiceCombinationKind;
  label: string;
  priority: number;
  description: string;
}

export interface TalentDefinition {
  id: string;
  name: string;
  description: string;
  rarity: TalentRarity;
  maxStacks: number;
  effect: string;
}

export interface ActiveTalent {
  id: string;
  stacks: number;
}

export interface WaveDefinition {
  wave: number;
  title: string;
  enemies: Array<{ enemyId: EnemyId; count: number }>;
  rewardTalent: boolean;
}

export interface CombatState {
  castleHp: number;
  castleMaxHp: number;
  enemies: EnemyInstance[];
  pendingEnemies: EnemyId[];
  spawnCooldown: number;
  elapsed: number;
  defeated: number;
  damageEvents: DamageEvent[];
  lockedTile?: number;
  bossWarning?: string;
}

export interface DamageEvent {
  id: string;
  value: number;
  x: number;
  y: number;
  kind: "damage" | "heal" | "shield";
}

export interface RunState {
  phase: GamePhase;
  phaseBeforePause?: GamePhase;
  wave: number;
  selectedHeroes: HeroId[];
  leaderId: HeroId;
  board: Array<HeroInstance | null>;
  dice: DiceState;
  lastCombination?: DiceCombination;
  summonEnergy: number;
  recycleEnergy: number;
  activeTalents: ActiveTalent[];
  combat: CombatState;
  pendingHeroChoice: boolean;
  pendingFreeMerge: boolean;
  usedTwoMerge: boolean;
  talentChoices: TalentDefinition[];
  message: string;
  runId: number;
  equipmentBonuses: EquipmentBonuses;
  dungeonId?: DungeonId;
}

export interface EquipmentBonuses {
  attackMultiplier: number;
  castleBonus: number;
  extraRerolls: number;
  /** Weapon -- Attack Speed. */
  attackSpeedMultiplier: number;
  /** Weapon -- Critical. Chance in [0,1]. */
  critChance: number;
  /** Weapon -- Critical. Bonus damage fraction on a crit (0.5 = +50%). */
  critDamageMultiplier: number;
  /** Weapon -- Boss Damage. Bonus fraction vs "elite"/"boss"-tagged enemies. */
  bossDamageMultiplier: number;
  /** Armor -- HP. Team max-HP bonus fraction, applied when a hero is created. */
  hpMultiplier: number;
  /** Armor -- Recovery. Extra fraction restored on top of RUN_ENGINE_CONFIG.heroRecovery between Waves. */
  recoveryPctBonus: number;
  /** Armor -- Shield. Flat fraction of Castle max HP granted as Shield to every board hero when a Wave's combat starts. */
  shieldOnWaveStartPctCastleHp: number;
  /** Armor -- Damage Reduction. Fraction of incoming enemy damage negated before Shield/HP absorption. */
  damageReductionPct: number;
  /** Armor -- Block. Flat Block-capacity bonus for tank-role heroes already capable of blocking by position. */
  tankBlockCapacityBonus: number;
  /** Relic -- Reposition. Flat bonus to the per-Wave Reposition allowance. */
  repositionBonus: number;
  /** Relic -- Fate Energy. Flat bonus to the Run's Fate Energy cap. */
  fateEnergyMaxBonus: number;
  /** Relic -- Summon. Flat Fate Energy discount on Random Summon (floored at 0). */
  summonCostReduction: number;
  /** Relic -- Merge. Chance that completing a normal (3-hero) Merge grants a
   * follow-up free 2-hero Merge, reusing the same pendingFreeMerge flag Full
   * House already grants. */
  freeMergeChance: number;
  /** Relic -- Combo. Chance the chosen Dice Combo effect resolves as the next
   * tier up, among the kinds this exact hand already legitimately qualifies for. */
  comboUpgradeChance: number;
  /** Relic -- Lock. How many of the highest-value dice from the Wave's first
   * roll are protected from being selected for reroll. */
  protectedDieCount: number;
  /** Weapon -- Combat Style. Chance a landed Basic Attack also strikes a second
   * target in the same target pool for half damage. */
  chainLightningProcChance: number;
}

/** The 5 run-engine hero roles (run-engine/types.ts's HeroRole), duplicated here
 * deliberately -- this meta/lobby layer intentionally never imports run-engine
 * internals (see defaultMetaAdapter.ts's boundary doc comment); the two unions
 * are kept in sync by hand since role-leaning equipment needs to name a role. */
export type EquipmentRole = "tank" | "melee" | "assassin" | "ranged" | "support";

export interface EquipmentRoleBonus {
  role: EquipmentRole;
  /** Applied instead of the item's own (normally empty) bonuses when the current
   * run's selectedHeroes includes at least one hero of `role`. */
  bonus: Partial<EquipmentBonuses>;
  /** Applied when no hero of `role` is in selectedHeroes, so the equip slot is
   * never a complete waste when the "right" hero isn't in this run. */
  fallback: Partial<EquipmentBonuses>;
}

export interface EquipmentDefinition {
  id: EquipmentId;
  name: string;
  slot: EquipmentSlot;
  rarity: "普通" | "稀有" | "史詩";
  description: string;
  icon: string;
  bonuses: Partial<EquipmentBonuses>;
  upgradeBonus: Partial<EquipmentBonuses>;
  /** Role-leaning items (素材/軍需官密卷's 職業傾向裝備) carry their whole effect
   * here instead of in `bonuses`/`upgradeBonus` -- resolved once per run in
   * defaultMetaAdapter.ts against the run's selectedHeroes, never re-evaluated
   * mid-combat. Absent for ordinary shared equipment. */
  roleBonus?: EquipmentRoleBonus;
}

export interface ShopOfferDefinition {
  id: ShopOfferId;
  title: string;
  description: string;
  price: number;
  icon: string;
  reward: { materials?: number; equipmentId?: EquipmentId };
}

export interface ShopState {
  dayKey: string;
  offers: ShopOfferId[];
  purchased: ShopOfferId[];
  freeRefreshAvailable: boolean;
}

export interface DailyQuestDefinition {
  id: DailyQuestId;
  title: string;
  target: number;
  description: string;
  rewardCrystals: number;
}

export interface DailyQuestState {
  dayKey: string;
  battles: number;
  merges: number;
  victories: number;
  claimed: DailyQuestId[];
}

export interface HeroProgress {
  level: number;
  experience: number;
}

export type LobbyNoticeId = "equipment" | "shop" | "daily" | "dungeon";

export interface DungeonDefinition {
  id: DungeonId;
  title: string;
  description: string;
  energyCost: number;
  recommendedPower: number;
  startWave: number;
  reward: { crystals: number; equipmentId?: EquipmentId; label: string };
  enemyRule: { label: string; hpMultiplier: number; speedMultiplier: number };
  unlocked: boolean;
}

export interface PlayerProgress {
  playerName: string;
  wins: number;
  losses: number;
  bestWave: number;
  crystals: number;
  sigils: number;
  materials: number;
  stamina: number;
  inventory: EquipmentId[];
  equipmentLevels: Partial<Record<EquipmentId, number>>;
  equipped: Partial<Record<EquipmentSlot, EquipmentId>>;
  daily: DailyQuestState;
  dungeonClears: Partial<Record<DungeonId, number>>;
  shop: ShopState;
  lobbyRead: Partial<Record<LobbyNoticeId, boolean>>;
  heroProgress: Partial<Record<HeroId, HeroProgress>>;
  /** True once a chapter's final Wave (its Boss) has been beaten at least once --
   * the real unlock gate for the NEXT chapter, replacing the old wins/4 heuristic. */
  chaptersCleared: Partial<Record<ChapterId, boolean>>;
  /** Best Wave reached PER CHAPTER (Wave numbers reset 1-10 each chapter, so the
   * single global `bestWave` above can't tell which chapter's stage markers to
   * show as cleared in the chapter map). */
  bestWaveByChapter: Partial<Record<ChapterId, number>>;
  settings: {
    musicEnabled: boolean;
    sfxEnabled: boolean;
    vibrationEnabled: boolean;
  };
}

export interface RunModifiers {
  attackMultiplier: number;
  speedMultiplier: number;
  extraRerolls: number;
  freeFirstReroll: boolean;
  pairExtraSummonChance: number;
  smallStraightSummon: boolean;
  mergeDamage: number;
  mergeShield: number;
  knightBlockBonus: number;
  priestHealMultiplier: number;
  archerCritChance: number;
  fireDamageMultiplier: number;
}
