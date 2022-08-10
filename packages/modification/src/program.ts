import { AccessDOM } from "@org/modification/adapters/DOM"
import type { Configuration, Configurations, CurrentState, Instance } from "@org/modification/models/modification"
import { INITIAL, TOVALIDATE } from "@org/modification/models/modification"

export const program = Effect.sync(console.log("hello world"))

export function processModifications(
  modifDefinitions: Configurations,
  currentState: CurrentState
): CurrentState {
  return currentState
}

export const mapToMatchingTargets = (modif: Configuration) =>
  Do(($) => {
    const accessDom = $(Effect.service(AccessDOM))
    return $(accessDom.getByHasAttribute(modif.path.last))
  })

export const mapModificationsToTargets = (modifications: Ref<Configurations>) =>
  Do(($) => {
    const allModifications = $(modifications.get)
    return $(Effect.forEach(allModifications, mapToMatchingTargets))
  })

export const mergeModifTargetsToState = (
  state: CurrentState,
  configuration: Configuration
): Effect<AccessDOM, never, CurrentState> =>
  Do(($) => {
    let newState: CurrentState = state
    const modificationTargets = $(mapToMatchingTargets(configuration))
    modificationTargets.forEach(domNode => {
      state
        .get(domNode)
        .map(hostInstances => {
          newState = newState.beginMutation
          const newInstance: Instance = hostInstances[configuration.id].map(x => ({
            ...x,
            state: TOVALIDATE
          })).getOrElse(() => ({
            ...configuration,
            state: INITIAL
          }))
          const newActiveModifs = hostInstances.set(configuration.id, newInstance)
          newState.set(domNode, newActiveModifs)
          newState = newState.endMutation
          return hostInstances
        })
        .getOrElse(
          () => {
            newState = newState.beginMutation
            newState.set(domNode, HashMap(Tuple(configuration.id, { ...configuration, state: INITIAL })))
            newState = newState.endMutation
          }
        )
    })
    return newState
  })

export const modificationsReducer = (
  currentState: CurrentState,
  modifications: Ref<Configurations>
) =>
  Do(($) => {
    const allModifications = $(modifications.get)
    const result = allModifications.reduce<Configuration, CurrentState>(
      currentState,
      (state, modificatonDefinition) => {
        return currentState
      }
    )
    return result
  })
