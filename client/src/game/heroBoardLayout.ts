import type { HeroId } from './types';

export type HeroBoardLayout = { scale: number; shiftX: number; shiftY: number };

// Board composition: idle and attack share a measured footline; skills retain their safe effect offsets.
export const HERO_BOARD_LAYOUT: Partial<Record<HeroId, Record<'idle' | 'attack' | 'skill', HeroBoardLayout>>> = {
  fireMage: {
    idle: { scale: 2, shiftX: 4, shiftY: 17 },
    attack: { scale: 2, shiftX: 4, shiftY: 17 },
    skill: { scale: 2, shiftX: 4, shiftY: 20 },
  },
  knight: {
    idle: { scale: 2.2, shiftX: 0, shiftY: 20 },
    attack: { scale: 2.2, shiftX: 0, shiftY: 20 },
    skill: { scale: 2.5, shiftX: 0, shiftY: 60 },
  },
  priest: {
    idle: { scale: 2.3, shiftX: 2, shiftY: 26 },
    attack: { scale: 2.3, shiftX: 2, shiftY: 26 },
    skill: { scale: 2.3, shiftX: 2, shiftY: 20 },
  },
  ranger: {
    idle: { scale: 2.3, shiftX: 4, shiftY: 33 },
    attack: { scale: 2.3, shiftX: 4, shiftY: 33 },
    skill: { scale: 2.3, shiftX: 4, shiftY: 20 },
  },
  engineer: {
    idle: { scale: 2.3, shiftX: 6, shiftY: 31 },
    attack: { scale: 2.3, shiftX: 6, shiftY: 31 },
    skill: { scale: 2.3, shiftX: 6, shiftY: 20 },
  },
  deathKnight: {
    idle: { scale: 2.15, shiftX: 6, shiftY: 21 },
    attack: { scale: 2.15, shiftX: 6, shiftY: 21 },
    skill: { scale: 2.15, shiftX: 6, shiftY: 20 },
  },
  bard: {
    idle: { scale: 2, shiftX: 10, shiftY: 17 },
    attack: { scale: 2, shiftX: 10, shiftY: 17 },
    skill: { scale: 2, shiftX: 10, shiftY: 20 },
  },
  fighter: {
    idle: { scale: 2.15, shiftX: 2, shiftY: 18 },
    attack: { scale: 2.15, shiftX: 2, shiftY: 18 },
    skill: { scale: 2.15, shiftX: 2, shiftY: 20 },
  },
  frostQueen: {
    idle: { scale: 1.85, shiftX: 0, shiftY: 15 },
    attack: { scale: 1.85, shiftX: 0, shiftY: 15 },
    skill: { scale: 1.85, shiftX: 0, shiftY: 20 },
  },
  assassin: {
    idle: { scale: 2.1, shiftX: 4, shiftY: 18 },
    attack: { scale: 2.1, shiftX: 4, shiftY: 18 },
    skill: { scale: 2.1, shiftX: 4, shiftY: 20 },
  },
} as const;
