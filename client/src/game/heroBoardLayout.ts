/** 英雄舞台：由原始透明輪廓量測產生，讓每個動作填滿角色區但保留血條與施法安全區。 */
import type { HeroId } from './types';

export type HeroBoardLayout = { scale: number; shiftY: number };

export const HERO_BOARD_LAYOUT: Partial<Record<HeroId, Record<'idle' | 'attack' | 'skill', HeroBoardLayout>>> = 
{
  "fireMage": {
    "idle": {
      "scale": 2.61,
      "shiftY": -3.5
    },
    "attack": {
      "scale": 2.33,
      "shiftY": 1.2
    },
    "skill": {
      "scale": 1.6,
      "shiftY": 3.3
    }
  },
  "knight": {
    "idle": {
      "scale": 3.24,
      "shiftY": -16.7
    },
    "attack": {
      "scale": 2.09,
      "shiftY": 1.7
    },
    "skill": {
      "scale": 1.77,
      "shiftY": -6.2
    }
  },
  "priest": {
    "idle": {
      "scale": 2.19,
      "shiftY": -3.8
    },
    "attack": {
      "scale": 1.79,
      "shiftY": -13.7
    },
    "skill": {
      "scale": 1.68,
      "shiftY": 0.9
    }
  },
  "ranger": {
    "idle": {
      "scale": 3.24,
      "shiftY": -5.9
    },
    "attack": {
      "scale": 1.98,
      "shiftY": 4.5
    },
    "skill": {
      "scale": 1.62,
      "shiftY": 11.0
    }
  },
  "engineer": {
    "idle": {
      "scale": 3.51,
      "shiftY": -8.3
    },
    "attack": {
      "scale": 2.17,
      "shiftY": 11.1
    },
    "skill": {
      "scale": 1.6,
      "shiftY": 14.0
    }
  },
  "deathKnight": {
    "idle": {
      "scale": 3.35,
      "shiftY": -20.0
    },
    "attack": {
      "scale": 2.63,
      "shiftY": -3.8
    },
    "skill": {
      "scale": 1.72,
      "shiftY": 1.4
    }
  },
  "bard": {
    "idle": {
      "scale": 2.61,
      "shiftY": -11.1
    },
    "attack": {
      "scale": 1.64,
      "shiftY": 9.3
    },
    "skill": {
      "scale": 1.7,
      "shiftY": -3.1
    }
  },
  "fighter": {
    "idle": {
      "scale": 3.51,
      "shiftY": -3.9
    },
    "attack": {
      "scale": 2.44,
      "shiftY": 8.5
    },
    "skill": {
      "scale": 1.6,
      "shiftY": 14.0
    }
  },
  "frostQueen": {
    "idle": {
      "scale": 2.28,
      "shiftY": -15.1
    },
    "attack": {
      "scale": 1.73,
      "shiftY": -7.6
    },
    "skill": {
      "scale": 1.6,
      "shiftY": -6.7
    }
  },
  "assassin": {
    "idle": {
      "scale": 2.28,
      "shiftY": -5.6
    },
    "attack": {
      "scale": 1.65,
      "shiftY": -7.4
    },
    "skill": {
      "scale": 1.69,
      "shiftY": -0.0
    }
  }
} as const;
