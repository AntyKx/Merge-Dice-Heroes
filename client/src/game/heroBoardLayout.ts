/** 英雄舞台：idle 主體決定待機與普攻的固定尺度；skill 另採特效安全變換，避免魔法被裁切。 */
import type { HeroId } from './types';

export type HeroBoardLayout = { scale: number; shiftX: number; shiftY: number };

export const HERO_BOARD_LAYOUT: Partial<Record<HeroId, Record<'idle' | 'attack' | 'skill', HeroBoardLayout>>> = 
{
  "fireMage": {
    "idle": {
      "scale": 2,
      "shiftX": 4,
      "shiftY": 20
    },
    "attack": {
      "scale": 2,
      "shiftX": 4,
      "shiftY": 20
    },
    "skill": {
      "scale": 2,
      "shiftX": 4,
      "shiftY": 20
    }
  },
  "knight": {
    "idle": {
      "scale": 2.2,
      "shiftX": 0,
      "shiftY": 20
    },
    "attack": {
      "scale": 2.2,
      "shiftX": 0,
      "shiftY": 20
    },
    "skill": {
      "scale": 2.5,
      "shiftX": 0,
      "shiftY": 60
    }
  },
  "priest": {
    "idle": {
      "scale": 2.3,
      "shiftX": 2,
      "shiftY": 20
    },
    "attack": {
      "scale": 2.3,
      "shiftX": 2,
      "shiftY": 20
    },
    "skill": {
      "scale": 1.8,
      "shiftX": 2,
      "shiftY": 20
    }
  },
  "ranger": {
    "idle": {
      "scale": 2.3,
      "shiftX": 4,
      "shiftY": 20
    },
    "attack": {
      "scale": 2.3,
      "shiftX": 4,
      "shiftY": 20
    },
    "skill": {
      "scale": 1.65,
      "shiftX": 4,
      "shiftY": 20
    }
  },
  "engineer": {
    "idle": {
      "scale": 2.3,
      "shiftX": 6,
      "shiftY": 20
    },
    "attack": {
      "scale": 2.3,
      "shiftX": 6,
      "shiftY": 20
    },
    "skill": {
      "scale": 1.75,
      "shiftX": 6,
      "shiftY": 20
    }
  },
  "deathKnight": {
    "idle": {
      "scale": 2.15,
      "shiftX": 6,
      "shiftY": 20
    },
    "attack": {
      "scale": 2.15,
      "shiftX": 6,
      "shiftY": 20
    },
    "skill": {
      "scale": 1.8,
      "shiftX": 6,
      "shiftY": 20
    }
  },
  "bard": {
    "idle": {
      "scale": 2,
      "shiftX": 10,
      "shiftY": 20
    },
    "attack": {
      "scale": 2,
      "shiftX": 10,
      "shiftY": 20
    },
    "skill": {
      "scale": 1.75,
      "shiftX": 10,
      "shiftY": 20
    }
  },
  "fighter": {
    "idle": {
      "scale": 2.15,
      "shiftX": 2,
      "shiftY": 20
    },
    "attack": {
      "scale": 2.15,
      "shiftX": 2,
      "shiftY": 20
    },
    "skill": {
      "scale": 1.8,
      "shiftX": 2,
      "shiftY": 20
    }
  },
  "frostQueen": {
    "idle": {
      "scale": 1.85,
      "shiftX": 0,
      "shiftY": 20
    },
    "attack": {
      "scale": 1.85,
      "shiftX": 0,
      "shiftY": 20
    },
    "skill": {
      "scale": 1.85,
      "shiftX": 0,
      "shiftY": 20
    }
  },
  "assassin": {
    "idle": {
      "scale": 2.1,
      "shiftX": 4,
      "shiftY": 20
    },
    "attack": {
      "scale": 2.1,
      "shiftX": 4,
      "shiftY": 20
    },
    "skill": {
      "scale": 2.1,
      "shiftX": 4,
      "shiftY": 20
    }
  }
} as const;
