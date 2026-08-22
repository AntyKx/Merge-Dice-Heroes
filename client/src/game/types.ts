export type HeroId = "knight" | "fireMage" | "archer" | "priest";
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
}

export interface PlayerProgress {
  wins: number;
  losses: number;
  bestWave: number;
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
