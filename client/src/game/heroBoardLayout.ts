/** 英雄舞台：idle 主體決定待機與普攻的固定尺度；skill 另採特效安全變換，避免魔法被裁切。 */
import type { HeroId } from './types';

export type HeroBoardLayout = { scale: number; shiftX: number; shiftY: number };

export const HERO_BOARD_LAYOUT: Partial<Record<HeroId, Record<'idle' | 'attack' | 'skill', HeroBoardLayout>>> = 
{
  "fireMage": {
    "idle": {
      "scale": 2.61,
      "shiftX": 22.8,
      "shiftY": 58.9
    },
    "attack": {
      "scale": 2.61,
      "shiftX": 22.8,
      "shiftY": 58.9
    },
    "skill": {
      "scale": 1.6,
      "shiftX": 0.7,
      "shiftY": 27.3
    }
  },
  "knight": {
    "idle": {
      "scale": 1.34,
      "shiftX": 0,
      "shiftY": 0
    },
    "attack": {
      "scale": 1.24,
      "shiftX": -1.2,
      "shiftY": -1.8
    },
    "skill": {
      "scale": 1.12,
      "shiftX": -0.8,
      "shiftY": -3.6
    }
  },
  "priest": {
    "idle": {
      "scale": 2.19,
      "shiftX": -4.1,
      "shiftY": 41.8
    },
    "attack": {
      "scale": 2.19,
      "shiftX": -4.1,
      "shiftY": 41.8
    },
    "skill": {
      "scale": 1.68,
      "shiftX": -1.4,
      "shiftY": 28.1
    }
  },
  "ranger": {
    "idle": {
      "scale": 3.24,
      "shiftX": 6.7,
      "shiftY": 81.7
    },
    "attack": {
      "scale": 3.24,
      "shiftX": 6.7,
      "shiftY": 81.7
    },
    "skill": {
      "scale": 1.62,
      "shiftX": 0.7,
      "shiftY": 35.8
    }
  },
  "engineer": {
    "idle": {
      "scale": 3.51,
      "shiftX": 59.2,
      "shiftY": 90.1
    },
    "attack": {
      "scale": 3.51,
      "shiftX": 59.2,
      "shiftY": 90.1
    },
    "skill": {
      "scale": 1.6,
      "shiftX": 0.0,
      "shiftY": 38.0
    }
  },
  "deathKnight": {
    "idle": {
      "scale": 3.35,
      "shiftX": 0.0,
      "shiftY": 72.0
    },
    "attack": {
      "scale": 3.35,
      "shiftX": 0.0,
      "shiftY": 72.0
    },
    "skill": {
      "scale": 1.72,
      "shiftX": 2.2,
      "shiftY": 30.2
    }
  },
  "bard": {
    "idle": {
      "scale": 2.61,
      "shiftX": 2.2,
      "shiftY": 51.3
    },
    "attack": {
      "scale": 2.61,
      "shiftX": 2.2,
      "shiftY": 51.3
    },
    "skill": {
      "scale": 1.7,
      "shiftX": 3.5,
      "shiftY": 24.9
    }
  },
  "fighter": {
    "idle": {
      "scale": 3.51,
      "shiftX": -1.5,
      "shiftY": 94.5
    },
    "attack": {
      "scale": 3.51,
      "shiftX": -1.5,
      "shiftY": 94.5
    },
    "skill": {
      "scale": 1.6,
      "shiftX": 0.0,
      "shiftY": 38.0
    }
  },
  "frostQueen": {
    "idle": {
      "scale": 2.28,
      "shiftX": -0.5,
      "shiftY": 34.1
    },
    "attack": {
      "scale": 2.28,
      "shiftX": -0.5,
      "shiftY": 34.1
    },
    "skill": {
      "scale": 1.6,
      "shiftX": 1.7,
      "shiftY": 17.3
    }
  },
  "assassin": {
    "idle": {
      "scale": 2.28,
      "shiftX": 6.2,
      "shiftY": 43.6
    },
    "attack": {
      "scale": 2.28,
      "shiftX": 6.2,
      "shiftY": 43.6
    },
    "skill": {
      "scale": 1.69,
      "shiftX": 3.2,
      "shiftY": 27.6
    }
  }
} as const;
