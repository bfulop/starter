import type { Configuration, Configurations } from "@org/modification/models/configuration"
import type {
  AppliedInstances,
  CheckedInitial,
  CheckedStale,
  CheckedToRemove,
  Initial,
  MatchedInstances,
  Stale,
  ToRemove
} from "@org/modification/models/states"

export declare function matchConfigHosts(
  configuration: Configuration
): Chunk<Initial>

export declare function mergeHosts(applied: AppliedInstances, latest: Chunk<Initial>): Chunk<MatchedInstances>

export declare function checkInitial(candidates: Initial): CheckedInitial

export declare function checkStale(candidates: Stale): CheckedStale

export declare function checkToRemove(candidates: ToRemove): CheckedToRemove

export function prepareConfigsToApply(configs: Ref<Configurations>, instances: AppliedInstances) {
  return Do(($) => {
    const configurations = $(configs.get)
    return configurations
      .map(matchConfigHosts)
      .flatMap((x) => mergeHosts(instances, x))
      .map(x =>
        Match.tag(x, {
          Initial: checkInitial,
          Stale: checkStale,
          ToRemove: checkToRemove
        })
      )
  })
}
