import { AccessDOM } from "@org/modification/adapters/dom"
import type { Configurations } from "@org/modification/models/configuration"
import type { AttributeNames } from "@org/modification/models/dom"
import type { Applied, InstancesState, OrphanedChecked } from "@org/modification/models/states"
import { Drop, Orphaned } from "@org/modification/models/states"
import { Tuple } from "@tsplus/stdlib/data/Tuple"

export function markDropInstances(node: ChildNode, instances: Chunk<OrphanedChecked>) {
  return Do(($) => {
    const { getAttribute } = $(Effect.service(AccessDOM))
    return $(
      instances
        .last
        .map(
          i =>
            getAttribute(node, i.instance.outputChange.selector)
              .map(attributeValue => attributeValue.value === i.instance.outputChange.value)
              .map(isMatching => isMatching ? instances : instances.map(i => Drop({ instance: i.instance })))
        )
        .getOrElse(() => Effect.succeedWith(() => instances))
    )
  })
}

export function markOrphanedInstances(
  configurations: Ref<Configurations>,
  instances: Chunk<Applied>
): Effect.UIO<Chunk<OrphanedChecked>> {
  return Do(($) => {
    const configs = $(configurations.get)
    return instances.reduce(Chunk.empty<OrphanedChecked>(), (acc, instance) => {
      const newElem = configs
        .find(c => c.id === instance.instance.id)
        .map(() =>
          acc.last.map(i =>
            Match.tag(i, {
              "Applied": () => instance,
              "Orphaned": () => Orphaned({ instance: instance.instance })
            })
          ).getOrElse(() => instance)
        ).getOrElse(() => Orphaned({ instance: instance.instance }))

      return acc.append(newElem)
    })
  })
}

export function markOrphanedTargets(configurations: Ref<Configurations>, targets: Map<AttributeNames, Chunk<Applied>>) {
  return Effect.forEach(
    targets.toImmutableArray,
    ([attribute, instances]) => markOrphanedInstances(configurations, instances).map(x => Tuple(attribute, x))
  )
}

export function markOrphaned(configurations: Ref<Configurations>, instances: InstancesState) {
  const newState = Effect.forEach(
    instances.toImmutableArray,
    ([node, targets]) => markOrphanedTargets(configurations, targets).map(x => Tuple(node, x))
  )

  return newState.map(x => Map.from(x))
}
