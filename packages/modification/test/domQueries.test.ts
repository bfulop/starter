import { AccessDOM } from "@org/modification/adapters/dom"
import { matchNodeAttribute } from "@org/modification/domQueries"
import type { PathSelector } from "@org/modification/models/configuration"
import { ConfigurationId } from "@org/modification/models/configuration"
import { ClassNameAttribute } from "@org/modification/models/dom"
import type { ChangeDefinition } from "@org/modification/models/modification"
import { Drop } from "@org/modification/models/states"
import { DOMParser } from "linkedom"
import crypto from "node:crypto"

const document = (new DOMParser()).parseFromString("<html />", "text/html")
const someDomNode = document.createElement("div") as unknown as Element

const targetAttributeValue = "subjectValue"

export const makeLiveAccessDOM = (): AccessDOM => ({
  getByHasAttribute: () => Effect.succeedWith(() => Chunk.from([someDomNode])),
  getAttribute: () =>
    Effect.succeedWith(() => ClassNameAttribute({ selector: "className", value: targetAttributeValue }))
})

describe("matching a DOMNode attribute based on app state", () => {
  const subjectConfigPath = NonEmptyImmutableArray.make<PathSelector[]>(
    ClassNameAttribute({ selector: "className", value: "someClass" })
  )
  const subjectSelector: ClassNameAttribute = ClassNameAttribute({
    selector: "className",
    value: targetAttributeValue
  })

  const precedingConfigId = ConfigurationId.unsafeMake(crypto.randomUUID())
  // const followingConfigId = ConfigurationId.unsafeMake(crypto.randomUUID())

  it("uses actual attribute value when preceding is to Drop (ignore)", () => {
    const precedingChange: ChangeDefinition = ClassNameAttribute({
      selector: "className",
      value: "precedingValue"
    })
    const precedingInstance: Drop = Drop({
      instance: {
        host: someDomNode,
        id: precedingConfigId,
        path: subjectConfigPath,
        change: precedingChange
      }
    })
    const subject = matchNodeAttribute(
      subjectSelector,
      someDomNode,
      Maybe.some(precedingInstance),
      Maybe.none
    ).provideService(
      AccessDOM,
      makeLiveAccessDOM()
    )
    const result = subject.unsafeRunSync()
    assert.equal(result, true, "preceding instances modification is ignored")
  })
})
