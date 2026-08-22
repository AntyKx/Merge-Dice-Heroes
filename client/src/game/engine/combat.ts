import { ENEMIES, HEROES, WAVES } from "../config";
import type { CombatState, EnemyId, EnemyInstance, HeroInstance, RunModifiers, RunState } from "../types";

let enemySequence = 0;
let eventSequence = 0;

const cloneHero = (hero: HeroInstance | null) => (hero ? { ...hero } : null);
const cloneEnemy = (enemy: EnemyInstance) => ({ ...enemy });

export function makeCombatState(wave: number, castleBonus = 0): CombatState {
  const definition = WAVES[wave - 1];
  const pendingEnemies = definition.enemies.flatMap(({ enemyId, count }) => Array.from({ length: count }, () => enemyId));
  const castleMaxHp = 20 + castleBonus;
  return { castleHp: castleMaxHp, castleMaxHp, enemies: [], pendingEnemies, spawnCooldown: 0.25, elapsed: 0, defeated: 0, damageEvents: [] };
}

function createEnemy(enemyId: EnemyId, wave: number): EnemyInstance {
  const definition = ENEMIES[enemyId];
  const scale = 1 + Math.max(0, wave - 1) * 0.115;
  enemySequence += 1;
  return { id: `${enemyId}-${enemySequence}`, enemyId, hp: Math.round(definition.hp * scale), maxHp: Math.round(definition.hp * scale), pathProgress: 0.02, cooldown: 0 };
}

export function getRunModifiers(run: RunState): RunModifiers {
  const stacks = (id: string) => run.activeTalents.find((talent) => talent.id === id)?.stacks ?? 0;
  const jobs = new Set(run.board.filter(Boolean).map((hero) => hero?.heroId));
  return {
    attackMultiplier: 1 + run.equipmentBonuses.attackMultiplier + stacks("t3-force") * 0.3 + (jobs.size >= 3 ? stacks("triad") * 0.15 : 0),
    speedMultiplier: 1 + stacks("t1-tempo") * 0.15,
    extraRerolls: run.equipmentBonuses.extraRerolls + stacks("reroll-plus"),
    freeFirstReroll: stacks("free-reroll") > 0,
    pairExtraSummonChance: stacks("pair-echo") * 0.2,
    smallStraightSummon: stacks("straight-call") > 0,
    mergeDamage: stacks("merge-burst") * 36,
    mergeShield: stacks("merge-shield") * 22,
    knightBlockBonus: stacks("shield-wall"),
    priestHealMultiplier: 1 + stacks("morning-light") * 0.3,
    archerCritChance: stacks("eagle-eye") * 0.15,
    fireDamageMultiplier: 1 + stacks("firecraft") * 0.25,
  };
}

function boardPosition(index: number) {
  return { x: 0.14 + (index % 4) * 0.24, y: 0.58 + Math.floor(index / 4) * 0.11 };
}

function pushEvent(combat: CombatState, value: number, x: number, y: number, kind: "damage" | "heal" | "shield") {
  eventSequence += 1;
  combat.damageEvents.push({ id: `event-${eventSequence}`, value: Math.round(value), x, y, kind });
}

function getHeroAttack(hero: HeroInstance, modifiers: RunModifiers): number {
  const definition = HEROES[hero.heroId];
  const tierPower = hero.tier === 1 ? 1 : hero.tier === 2 ? 2.15 : 4.05;
  const tierTalent = hero.tier === 3 ? modifiers.attackMultiplier : 1;
  return definition.attack * tierPower * (1 + hero.attackBuff) * tierTalent;
}

function getHeroInterval(hero: HeroInstance, modifiers: RunModifiers): number {
  const definition = HEROES[hero.heroId];
  let speed = 1 + hero.speedBuff;
  if (hero.tier === 1) speed += (modifiers.speedMultiplier - 1) + 0.15 * 0;
  return definition.attackInterval / Math.max(0.5, speed);
}

function findTarget(hero: HeroInstance, enemies: EnemyInstance[]): EnemyInstance | undefined {
  const definition = HEROES[hero.heroId];
  const inRange = enemies.filter((enemy) => enemy.pathProgress >= 1 - definition.range);
  const candidates = inRange.length ? inRange : enemies.filter((enemy) => enemy.pathProgress >= 0.45);
  if (!candidates.length) return undefined;
  return [...candidates].sort((a, b) => b.pathProgress - a.pathProgress)[0];
}

function damageEnemy(enemy: EnemyInstance, rawDamage: number) {
  const shielded = ENEMIES[enemy.enemyId].tags.includes("shield");
  enemy.hp -= shielded ? rawDamage * 0.72 : rawDamage;
}

export function advanceCombat(run: RunState, delta: number, random: () => number = Math.random): RunState {
  if (run.phase !== "COMBAT") return run;
  const modifiers = getRunModifiers(run);
  const board = run.board.map(cloneHero);
  const combat: CombatState = {
    ...run.combat,
    enemies: run.combat.enemies.map(cloneEnemy),
    pendingEnemies: [...run.combat.pendingEnemies],
    damageEvents: [],
  };
  combat.elapsed += delta;
  combat.spawnCooldown -= delta;
  if (combat.pendingEnemies.length && combat.spawnCooldown <= 0) {
    const nextId = combat.pendingEnemies.shift();
    if (nextId) combat.enemies.push(createEnemy(nextId, run.wave));
    combat.spawnCooldown = 0.74;
  }

  board.forEach((hero) => { if (hero) hero.cooldown -= delta; });
  combat.enemies.forEach((enemy) => { enemy.cooldown -= delta; });

  const knightSlots = board.flatMap((hero, index) => hero?.heroId === "knight" || hero?.heroId === "deathKnight" ? [index] : []);
  const blockCapacity = knightSlots.reduce((total, index) => total + (board[index]?.tier ?? 0) + modifiers.knightBlockBonus, 0);
  const nearbyEnemies = combat.enemies.filter((enemy) => enemy.pathProgress >= 0.81 && enemy.hp > 0);
  nearbyEnemies.slice(0, blockCapacity).forEach((enemy, index) => { enemy.blockedBy = board[knightSlots[index % Math.max(1, knightSlots.length)]]?.id; });
  combat.enemies.forEach((enemy) => { if (!nearbyEnemies.includes(enemy)) enemy.blockedBy = undefined; });

  board.forEach((hero, index) => {
    if (!hero || hero.cooldown > 0 || hero.hp <= 0) return;
    hero.cooldown = getHeroInterval(hero, modifiers);
    const position = boardPosition(index);

    if (hero.heroId === "priest" || hero.heroId === "bard") {
      const targets = board
        .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
        .filter(({ candidate }) => candidate && candidate.hp > 0 && candidate.hp < candidate.maxHp)
        .sort((a, b) => (a.candidate!.hp / a.candidate!.maxHp) - (b.candidate!.hp / b.candidate!.maxHp))
        .slice(0, hero.tier >= 2 ? 2 : 1);
      targets.forEach(({ candidate, candidateIndex }) => {
        const heal = (hero.heroId === "bard" ? 10 + hero.tier * 7 : 14 + hero.tier * 8) * modifiers.priestHealMultiplier;
        candidate!.hp = Math.min(candidate!.maxHp, candidate!.hp + heal);
        if ((hero.heroId === "priest" && hero.tier === 3) || (hero.heroId === "bard" && hero.tier >= 2)) candidate!.speedBuff = Math.max(candidate!.speedBuff, hero.heroId === "bard" ? 0.16 : 0.18);
        const targetPosition = boardPosition(candidateIndex);
        pushEvent(combat, heal, targetPosition.x, targetPosition.y, "heal");
      });
      return;
    }

    const target = findTarget(hero, combat.enemies);
    if (!target) return;
    hero.attackCount += 1;
    let damage = getHeroAttack(hero, modifiers);
    if (hero.heroId === "fireMage") damage *= modifiers.fireDamageMultiplier;
    if (hero.heroId === "archer" && random() < modifiers.archerCritChance + (hero.tier === 3 ? 0.16 : 0)) damage *= 1.9;
    damageEnemy(target, damage);
    pushEvent(combat, damage, target.pathProgress, 0.26 + target.pathProgress * 0.42, "damage");

    if (hero.heroId === "fireMage" && hero.tier >= 2) {
      combat.enemies.filter((enemy) => enemy.id !== target.id && Math.abs(enemy.pathProgress - target.pathProgress) < 0.12).slice(0, hero.tier === 3 ? 2 : 1).forEach((enemy) => damageEnemy(enemy, damage * (hero.tier === 3 ? 0.65 : 0.42)));
    }
    if (hero.heroId === "archer" && hero.tier >= 2 && hero.attackCount % 4 === 0) {
      combat.enemies.filter((enemy) => enemy.id !== target.id && enemy.pathProgress < target.pathProgress).slice(0, 2).forEach((enemy) => damageEnemy(enemy, damage * 0.55));
    }
    if (hero.heroId === "ranger" && hero.tier >= 2 && hero.attackCount % 3 === 0) {
      combat.enemies.filter((enemy) => enemy.id !== target.id && enemy.pathProgress < target.pathProgress).slice(0, hero.tier === 3 ? 3 : 1).forEach((enemy) => damageEnemy(enemy, damage * 0.62));
    }
    if ((hero.heroId === "engineer" || hero.heroId === "frostQueen") && hero.tier >= 2) {
      combat.enemies.filter((enemy) => enemy.id !== target.id && Math.abs(enemy.pathProgress - target.pathProgress) < 0.14).slice(0, hero.tier === 3 ? 2 : 1).forEach((enemy) => damageEnemy(enemy, damage * (hero.tier === 3 ? 0.68 : 0.44)));
    }
    if (hero.heroId === "assassin" && hero.tier >= 2 && hero.attackCount % (hero.tier === 3 ? 2 : 3) === 0) damageEnemy(target, damage * 0.75);
    if (hero.heroId === "deathKnight" && hero.tier === 3 && hero.attackCount % 4 === 0) {
      hero.shield += 14;
      pushEvent(combat, 14, position.x, position.y, "shield");
    }
    if (hero.heroId === "knight" && hero.tier === 3 && hero.attackCount % 4 === 0) {
      hero.shield += 18;
      pushEvent(combat, 18, position.x, position.y, "shield");
    }
  });

  const deadEnemies = combat.enemies.filter((enemy) => enemy.hp <= 0);
  deadEnemies.forEach((enemy) => {
    combat.defeated += 1;
    if (ENEMIES[enemy.enemyId].tags.includes("bomber")) {
      board.forEach((hero, index) => {
        if (!hero) return;
        hero.hp -= 8;
        const position = boardPosition(index);
        pushEvent(combat, 8, position.x, position.y, "damage");
      });
    }
  });
  combat.enemies = combat.enemies.filter((enemy) => enemy.hp > 0);

  combat.enemies.forEach((enemy) => {
    const definition = ENEMIES[enemy.enemyId];
    if (enemy.enemyId === "boss" && !enemy.phaseTwo && enemy.hp <= enemy.maxHp * 0.5) {
      enemy.phaseTwo = true;
      combat.lockedTile = Math.floor(random() * 16);
      combat.bossWarning = "巨靈暴走！一格棋盤被震封。";
      board.forEach((hero, index) => {
        if (!hero) return;
        hero.hp -= 9;
        const position = boardPosition(index);
        pushEvent(combat, 9, position.x, position.y, "damage");
      });
    }
    if (definition.tags.includes("healer") && enemy.cooldown <= 0) {
      const ally = [...combat.enemies].filter((candidate) => candidate.id !== enemy.id && candidate.hp < candidate.maxHp).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (ally) ally.hp = Math.min(ally.maxHp, ally.hp + 14 + run.wave * 2);
      enemy.cooldown = definition.attackInterval;
    }
    if (enemy.enemyId === "boss" && enemy.phaseTwo && enemy.cooldown <= 0 && combat.pendingEnemies.length < 2) {
      combat.pendingEnemies.push("slime");
    }

    const heroTarget = board.find((hero) => hero?.id === enemy.blockedBy) ?? (definition.tags.includes("ranged") && enemy.pathProgress >= 0.45 ? [...board].filter(Boolean).sort((a, b) => (a!.hp / a!.maxHp) - (b!.hp / b!.maxHp))[0] : undefined);
    if (heroTarget && enemy.cooldown <= 0) {
      const rawDamage = definition.attack * (enemy.phaseTwo ? 1.2 : 1);
      const absorbed = Math.min(heroTarget.shield, rawDamage);
      heroTarget.shield -= absorbed;
      heroTarget.hp -= rawDamage - absorbed;
      const index = board.findIndex((hero) => hero?.id === heroTarget.id);
      const position = boardPosition(index);
      pushEvent(combat, rawDamage, position.x, position.y, "damage");
      enemy.cooldown = definition.attackInterval;
    }
    if (!enemy.blockedBy) {
      enemy.pathProgress += definition.speed * delta * (enemy.phaseTwo ? 1.7 : 1);
    }
  });

  const reachedCastle = combat.enemies.filter((enemy) => enemy.pathProgress >= 1);
  reachedCastle.forEach((enemy) => { combat.castleHp -= ENEMIES[enemy.enemyId].castleDamage; });
  combat.enemies = combat.enemies.filter((enemy) => enemy.pathProgress < 1);
  board.forEach((hero) => { if (hero) { hero.hp = Math.max(0, hero.hp); hero.speedBuff = Math.max(0, hero.speedBuff - delta * 0.02); } });

  if (combat.castleHp <= 0) return { ...run, board, combat: { ...combat, castleHp: 0 }, phase: "DEFEAT", message: "城堡崩塌了……調整陣容，再試一次！" };
  if (!combat.enemies.length && !combat.pendingEnemies.length) return { ...run, board, combat, phase: WAVES[run.wave - 1].rewardTalent ? "REWARD" : "WAVE_CLEAR", message: WAVES[run.wave - 1].rewardTalent ? "戰場安靜下來。選擇一項舞台強化。" : "波次完成！整理骰子，迎接下一幕。" };
  return { ...run, board, combat };
}
