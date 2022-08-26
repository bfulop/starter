import { AccessDOM } from "@org/modification/adapters/dom"
import type { Configurations } from "@org/modification/models/configuration"
import type { AttributeNames, DomAttribute } from "@org/modification/models/dom"
import type { Applied, InstancesState, OrphanedChecked, OrphanedDropChecked } from "@org/modification/models/states"
import { Apply, Drop, Orphaned } from "@org/modification/models/states"
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

export function markDroppedTargets(
  node: ChildNode,
  targets: Map<AttributeNames, Chunk<OrphanedChecked>>
) {
  const newState = Effect.forEach(
    targets
      .toImmutableArray,
    ([attributeName, instances]) =>
      markDropInstances(node, instances).map(x => Tuple<[AttributeNames, Chunk<OrphanedDropChecked>]>(attributeName, x))
  )
  return newState.map(x => Map.from(x))
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
  const newState = Effect.forEach(
    targets.toImmutableArray,
    ([attribute, instances]) => markOrphanedInstances(configurations, instances).map(x => Tuple(attribute, x))
  )
  return newState.map(x => Map.from(x))
}

export function markOrphanedAndDrop(configurations: Ref<Configurations>, instances: InstancesState) {
  const newState = Effect.forEach(
    instances.toImmutableArray,
    ([node, targets]) =>
      markOrphanedTargets(configurations, targets)
        .map(x => Tuple(node, x))
  )
    .flatMap(x =>
      Effect.forEach(
        x,
        b =>
          markDroppedTargets(b[0], b[1])
            .map(x => Tuple(b.toNative[0], x))
      )
    )

  return newState.map(x => Map.from(x))
}

// finding all matched elements
// 1. easy: querySelector
// 2.
// → look up previous Instance.out
// → it must be Applied or toApply
// → add onto the ChildNode stack

export function addAllNewMatchedNodes(
  configurations: Configurations,
  instances: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropChecked>>>
) {
  return Do(($) => {
    const { getAttribute, getByHasAttribute } = $(Effect.service(AccessDOM))
    const newCandidates = $(
      Effect.forEach(
        configurations,
        configuration =>
          getByHasAttribute(configuration.path.last).map(nodes =>
            nodes.map(node => ({
              node,
              configuration
            }))
          )
      ).map(x => x.flatten)
    )
    // merge newCandidates with state
    // a. newCandidate arleady exist → update the chunk list, mark orphaned if necessary
    // b. does not exist → just add it
    const updatedInstances = instances.toImmutableArray.map(([node, targets]) => {
      const newTargets = newCandidates.find(candidate => candidate.node === node).map(candidate =>
        targets.map(([attributename, currentInstances]) => {
          if (candidate.configuration.path.last.selector === attributename) {
            let foundPosition = false
            const newStack = currentInstances.reduce(Chunk.empty<OrphanedDropChecked>(), (instAcc, currInst) => {
              if (foundPosition) {
                return instAcc.append(currInst)
              }
              // 1. check if the current instance is in a following configuration (push the candidate before it)
              const candidatePosition = configurations.indexWhere(c => c.id === candidate.configuration.id)
              const currInstPosition = configurations.indexWhere(c => c.id === currInst.instance.id)
              const inputChange: Maybe<DomAttribute> = instAcc.last.map(a => a.instance.outputChange).orElse(() =>
                getAttribute(node, attributename)
              )
              if (candidatePosition < currInstPosition) {
                // 2. if the previous output change matches the candidate base target → can push it
                instAcc.append(Apply({ instance: { ...candidate.configuration, inputChange } }))
                foundPosition = true
              } else {
                return instAcc.append(currInst)
              }

              // 2. instert it, check output against currInst → mark it drop if does not match
            })
            return Tuple(attributename, newStack)
          } else {
            return Tuple(attributename, currentInstances)
          }
        })
      )
    })
    // const newState = instances.toImmutableArray.m
  })
}
