import { AccessDOM } from "@org/modification/adapters/DOM"
import type { Configuration, Configurations } from "@org/modification/models/configuration"
import type { AttributeNames } from "@org/modification/models/dom"
import type {
  Applied,
  InstancesState,
  OrphanedChecked,
  OrphanedDropApply,
  OrphanedDropChecked
} from "@org/modification/models/states"
import { Apply, Drop, Orphaned } from "@org/modification/models/states"
import { Tuple } from "@tsplus/stdlib/data/Tuple"

export function markDropInstances(node: ChildNode, instances: Chunk<OrphanedChecked>) {
  return Do(($) => {
    const { getAttribute } = $(Effect.service(AccessDOM))
    const result = instances
      .last
      .map(
        i =>
          getAttribute(node, i.instance.outputChange.selector)
            .map(attributeValue => attributeValue.value === i.instance.outputChange.value)
            .map(isMatching => isMatching ? instances : instances.map(i => Drop({ instance: i.instance })))
            .getOrElse(() => instances.map(i => Drop({ instance: i.instance })))
      )
      .getOrElse(() => instances)

    return result
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
export function mergeConfigurationsToState(
  configurations: Configurations,
  instances: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropChecked>>>
) {
  const newState = instances.reduce(
    Map.empty<ChildNode, Map<AttributeNames, Chunk<OrphanedDropApply>>>(),
    (acc, [node, targets]) => {
      const newTargets = targets.map(([attributeName, stack]) => {
        const attributeConfigs = configurations.filter(c => c.outputChange.selector === attributeName)
        const newStack = stack.reduce(Chunk.empty<OrphanedDropApply>(), (acc, instance) => {
          // find a config that comes after and has the same input as the last output
          // AND the next in the stack is not this one
          console.log("-- currentInstance", instance.instance.path.last.value)
          const newInstance = attributeConfigs
            .findIndex(conf => conf.id === instance.instance.id)
            .map(x => {
              console.log("startindex", x)
              return x
            })
            .map((startIndex) => {
              const res: Chunk<Configuration> = attributeConfigs.takeRight(attributeConfigs.size - startIndex - 1)
              return res
            })
            .map(nextConfigs =>
              nextConfigs.reduce(Chunk.empty<Apply>(), (acc, curr) => {
                const isChained = acc
                  .last
                  .flatMap(accLast =>
                    accLast.instance.outputChange === curr.path.last ? Maybe(accLast.instance.outputChange) : Maybe.none
                  )
                  .orElse(
                    instance.instance.outputChange === curr.path.last ?
                      Maybe(instance.instance.outputChange) :
                      Maybe.none
                  )
                  .map(inputChange => Apply({ instance: { ...curr, inputChange: Maybe(inputChange) } }))
                // .map(x => x)
                return isChained.map(i => acc.append(i)).getOrElse(() => acc)
              })
            )
            .map(x => {
              console.log("here")
              x.map(b => {
                console.log("&&&&", b)
              })
              return x
            })
            .getOrElse(() => Chunk(instance))
          const res = acc.concat(newInstance)
          console.log("^^^^^^")
          res.forEach(x => console.log("acc", x.instance.path.last.value))
          console.log("^^^^^^")
          return res
        })
        return Tuple(attributeName, newStack)
      })
      const what = Map.from(newTargets)
      return acc.set(node, what)
    }
  )
  return newState
}

// export function addAllNewMatchedNodes(
//   configurations: Configurations,
//   instances: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropChecked>>>
// ) {
//   return Do(($) => {
//     const { getAttribute, getByHasAttribute } = $(Effect.service(AccessDOM))
//     const newCandidates = $(
//       Effect.forEach(
//         configurations,
//         configuration =>
//           getByHasAttribute(configuration.path.last).map(nodes =>
//             nodes.map(node => ({
//               node,
//               configuration
//             }))
//           )
//       ).map(x => x.flatten)
//     )
//     const updatedHosts = instances.toImmutableArray.map(([node, targets]) => {
//       const newTargets = targets.toImmutableArray.map(([attribute, configs]) => {
//         const newStack = configs.reduce(Chunk.empty<OrphanedDropApply>(), (accInst, currInst) => {
//           const currInstPosition = configurations.indexWhere(c => c.id === currInst.instance.id)
//           const inputChange: Maybe<DomAttribute> = currInst.last.map(a => a.instance.outputChange).orElse(() =>
//             getAttribute(node, attribute)
//           )
//           const previousCandidate = configurations.reduceWithIndex(Maybe.empty<Apply>(), (index, found, config) => {
//             return found.isNone() ?
//               index < currInstPosition ? Maybe.some(Apply({ instance: { ...config, inputChange } })) : Maybe.none :
//               Maybe.none
//           })
//         })
//         // const newHosts =  configurations.reduce(Chunk.empty<OrphanedDropChecked>(), (acc, curr) => {

//         // })
//       })
//     })
//     // merge newCandidates with state
//     // a. newCandidate arleady exist → update the chunk list, mark orphaned if necessary
//     // b. does not exist → just add it
//     const updatedInstances = instances.toImmutableArray.map(([node, targets]) => {
//       const newTargets = newCandidates.find(candidate => candidate.node === node)
//         // new candidate is attached to an already existing node, update it
//         .map(candidate =>
//           targets.map(([attributename, currentInstances]) => {
//             // targeting the same attribute
//             if (candidate.configuration.path.last.selector === attributename) {
//               let foundPosition = false
//               const newStack = currentInstances.reduce(Chunk.empty<OrphanedDropChecked>(), (instAcc, currInst) => {
//                 if (foundPosition) {
//                   return instAcc.append(Orphaned(currInst))
//                 }
//                 // 1. check if the current instance is in a following configuration (push the candidate before it)
//                 const candidatePosition = configurations.indexWhere(c => c.id === candidate.configuration.id)
//                 const currInstPosition = configurations.indexWhere(c => c.id === currInst.instance.id)
//                 const inputChange: Maybe<DomAttribute> = instAcc.last.map(a => a.instance.outputChange).orElse(() =>
//                   getAttribute(node, attributename)
//                 )
//                 if (candidatePosition < currInstPosition) {
//                   foundPosition = true
//                   // 2. if the previous output change matches the candidate base target → can push it
//                   // otherwise the candidate is not targeting the same modification
//                   return inputChange.mapNullable(a => a === candidate.configuration.path.last ? a : null).map(() => {
//                     return instAcc.append(Apply({ instance: { ...candidate.configuration, inputChange } })).append(
//                       Orphaned(currInst)
//                     )
//                   })
//                 } else {
//                   return instAcc.append(currInst)
//                 }
//               })
//               return Tuple(attributename, newStack)
//             } else {
//               return Tuple(attributename, currentInstances)
//             }
//           })
//         )
//         .map(x => Map.from(x))
//         // new candidate is NOT attached to an existing node
//         .getOrElse(() => targets)
//       return Tuple(node, newTargets)
//     })

//     const newInstances = newCandidates.filter(candidate =>
//       updatedInstances.filter(([node]) => node === candidate.node).size === 0
//     ).map(({ configuration, node }) =>
//       Tuple(node, Map(Tuple(configuration.outputChange.selector, Chunk(Apply({ instance: configuration })))))
//     )
//   })
// }
