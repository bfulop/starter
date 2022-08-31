import { AccessDOM } from "@org/modification/adapters/DOM"
import type { Configuration, Configurations } from "@org/modification/models/configuration"
import type { AttributeNames, DomAttribute } from "@org/modification/models/dom"
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
          // current instance comes before in configs list
          // or is orphaned (no longer in config list)
          // ignore it
          const isOrphanedInstance = acc.last.flatMap(i =>
            attributeConfigs.findIndex(conf => i.instance.id === conf.id)
          ).map(
            lastIndex =>
              attributeConfigs.findIndex(conf => instance.instance.id === conf.id).map(currentIndex =>
                currentIndex <= lastIndex
              )
                // current instance is orphaned
                .getOrElse(() => true)
          ).getOrElse(() => false)
          if (isOrphanedInstance) return acc
          // find a config that comes after and has the same input as the last output
          // AND the next in the stack is not this one
          const newInstance = attributeConfigs
            .findIndex(conf => conf.id === instance.instance.id)
            .map((startIndex) => attributeConfigs.takeRight(attributeConfigs.size - startIndex - 1))
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
                return isChained.map(i => acc.append(i)).getOrElse(() => acc)
              })
            )
            .map(x => x.prepend(instance))
            .getOrElse(() => Chunk(instance))

          return acc.concat(newInstance)
        })
        return Tuple(attributeName, newStack)
      })
      const what = Map.from(newTargets)
      return acc.set(node, what)
    }
  )
  return newState
}

export function mergeNewNodeMatchesToState(
  configurations: Configurations,
  instances: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropApply>>>
) {
  return Do(($) => {
    const { getAttribute, getByHasAttribute } = $(Effect.service(AccessDOM))
    const newNodeMatches = Effect.forEach(
      configurations,
      (config) => getByHasAttribute(config.path.last).map(nodes => nodes.map(node => ({ node, configuration: config })))
    )
      .map(x => x.flatten)
      .map(x =>
        x.reduce(instances, (acc, { configuration, node }) =>
          Maybe
            .fromNullable(acc.get(node))
            .map(targets =>
              targets.set(
                configuration.outputChange.selector,
                Chunk(
                  Apply({
                    instance: { ...configuration, inputChange: getAttribute(node, configuration.outputChange.selector) }
                  })
                )
              )
            )
            .map(targets => acc.set(node, targets))
            .getOrElse(() =>
              acc.set(
                node,
                Map.from<AttributeNames, Chunk<Apply>>([
                  Tuple(
                    configuration.outputChange.selector,
                    Chunk(
                      Apply({
                        instance: {
                          ...configuration,
                          inputChange: getAttribute(node, configuration.outputChange.selector)
                        }
                      })
                    )
                  )
                ])
              )
            ))
      )

    return $(newNodeMatches)
  })
}

export function validateSelector(
  configurations: Configurations,
  targetConfiguration: Configuration,
  targetAttributeValue: DomAttribute
) {
  return (compareTarget: Either<Maybe<DomAttribute>, Chunk<OrphanedDropApply>>) => {
    return compareTarget
      .map((activeInstances) => {
        const targetPosition = configurations.indexWhere(conf => conf.id === targetConfiguration.id)
        return activeInstances
          .filter(inst => configurations.indexWhere(conf => conf.id === inst.instance.id) < targetPosition)
          .find(inst => inst.instance.outputChange.value === targetAttributeValue.value)
          .map(() => true)
          .getOrElse(() => false)
      })
      .getOrElse(domAttr =>
        domAttr.map((currentAttributeValue) => targetAttributeValue.value === currentAttributeValue.value).getOrElse(
          () => false
        )
      )
  }
}

export function validateInstancePath(
  configurations: Configurations,
  instance: Apply | Applied,
  node: ChildNode,
  currentState: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropApply>>>
) {
  return Do(($) => {
    const { getAttribute, getParent } = $(Effect.service(AccessDOM))
    const result = instance.instance.path
      .take(instance.instance.path.size - 1)
      .reduce({ currentNode: getParent(node), isValid: false }, ({ currentNode, isValid }, currentTargetSelector) => {
        if (isValid === true) return { currentNode, isValid }
        let targetNode = currentNode
        let matchesSelector = false
        while (targetNode.isSome() && matchesSelector === false) {
          const targetNodeSome = targetNode.value
          const targetStack = Maybe
            .fromNullable(currentState.get(targetNodeSome))
            .flatMap(targets => Maybe.fromNullable(targets.get(currentTargetSelector.selector)))

          matchesSelector = validateSelector(configurations, instance.instance, currentTargetSelector)(Either.fromMaybe(
            targetStack,
            () => getAttribute(targetNodeSome, currentTargetSelector.selector)
          ))

          if (matchesSelector === false) targetNode = getParent(targetNode.value)
        }
        return { currentNode: targetNode, isValid: matchesSelector }
      })
    return result.isValid
  })
}
