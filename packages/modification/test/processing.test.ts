import type { PathSelector } from "@org/modification/models/configuration"
import { ConfigurationId } from "@org/modification/models/configuration"
import { ClassNameAttribute } from "@org/modification/models/dom"
import type { ChangeDefinition } from "@org/modification/models/modification"
import { Applied, Initial, Orphaned, Stale } from "@org/modification/models/states"
import * as App from "@org/modification/program"
import { DOMParser } from "linkedom"
import crypto from "node:crypto"

const document = (new DOMParser()).parseFromString("<html />", "text/html")

describe("merge new matched hosts with already applied", () => {
  const config1 = ConfigurationId.unsafeMake(crypto.randomUUID())
  const pathSelector1 = NonEmptyImmutableArray.make<PathSelector[]>(
    ClassNameAttribute({ value: "targetClassname", selector: "className" })
  )
  const newHost = document.createElement("div") as unknown as Element
  const someHost = document.createElement("div") as unknown as Element
  const someChange: ChangeDefinition = ClassNameAttribute({
    selector: "className",
    value: "someValue"
  })

  it("marks new hosts as initial", () => {
    const result = App.mergeHosts(
      Chunk.empty(),
      Chunk.from([Initial({
        instance: {
          id: config1,
          path: pathSelector1,
          host: newHost,
          outputChange: someChange,
          inputChange: Maybe.none
        }
      })])
    )
    assert.deepEqual(
      result,
      Chunk.from([Initial({
        instance: {
          id: config1,
          path: pathSelector1,
          host: newHost,
          outputChange: someChange,
          inputChange: Maybe.none
        }
      })]),
      "not a list of Initial"
    )
  })
  it("marks hosts that exist in both matches as stale", () => {
    const result = App.mergeHosts(
      Chunk.from([Applied({
        instance: {
          id: config1,
          path: pathSelector1,
          host: someHost,
          outputChange: someChange,
          inputChange: Maybe.none
        }
      })]),
      Chunk.from([Initial({
        instance: {
          id: config1,
          path: pathSelector1,
          host: someHost,
          outputChange: someChange,
          inputChange: Maybe.none
        }
      })])
    )
    assert.deepEqual(
      result,
      Chunk.from([Stale({
        instance: {
          id: config1,
          path: pathSelector1,
          host: someHost,
          outputChange: someChange,
          inputChange: Maybe.none
        }
      })]),
      "not a list of Stale"
    )
  })
  it("marks hosts that no longer match selector as Orphaned", () => {
    const result = App.mergeHosts(
      Chunk.from([Applied({
        instance: {
          id: config1,
          path: pathSelector1,
          host: someHost,
          outputChange: someChange,
          inputChange: Maybe.none
        }
      })]),
      Chunk.empty()
    )
    assert.deepEqual(
      result,
      Chunk.from([Orphaned({
        instance: {
          id: config1,
          path: pathSelector1,
          host: someHost,
          outputChange: someChange,
          inputChange: Maybe.none
        }
      })]),
      "not a list of Orphaned"
    )
  })
})
