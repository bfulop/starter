import { AccessDOM } from "@org/modification/adapters/dom"
import type { Configuration, PathSelector } from "@org/modification/models/configuration"
import { configuration, ConfigurationId } from "@org/modification/models/configuration"
import { ClassNameAttribute, DomAttribute } from "@org/modification/models/dom"
import { Applied, Drop, Orphaned } from "@org/modification/models/states"
import * as App from "@org/modification/program"
import { DOMParser } from "linkedom"
import crypto from "node:crypto"

describe("marking instances that have been removed from configurations list", () => {
  it("marks first orphaned instance", () => {
    const config1Id = ConfigurationId.unsafeMake(crypto.randomUUID())
    const config2Id = ConfigurationId.unsafeMake(crypto.randomUUID())
    const config3Id = ConfigurationId.unsafeMake(crypto.randomUUID())
    const targetPath = ClassNameAttribute({ selector: "className", value: "x" })
    const subjectConfigPath = NonEmptyImmutableArray.make<PathSelector[]>(targetPath)
    const config1: Configuration = configuration.make({
      id: config1Id,
      path: subjectConfigPath,
      outputChange: ClassNameAttribute({ selector: "className", value: "a" })
    })
    const config2: Configuration = configuration.make({
      id: config2Id,
      path: subjectConfigPath,
      outputChange: ClassNameAttribute({ selector: "className", value: "b" })
    })
    const config3: Configuration = configuration.make({
      id: config3Id,
      path: subjectConfigPath,
      outputChange: ClassNameAttribute({ selector: "className", value: "c" })
    })
    const instance1Conf = {
      instance: { ...config1, inputChange: Maybe(ClassNameAttribute({ selector: "className", value: "x" })) }
    }
    const appliedInstance1: Applied = Applied(instance1Conf)
    const instance2Conf = {
      instance: { ...config2, inputChange: Maybe(ClassNameAttribute({ selector: "className", value: "a" })) }
    }
    const appliedInstance2: Applied = Applied(instance2Conf)
    const instance3Conf = {
      instance: { ...config3, inputChange: Maybe(ClassNameAttribute({ selector: "className", value: "b" })) }
    }
    const appliedInstance3: Applied = Applied(instance3Conf)
    const AppliedInstances = Chunk(appliedInstance1, appliedInstance2, appliedInstance3)
    const program = Ref.make(Chunk(config1, config3)).flatMap(ref => App.markOrphanedInstances(ref, AppliedInstances))
    const result = program.unsafeRunSync()
    assert.deepEqual(
      result.head,
      Maybe(appliedInstance1),
      "first instance should be Applied"
    )
    assert.deepEqual(
      result[1],
      Maybe(Orphaned(instance2Conf)),
      "second should be Orphaned"
    )
    assert.deepEqual(
      result.last,
      Maybe(Orphaned(instance3Conf)),
      "last should ALSO be Orphaned"
    )
  })
})

describe("marking instances where the actual dom attribute does not match their output", () => {
  const MODIF_OUTPUT = "b"
  const document = (new DOMParser()).parseFromString("<html />", "text/html")
  const someDomNode = document.createElement("div") as unknown as Element
  const config1Id = ConfigurationId.unsafeMake(crypto.randomUUID())
  const config2Id = ConfigurationId.unsafeMake(crypto.randomUUID())
  const targetPath = ClassNameAttribute({ selector: "className", value: "x" })
  const subjectConfigPath = NonEmptyImmutableArray.make<PathSelector[]>(targetPath)
  const config1: Configuration = configuration.make({
    id: config1Id,
    path: subjectConfigPath,
    outputChange: ClassNameAttribute({ selector: "className", value: "a" })
  })
  const config2: Configuration = configuration.make({
    id: config2Id,
    path: subjectConfigPath,
    outputChange: ClassNameAttribute({ selector: "className", value: MODIF_OUTPUT })
  })

  const instance1Conf = {
    instance: { ...config1, inputChange: Maybe(ClassNameAttribute({ selector: "className", value: "x" })) }
  }
  const instance2Conf = {
    instance: { ...config2, inputChange: Maybe(ClassNameAttribute({ selector: "className", value: "a" })) }
  }
  it("marks them as Drop", () => {
    const CURRENT_DOM_ATTRIBUTE = "z"
    const program = App.markDropInstances(someDomNode, Chunk(Applied(instance1Conf), Applied(instance2Conf)))
      .provideService(AccessDOM, {
        getByHasAttribute: () => Effect.succeedWith(() => Chunk(someDomNode)),
        getAttribute: () =>
          Effect.succeedWith(() => DomAttribute({ selector: "className", value: CURRENT_DOM_ATTRIBUTE }))
      })
      .unsafeRunSync()
    assert.deepEqual(program.head, Maybe(Drop(instance1Conf)), "first should be Drop")
    assert.deepEqual(program.last, Maybe(Drop(instance2Conf)), "last should be Drop")
  })
  it("keeps them as Applied", () => {
    const program = App.markDropInstances(someDomNode, Chunk(Applied(instance1Conf), Applied(instance2Conf)))
      .provideService(AccessDOM, {
        getByHasAttribute: () => Effect.succeedWith(() => Chunk(someDomNode)),
        getAttribute: () => Effect.succeedWith(() => DomAttribute({ selector: "className", value: MODIF_OUTPUT }))
      })
      .unsafeRunSync()
    assert.deepEqual(program.head, Maybe(Applied(instance1Conf)), "first should be Applied")
    assert.deepEqual(program.last, Maybe(Applied(instance2Conf)), "last should be Applied")
  })
})
