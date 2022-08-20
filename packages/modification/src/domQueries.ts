import type { TargetConfigurations } from "@org/modification/adapters/configurations"
import { extendSelectors } from "@org/modification/adapters/configurations"
import type { DOMNode } from "@org/modification/adapters/dom"
import { AccessDOM } from "@org/modification/adapters/dom"
import type { Configuration, PathSelector, TargetPath } from "@org/modification/models/configuration"
import type { ClassNameAttribute } from "@org/modification/models/dom"
import type {
  AppliedInstances,
  CheckedInitial,
  CheckedPrecedingInstance,
  CheckedStale,
  CheckedToRemove,
  Orphaned,
  Stale,
  UnCheckedNextInstance
} from "@org/modification/models/states"
import { Initial } from "@org/modification/models/states"

export interface TestSelector {
  (selector: PathSelector, node: DOMNode): Effect<AccessDOM, never, Maybe<true>>
}
declare const testSelector: TestSelector

export interface TestPath {
  (targetPath: TargetPath, node: DOMNode): Effect<TestSelector, never, Maybe<DOMNode>>
}
export declare const testPath: TestPath

export interface MatchConfigHosts {
  (
    instances: AppliedInstances,
    configuration: Configuration
  ): Effect<TargetConfigurations | AccessDOM, never, Chunk<Initial>>
}

/**
 * Get all the possible host candidates from a configuration
 */
export const matchConfigHosts: MatchConfigHosts = (instances, configuration) => {
  return Do(($) => {
    const accessDom = $(Effect.service(AccessDOM))
    const naiveMatches = accessDom.getByHasAttribute(configuration.path.last)
    const correctedMatches = extendSelectors(configuration).flatMap(a =>
      Effect.forEach(a, x => accessDom.getByHasAttribute(x))
    )
      .map(x => x.flatten)
      .flatMap(x => naiveMatches.map(a => a.concat(x)))
      .map(x =>
        x.map(domNode =>
          Initial({
            instance: {
              host: domNode,
              inputChange: Maybe.none, // TODO: calculate input change
              ...configuration
            }
          })
        )
      )
    return $(correctedMatches)
  })
}

export interface CheckInitial {
  (c: Initial): Effect<AccessDOM & TestPath & TargetConfigurations, never, CheckedInitial>
}
export declare const checkInitial: CheckInitial

export interface CheckStale {
  (c: Stale): Effect<AccessDOM & TestPath & TargetConfigurations, never, CheckedStale>
}
export declare const checkStale: CheckStale

export interface CheckOrphaned {
  (c: Orphaned): Effect<AccessDOM & TestPath & TargetConfigurations, never, CheckedToRemove>
}
export declare const checkOrphaned: CheckOrphaned

export interface MatchNodeAttribute {
  (
    matchCondition: ClassNameAttribute,
    node: ChildNode,
    precedingInstance: Maybe<CheckedPrecedingInstance>,
    nextInstance: Maybe<UnCheckedNextInstance>
  ): Effect<AccessDOM, never, boolean>
}
export const matchNodeAttribute: MatchNodeAttribute = (matchCondition, node, precedingInstance, nextInstance) =>
  Do(($) => {
    const accessDom = $(Effect.service(AccessDOM))
    const currentAttributeValue = $(accessDom.getAttribute(node, matchCondition.selector))
    const failValue = { value: null }
    const considerFollowing = (following: Orphaned | Stale) =>
      following.instance.inputChange.map(identity).getOrElse(() => failValue)
    const targetAttributeValue = precedingInstance.map(t =>
      Match.tag(t, {
        Applied: () => currentAttributeValue,
        Apply: (preceding) => preceding.instance.outputChange,
        Drop: () =>
          nextInstance.map(n =>
            Match.tag(n, {
              Initial: () => currentAttributeValue,
              Orphaned: considerFollowing,
              Stale: considerFollowing
            })
          ).getOrElse(() => currentAttributeValue),
        Rollback: (preceding) => preceding.instance.inputChange.map(identity).getOrElse(() => failValue)
      })
    ).getOrElse(() =>
      nextInstance.map(n =>
        Match.tag(n, {
          Initial: () => currentAttributeValue,
          Orphaned: considerFollowing,
          Stale: considerFollowing
        })
      ).getOrElse(() => currentAttributeValue)
    )
    return matchCondition.value === targetAttributeValue.value
  })
