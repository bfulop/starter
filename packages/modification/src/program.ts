import { AccessDOM } from "@org/modification/adapters/DOM"
import type { CurrentState, ModificationDefinitions } from "@org/modification/models/modification"

export const program = Effect.sync(console.log("hello world"))

export function processModifications(
  modifDefinitions: ModificationDefinitions,
  currentState: CurrentState
): CurrentState {
  return currentState
}

export const expandModifications = (selector: string) =>
  Do(($) => {
    const dom = $(Effect.service(AccessDOM))
    const elements = $(dom.getByHasAttribute(selector))
    return elements
  })
