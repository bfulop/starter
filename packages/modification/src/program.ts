import { checkInitial, checkOrphaned, checkStale, matchConfigHosts } from "@org/modification/domQueries"
import type { Configurations } from "@org/modification/models/configuration"
import type { AppliedInstances, ApplyAble, Candidates, MatchedInstances } from "@org/modification/models/states"
import { candidateInstancesEq, Initial, Orphaned, Stale } from "@org/modification/models/states"

export interface MergeHosts {
  (applied: AppliedInstances, latest: Chunk<Initial>): Chunk<MatchedInstances>
}
export const mergeHosts: MergeHosts = (applied, latest) => {
  const initial: Chunk<Initial> = latest.difference<Candidates>(candidateInstancesEq, applied).map(({ instance }) =>
    Initial({ instance })
  )
  const stale: Chunk<Stale> = applied.intersection<Candidates>(candidateInstancesEq, latest).map(({ instance }) =>
    Stale({ instance })
  )
  const orphaned: Chunk<Orphaned> = applied.difference<Candidates>(candidateInstancesEq, latest).map(({ instance }) =>
    Orphaned({ instance })
  )
  return initial.concat(stale).concat(orphaned)
}

export function prepareConfigsToApply(configs: Ref<Configurations>, instances: AppliedInstances) {
  return Do(($) => {
    const configurations = $(configs.get)

    const res = Effect.forEach(configurations, (a) => matchConfigHosts(instances, a))
      .map(x => x.flatten)
      .map(x => mergeHosts(instances, x))
      .flatMap(x =>
        Effect.forEach(x, (b) =>
          Match.tag(b, {
            Initial: checkInitial,
            Stale: checkStale,
            Orphaned: checkOrphaned
          }))
      )
      .map((x): Chunk<ApplyAble> =>
        x.collect(i =>
          Match.tag(i, {
            Apply: a => Maybe.some(a),
            Rollback: a => Maybe.some(a),
            Applied: a => Maybe.some(a),
            Drop: () => Maybe.none
          })
        )
      )
      .map(x => x)
    return res
  })
}
