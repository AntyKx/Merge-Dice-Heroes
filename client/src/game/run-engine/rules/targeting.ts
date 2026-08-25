/**
 * Attack / Support targeting rules (Phase 4), per 玩法核心.txt 九.
 *
 * Enemy-facing coverage (getEnemyTargetPool) and ally-facing coverage
 * (getSupportTargets) are deliberately separate functions -- Support explicitly
 * should NOT be Route-based ("不要主要依敵軍道路判定"), so it never touches
 * RouteState at all, only board adjacency.
 */
import type { AttackCoverageRule, BoardCell, BoardState, DefenseZone, EnemyInstance, HeroInstance, RouteState, SupportRangeRule } from "../types";
import { ALL_DEFENSE_ZONES, BOARD_ROWS, boardCellKey } from "../types";
import { zonesWithinSpan } from "./board";

type CellKey = ReturnType<typeof boardCellKey>;

/** Zones a hero standing at `cell` can reach with attacks/effects. Empty for
 * "auraOnly" heroes (pure Support -- they never target enemies). */
export function getAttackCoverage(cell: BoardCell, coverage: AttackCoverageRule): DefenseZone[] {
  if (coverage.kind === "auraOnly") return [];
  return zonesWithinSpan(cell.zone, coverage.maxZoneSpan);
}

/** All enemies currently reachable by a hero at `cell` with the given coverage +
 * route-distance range. Width>=2/4 enemies are included if ANY of their
 * occupiedRoutes falls in the coverage zones -- they are one EnemyInstance, never
 * split, so this simply de-duplicates by instanceId. */
export function getEnemyTargetPool(cell: BoardCell, coverage: AttackCoverageRule, rangeAlongRoute: number, routes: RouteState[]): EnemyInstance[] {
  const zones = new Set(getAttackCoverage(cell, coverage));
  if (!zones.size) return [];
  const minPathProgress = 1 - rangeAlongRoute;
  const seen = new Set<string>();
  const pool: EnemyInstance[] = [];
  routes.forEach((route) => {
    if (!route.active) return;
    route.enemies.forEach((enemy) => {
      if (seen.has(enemy.instanceId)) return;
      if (enemy.pathProgress < minPathProgress) return;
      if (!enemy.occupiedRoutes.some((routeId) => zones.has(routeId))) return;
      seen.add(enemy.instanceId);
      pool.push(enemy);
    });
  });
  return pool;
}

function rowIndex(row: BoardCell["row"]): number {
  return BOARD_ROWS.indexOf(row);
}

/** Board cells (with their occupying hero) reachable by a Support at `cell` per its
 * SupportRangeRule. Never includes `cell` itself. */
export function getSupportTargets(cell: BoardCell, board: BoardState, rule: SupportRangeRule): Array<{ cellKey: CellKey; hero: HeroInstance }> {
  const selfKey = boardCellKey(cell);
  const candidates: Array<{ cellKey: CellKey; hero: HeroInstance }> = [];
  ALL_DEFENSE_ZONES.forEach((zone) => BOARD_ROWS.forEach((row) => {
    const key = boardCellKey({ zone, row });
    if (key === selfKey) return;
    const hero = board.cells[key];
    if (!hero) return;
    const inRange = (() => {
      switch (rule.kind) {
        case "adjacentCell": return Math.abs(zone - cell.zone) <= 1 && Math.abs(rowIndex(row) - rowIndex(cell.row)) <= 1;
        case "sameRow": return row === cell.row;
        case "sameZone": return zone === cell.zone;
        case "radiusCells": return Math.max(Math.abs(zone - cell.zone), Math.abs(rowIndex(row) - rowIndex(cell.row))) <= rule.radius;
        case "auraAll": return true;
      }
    })();
    if (inRange) candidates.push({ cellKey: key, hero });
  }));
  return candidates;
}
