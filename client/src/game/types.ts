export type HeroId = "knight" | "fireMage" | "archer" | "priest" | "ranger" | "engineer" | "deathKnight" | "bard" | "fighter" | "frostQueen" | "assassin";
export type EnemyId =
  | "slime"
  | "wolf"
  | "shieldSoldier"
  | "goblinArcher"
  | "shaman"
  | "bomber"
  | "eliteGiant"
  | "boss";

export type HeroTier = 1 | 2 | 3;
export type TalentRarity = "common" | "rare" | "epic";
export type EquipmentSlot = "weapon" | "armor" | "relic";
export type EquipmentId = "morningBlade" | "watcherCloak" | "fateDiceBox";
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
