import { AccessDOM } from "@org/modification/adapters/DOM"
import type { AppliedModifElement, CurrentState, ModificationDefinition } from "@org/modification/models/modification"
import * as App from "@org/modification/program"
import { expect } from "vitest"

export const makeLiveAccessDOM = () => {
  return {
    getByHasAttribute: () => Effect.sync("elementArray")
  }
}

describe("process modifications", () => {
  it("returns same", () => {
    const currentState: CurrentState = HashMap.from<AppliedModifElement, ModificationDefinition>(
      Collection.make(Tuple.make("what", { id: "err" }))
    )
    const result = App.processModifications(Chunk.empty(), currentState)
    expect(result).toEqual(currentState)
  })

  it("expands modifications", async () => {
    const AccessDOMLive = Layer.fromValue(AccessDOM, makeLiveAccessDOM)
    const program = App.expandModifications(".myClass").provideSomeLayer(AccessDOMLive)
    const res = await program.unsafeRunPromiseExit()
    expect(res).toEqual(Exit.succeed("elementArray"))
  })
})
