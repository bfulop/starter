import type { AppliedModifElement, CurrentState, ModificationDefinition } from "@org/modification/models/modification"
import * as App from "@org/modification/program"
import { expect } from "vitest"

describe("process modifications", () => {
  it("returns same", () => {
    const currentState: CurrentState = HashMap.from<AppliedModifElement, ModificationDefinition>(
      Collection.make(Tuple.make("what", { id: "err" }))
    )
    const result = App.processModifications(Chunk.empty(), currentState)
    expect(result).toEqual(currentState)
  })
})
