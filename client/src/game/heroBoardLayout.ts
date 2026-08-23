import type { HeroId } from './types';

export type HeroBoardLayout = { scale: number; shiftX: number; shiftY: number };

const IDENTITY: HeroBoardLayout = { scale: 1, shiftX: 0, shiftY: 0 };
const SKILL_FLOURISH: HeroBoardLayout = { scale: 1.12, shiftX: 0, shiftY: -4 };

// All ten heroes use locally rebuilt, foot- and center-locked fixed-canvas sheets
// (see client/public/heroes/): every frame is pasted so its alpha bbox bottom sits on the
// same canvas row and its bbox center sits on the same canvas column, so the default
// (identity) transform already aligns feet to the tile floor and centers the sprite in the
// grid cell. Skill gets a small flourish zoom/lift on top of that shared alignment.
export const HERO_BOARD_LAYOUT: Partial<Record<HeroId, Record<'idle' | 'attack' | 'skill', HeroBoardLayout>>> = {
  fireMage: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
  knight: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
  frostQueen: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
  assassin: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
  priest: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
  ranger: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
  engineer: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
  deathKnight: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
  bard: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
  fighter: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
} as const;
