/**
 * Board helpers (Phase 4), per 玩法核心.txt 四、五.
 *
 * Structural guarantee that "怪物永遠不會走進 4×4 棋盤": BoardState.cells is typed
 * Partial<Record<CellKey, HeroInstance>> (see types.ts) -- EnemyInstance has no
 * `cell` field and there is no function anywhere in run-engine/** that could place
 * one into a board cell. This is enforced by the type system, not just convention;
 * board.test.ts asserts it explicitly for documentation/regression purposes.
 */
import type { BoardCell, BoardState, BoardRow, DefenseZone, HeroInstance } from "../types";
import { ALL_DEFENSE_ZONES, BOARD_ROWS, boardCellKey } from "../types";

type CellKey = ReturnType<typeof boardCellKey>;

export function adjacentZones(zone: DefenseZone): DefenseZone[] {
  return ALL_DEFENSE_ZONES.filter((candidate) => Math.abs(candidate - zone) === 1);
}

/** Zones reachable from `zone` within `span` steps (span=1 -> just [zone]). */
export function zonesWithinSpan(zone: DefenseZone, span: number): DefenseZone[] {
  return ALL_DEFENSE_ZONES.filter((candidate) => Math.abs(candidate - zone) < span);
}

export function cellsInZone(board: BoardState, zone: DefenseZone): Array<{ cellKey: CellKey; hero: HeroInstance }> {
  return BOARD_ROWS.flatMap((row) => {
    const cellKey = boardCellKey({ zone, row });
    const hero = board.cells[cellKey];
    return hero ? [{ cellKey, hero }] : [];
  });
}

export function cellsInRow(board: BoardState, row: BoardRow): Array<{ cellKey: CellKey; hero: HeroInstance }> {
  return ALL_DEFENSE_ZONES.flatMap((zone) => {
    const cellKey = boardCellKey({ zone, row });
    const hero = board.cells[cellKey];
    return hero ? [{ cellKey, hero }] : [];
  });
}

export function allOccupiedCells(board: BoardState): Array<{ cellKey: CellKey; cell: BoardCell; hero: HeroInstance }> {
  const entries: Array<{ cellKey: CellKey; cell: BoardCell; hero: HeroInstance }> = [];
  ALL_DEFENSE_ZONES.forEach((zone) => BOARD_ROWS.forEach((row) => {
    const cellKey = boardCellKey({ zone, row });
    const hero = board.cells[cellKey];
    if (hero) entries.push({ cellKey, cell: { zone, row }, hero });
  }));
  return entries;
}
