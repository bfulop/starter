import { AccessDOM } from "@org/modification/adapters/DOM"
import type {
  AppliedModification,
  CurrentState,
  ModificationDefinition,
  ModificationDefinitions
} from "@org/modification/models/modification"
import { INITIAL, VERIFIED } from "@org/modification/models/modification"

export const program = Effect.sync(console.log("hello world"))

export function processModifications(
  modifDefinitions: ModificationDefinitions,
  currentState: CurrentState
): CurrentState {
  return currentState
}

export const mapToMatchingTargets = (modif: ModificationDefinition) =>
  Do(($) => {
    const accessDom = $(Effect.service(AccessDOM))
    return $(accessDom.getByHasAttribute(modif.path.last))
  })

export const mapModificationsToTargets = (modifications: Ref<ModificationDefinitions>) =>
  Do(($) => {
    const allModifications = $(modifications.get)
    return $(Effect.forEach(allModifications, mapToMatchingTargets))
  })

export const mergeModifTargetsToState = (state: CurrentState, modification: ModificationDefinition) =>
  Do(($) => {
    let newState: CurrentState = HashMap.empty()
    const modificationTargets = $(mapToMatchingTargets(modification))
    modificationTargets.forEach(domNode => {
      state
        .get(domNode)
        .map(activeModifs => {
          newState = newState.beginMutation
          const newActiveModification: AppliedModification = activeModifs[modification.id].map(x => ({
            ...x,
            state: VERIFIED
          })).getOrElse(() => ({
            ...modification,
            state: INITIAL
          }))
          const newActiveModifs = activeModifs.set(modification.id, newActiveModification)
          newState.set(domNode, newActiveModifs)
          newState = newState.endMutation
          return activeModifs
        })
        .getOrElse(
          () => {
            newState = newState.beginMutation
            newState.set(domNode, HashMap(Tuple(modification.id, { ...modification, state: INITIAL })))
            newState = newState.endMutation
          }
        )
    })
    return newState
  })

export const modificationsReducer = (
  currentState: CurrentState,
  modifications: Ref<ModificationDefinitions>
) =>
  Do(($) => {
    const allModifications = $(modifications.get)
    const result = allModifications.reduce<ModificationDefinition, CurrentState>(
      currentState,
      (state, modificatonDefinition) => {
        return currentState
      }
    )
    return result
  })
