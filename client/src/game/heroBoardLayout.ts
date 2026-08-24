import type { HeroId } from './types';

export type HeroBoardLayout = { scale: number; shiftX: number; shiftY: number };

const IDENTITY: HeroBoardLayout = { scale: 1, shiftX: 0, shiftY: 0 };
const SKILL_FLOURISH: HeroBoardLayout = { scale: 1.12, shiftX: 0, shiftY: -4 };
// New supplied Death Knight artwork occupies a smaller, left-biased region of the untouched 620×540 source canvas.
// Keep one transform per action so pose framing can vary without the body scale jumping between frames.
const DEATH_KNIGHT_BOARD: HeroBoardLayout = { scale: 2.1, shiftX: 18, shiftY: 25 };
const DEATH_KNIGHT_SKILL: HeroBoardLayout = { scale: 1.92, shiftX: 18, shiftY: 18 };

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
  deathKnight: { idle: DEATH_KNIGHT_BOARD, attack: DEATH_KNIGHT_BOARD, skill: DEATH_KNIGHT_SKILL },
  bard: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
  fighter: { idle: IDENTITY, attack: IDENTITY, skill: SKILL_FLOURISH },
} as const;
