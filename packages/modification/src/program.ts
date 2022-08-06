import type { CurrentState, ModificationDefinitions } from "@org/modification/models/modification"

export const program = Effect.sync(console.log("hello world"))

export function processModifications(
  modifDefinitions: ModificationDefinitions,
  currentState: CurrentState
): CurrentState {
  return currentState
}
