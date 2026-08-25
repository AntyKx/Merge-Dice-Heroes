/**
 * Board placement + Pending Zone rules (Phase 3), per 玩法核心.txt 十六.
 *
 * A new summon either goes straight onto a board cell the player picks (free, no
 * Reposition cost) or, if the board is full, into the Pending Zone (cap 2, Config:
 * pendingZoneCapacity). If Pending is already at capacity, summon resolution must
 * be BLOCKED -- routeNewSummon() never silently drops a hero, and combat cannot
 * start while Pending is non-empty (assertPendingResolvedBeforeCombat()).
 */
import type { BoardState, DefenseZone, BoardRow, HeroInstance, PendingZoneState } from "../types";
import { BOARD_ROWS, boardCellKey } from "../types";

type CellKey = ReturnType<typeof boardCellKey>;

const ALL_ZONES: DefenseZone[] = [1, 2, 3, 4];

export function emptyCellKeys(board: BoardState): CellKey[] {
  const keys: CellKey[] = [];
  ALL_ZONES.forEach((zone) => BOARD_ROWS.forEach((row: BoardRow) => {
    const key = boardCellKey({ zone, row });
    if (!board.cells[key]) keys.push(key);
  }));
  return keys;
}

export function hasEmptyCell(board: BoardState): boolean {
  return emptyCellKeys(board).length > 0;
}

export type SummonRouting = "chooseBoardCell" | "addToPending" | "blockedPendingFull";

/** Decides where a freshly-summoned hero should go WITHOUT placing it -- the actual
 * board cell is always the player's free choice (十七、Reposition 調度: new-summon
 * placement never costs a Reposition), so this only tells the caller which flow to
 * present next. */
export function routeNewSummon(board: BoardState, pending: PendingZoneState, capacity: number): SummonRouting {
  if (hasEmptyCell(board)) return "chooseBoardCell";
  if (pending.heroes.length < capacity) return "addToPending";
  return "blockedPendingFull";
}

export function placeOnBoard(board: BoardState, cellKey: CellKey, hero: HeroInstance): BoardState {
  if (board.cells[cellKey]) return board;
  return { cells: { ...board.cells, [cellKey]: { ...hero, cell: null } } };
}

/** No-ops (never drops the hero) if Pending is already at capacity -- callers must
 * check routeNewSummon() first; this is a defensive second guard. */
export function addToPending(pending: PendingZoneState, hero: HeroInstance, capacity: number): PendingZoneState {
  if (pending.heroes.length >= capacity) return pending;
  return { heroes: [...pending.heroes, hero] };
}

export function movePendingToBoard(pending: PendingZoneState, board: BoardState, instanceId: string, cellKey: CellKey): { pending: PendingZoneState; board: BoardState } {
  const hero = pending.heroes.find((candidate) => candidate.instanceId === instanceId);
  if (!hero || board.cells[cellKey]) return { pending, board };
  return {
    pending: { heroes: pending.heroes.filter((candidate) => candidate.instanceId !== instanceId) },
    board: placeOnBoard(board, cellKey, hero),
  };
}

export function removeFromPending(pending: PendingZoneState, instanceId: string): PendingZoneState {
  return { heroes: pending.heroes.filter((candidate) => candidate.instanceId !== instanceId) };
}

/** Combat must never start with anything still sitting in Pending. */
export function isPendingResolved(pending: PendingZoneState): boolean {
  return pending.heroes.length === 0;
}
