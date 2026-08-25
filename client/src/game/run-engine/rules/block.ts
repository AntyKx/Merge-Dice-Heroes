/**
 * Block / Intercept rules (Phase 4), per 玩法核心.txt 八.
 *
 * Block assignment is recomputed fresh from the current board each combat tick
 * (see the Phase 6 combat loop) rather than incrementally mutated -- so "坦克倒地:
 * 目前被該坦克阻擋的敵人恢復移動" falls out for free: a downed hero simply isn't
 * included in `providers` on the next tick, so nothing keeps referencing it as a
 * blocker. `previousAssignments` is only an optional continuity hint (prefer
 * keeping an enemy on the same blocker when possible) so blockedBy doesn't flicker
 * between equally-eligible heroes tick to tick.
 */
import type { BlockRule, BoardCell, DefenseZone } from "../types";
import { ALL_DEFENSE_ZONES } from "../types";

export function getEffectiveBlockCapacity(cell: BoardCell, blockRule: BlockRule): number {
  return blockRule.baseCapacity * (blockRule.rowCapacityMultiplier[cell.row] ?? 0);
}

export interface BlockProvider {
  instanceId: string;
  zone: DefenseZone;
  /** Already resolved via getEffectiveBlockCapacity() -- this module stays
   * HeroDefinition-agnostic, matching the merge.ts buildUpgraded pattern. */
  capacity: number;
}

export interface BlockTarget {
  instanceId: string;
  occupiedZones: DefenseZone[];
  blockCost: number;
  pathProgress: number;
}

/** Maps blocked EnemyInstance.instanceId -> blocking HeroInstance.instanceId.
 * Enemies not present in the returned Map are unblocked and continue moving --
 * "如果英雄 Block 已滿，多出來的怪繼續沿道路往城堡" (八). */
export function computeBlockAssignments(providers: BlockProvider[], targets: BlockTarget[], previousAssignments: ReadonlyMap<string, string> = new Map()): Map<string, string> {
  const assignments = new Map<string, string>();
  const remainingCapacity = new Map(providers.map((provider) => [provider.instanceId, provider.capacity] as const));
  const blockedInstanceIds = new Set<string>();

  ALL_DEFENSE_ZONES.forEach((zone) => {
    const zoneProviders = providers.filter((provider) => provider.zone === zone && (remainingCapacity.get(provider.instanceId) ?? 0) > 0);
    if (!zoneProviders.length) return;

    const zoneTargets = targets
      .filter((target) => !blockedInstanceIds.has(target.instanceId) && target.occupiedZones.includes(zone))
      .sort((a, b) => {
        const aSticky = zoneProviders.some((provider) => provider.instanceId === previousAssignments.get(a.instanceId)) ? 1 : 0;
        const bSticky = zoneProviders.some((provider) => provider.instanceId === previousAssignments.get(b.instanceId)) ? 1 : 0;
        if (aSticky !== bSticky) return bSticky - aSticky;
        return b.pathProgress - a.pathProgress;
      });

    zoneTargets.forEach((target) => {
      const stickyProviderId = previousAssignments.get(target.instanceId);
      const sticky = stickyProviderId ? zoneProviders.find((candidate) => candidate.instanceId === stickyProviderId && (remainingCapacity.get(candidate.instanceId) ?? 0) >= target.blockCost) : undefined;
      const provider = sticky ?? zoneProviders.find((candidate) => (remainingCapacity.get(candidate.instanceId) ?? 0) >= target.blockCost);
      if (!provider) return;
      remainingCapacity.set(provider.instanceId, (remainingCapacity.get(provider.instanceId) ?? 0) - target.blockCost);
      assignments.set(target.instanceId, provider.instanceId);
      blockedInstanceIds.add(target.instanceId);
    });
  });

  return assignments;
}
