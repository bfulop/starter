import { AccessDOM } from "@org/modification/adapters/DOM"
import type { Configuration, Configurations, PathSelector } from "@org/modification/models/configuration"
import { configuration, ConfigurationId } from "@org/modification/models/configuration"
import type { AttributeNames } from "@org/modification/models/dom"
import { ClassNameAttribute, DomAttribute } from "@org/modification/models/dom"
import type { OrphanedDropApply, OrphanedDropChecked } from "@org/modification/models/states"
import { Applied, Apply, Drop, Orphaned } from "@org/modification/models/states"
import * as App from "@org/modification/program"
import { DOMParser } from "linkedom"
import crypto from "node:crypto"

const document = (new DOMParser()).parseFromString("<html />", "text/html")
const someDomNode = document.createElement("div") as unknown as Element

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
        getAttribute: () => Maybe.some(DomAttribute({ selector: "className", value: CURRENT_DOM_ATTRIBUTE })),
        getParent: () => Maybe.none
      })
      .unsafeRunSync()
    assert.deepEqual(program.head, Maybe(Drop(instance1Conf)), "first should be Drop")
    assert.deepEqual(program.last, Maybe(Drop(instance2Conf)), "last should be Drop")
  })
  it("keeps them as Applied", () => {
    const program = App.markDropInstances(someDomNode, Chunk(Applied(instance1Conf), Applied(instance2Conf)))
      .provideService(AccessDOM, {
        getByHasAttribute: () => Effect.succeedWith(() => Chunk(someDomNode)),
        getAttribute: () => Maybe.some(DomAttribute({ selector: "className", value: MODIF_OUTPUT })),
        getParent: () => Maybe.none
      })
      .unsafeRunSync()
    assert.deepEqual(program.head, Maybe(Applied(instance1Conf)), "first should be Applied")
    assert.deepEqual(program.last, Maybe(Applied(instance2Conf)), "last should be Applied")
  })
})

describe("merging in new configs in existing state", () => {
  const config1Input = ClassNameAttribute({ selector: "className", value: "a" })
  const config1Output = ClassNameAttribute({ selector: "className", value: "b" })
  const appliedConfig1 = configuration.make({
    id: ConfigurationId.unsafeMake(crypto.randomUUID()),
    outputChange: config1Output,
    path: NonEmptyImmutableArray.make<PathSelector[]>(config1Input)
  })
  const config2Output = ClassNameAttribute({ selector: "className", value: "c" })
  const appliedConfig2 = configuration.make({
    id: ConfigurationId.unsafeMake(crypto.randomUUID()),
    outputChange: config2Output,
    path: NonEmptyImmutableArray.make<PathSelector[]>(config1Output)
  })
  const config3Output = ClassNameAttribute({ selector: "className", value: "d" })
  const appliedConfig3 = configuration.make({
    id: ConfigurationId.unsafeMake(crypto.randomUUID()),
    outputChange: config3Output,
    path: NonEmptyImmutableArray.make<PathSelector[]>(config2Output)
  })
  const config4Output = ClassNameAttribute({ selector: "className", value: "e" })
  const appliedConfig4 = configuration.make({
    id: ConfigurationId.unsafeMake(crypto.randomUUID()),
    outputChange: config4Output,
    path: NonEmptyImmutableArray.make<PathSelector[]>(config3Output)
  })
  // const config5Output = ClassNameAttribute({ selector: "className", value: "f" })
  // const newConfig5 = configuration.make({
  //   id: ConfigurationId.unsafeMake(crypto.randomUUID()),
  //   outputChange: config5Output,
  //   path: NonEmptyImmutableArray.make<PathSelector[]>(config2Output)
  // })

  it("adds new configs at the end", () => {
    const currenState: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropChecked>>> = Map.from([
      Tuple(
        someDomNode,
        Map.from([Tuple(
          "className",
          Chunk(
            Applied({ instance: { ...appliedConfig1, inputChange: Maybe.some(config1Input) } }),
            Applied({ instance: { ...appliedConfig2, inputChange: Maybe.some(config1Output) } })
            // Applied({ instance: { ...appliedConfig3, inputChange: Maybe.some(config2Output) } }),
            // Applied({ instance: { ...appliedConfig4, inputChange: Maybe.some(config3Output) } })
          )
        )])
      )
    ])
    const configurations: Configurations = Chunk(
      appliedConfig1,
      appliedConfig2,
      appliedConfig3
      // appliedConfig4,
      // newConfig5
    )
    const program = App.mergeConfigurationsToState(configurations, currenState)
    const result = Maybe.fromNullable(program.get(someDomNode)).flatMap(a => Maybe.fromNullable(a.get("className")))
      .flatMap(a => a.last).getOrElse(() => null)
    assert.deepEqual(
      result,
      Apply({ instance: { ...appliedConfig3, inputChange: Maybe.some(config2Output) } }),
      "last element is the instance from config 3"
    )
    assert.equal(
      Maybe.fromNullable(program.get(someDomNode)).flatMap(a => Maybe.fromNullable(a.get("className"))).map(c => c.size)
        .getOrElse(() => 0),
      3,
      "all new configs have been inserted"
    )
  })
  it("inserts new configs in the middle", () => {
    const currenState: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropChecked>>> = Map.from([
      Tuple(
        someDomNode,
        Map.from([Tuple(
          "className",
          Chunk(
            Applied({ instance: { ...appliedConfig1, inputChange: Maybe.some(config1Input) } }),
            // Applied({ instance: { ...appliedConfig2, inputChange: Maybe.some(config1Output) } })
            Applied({ instance: { ...appliedConfig3, inputChange: Maybe.some(config1Output) } }),
            Applied({ instance: { ...appliedConfig4, inputChange: Maybe.some(config3Output) } })
          )
        )])
      )
    ])
    const configurations: Configurations = Chunk(
      appliedConfig1,
      appliedConfig2,
      appliedConfig3,
      appliedConfig4
      // newConfig5
    )
    const program = App.mergeConfigurationsToState(configurations, currenState)
    const result = Maybe.fromNullable(program.get(someDomNode)).flatMap(a => Maybe.fromNullable(a.get("className")))
      .flatMap(a => a.last).getOrElse(() => null)
    assert.deepEqual(
      result,
      Apply({ instance: { ...appliedConfig4, inputChange: Maybe.some(config3Output) } }),
      "last element is the instance from config 4"
    )
    assert.equal(
      Maybe.fromNullable(program.get(someDomNode)).flatMap(a => Maybe.fromNullable(a.get("className"))).map(c => c.size)
        .getOrElse(() => 0),
      4,
      "all new configs have been inserted"
    )
  })
  it("inserts new configs in the middle, removes following", () => {
    const currenState: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropChecked>>> = Map.from([
      Tuple(
        someDomNode,
        Map.from([Tuple(
          "className",
          Chunk(
            Applied({ instance: { ...appliedConfig1, inputChange: Maybe.some(config1Input) } }),
            // Applied({ instance: { ...appliedConfig2, inputChange: Maybe.some(config1Output) } })
            Applied({ instance: { ...appliedConfig3, inputChange: Maybe.some(config1Output) } }),
            Applied({ instance: { ...appliedConfig4, inputChange: Maybe.some(config3Output) } })
          )
        )])
      )
    ])
    const configurations: Configurations = Chunk(
      appliedConfig1,
      appliedConfig2,
      appliedConfig3
      // appliedConfig4
      // newConfig5
    )
    const program = App.mergeConfigurationsToState(configurations, currenState)
    const result = Maybe.fromNullable(program.get(someDomNode)).flatMap(a => Maybe.fromNullable(a.get("className")))
      .flatMap(a => a.last).getOrElse(() => null)

    assert.deepEqual(
      result,
      Apply({ instance: { ...appliedConfig3, inputChange: Maybe.some(config2Output) } }),
      "last element is the instance from config 3, config 4 is removed"
    )
    assert.equal(
      Maybe.fromNullable(program.get(someDomNode)).flatMap(a => Maybe.fromNullable(a.get("className"))).map(c => c.size)
        .getOrElse(() => 0),
      3,
      "all new configs have been inserted"
    )
  })
  it("inserts new configs in the middle, removes orphaned in middle", () => {
    const currenState: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropChecked>>> = Map.from([
      Tuple(
        someDomNode,
        Map.from([Tuple(
          "className",
          Chunk(
            Applied({ instance: { ...appliedConfig1, inputChange: Maybe.some(config1Input) } }),
            // Applied({ instance: { ...appliedConfig2, inputChange: Maybe.some(config1Output) } })
            Applied({ instance: { ...appliedConfig3, inputChange: Maybe.some(config1Output) } }),
            Applied({ instance: { ...appliedConfig4, inputChange: Maybe.some(config3Output) } })
          )
        )])
      )
    ])
    const configurations: Configurations = Chunk(
      appliedConfig1,
      appliedConfig2
      // appliedConfig3
      // appliedConfig4
      // newConfig5
    )
    const program = App.mergeConfigurationsToState(configurations, currenState)
    const result = Maybe.fromNullable(program.get(someDomNode)).flatMap(a => Maybe.fromNullable(a.get("className")))
      .flatMap(a => a.last).getOrElse(() => null)

    assert.deepEqual(
      result,
      Apply({ instance: { ...appliedConfig2, inputChange: Maybe.some(config1Output) } }),
      "last element is the instance from config 2, config 3 is removed"
    )
    assert.equal(
      Maybe.fromNullable(program.get(someDomNode)).flatMap(a => Maybe.fromNullable(a.get("className"))).map(c => c.size)
        .getOrElse(() => 0),
      2,
      "all new configs have been inserted"
    )
  })
})

describe("merging new hosts into existing state", () => {
  const config1Input = ClassNameAttribute({ selector: "className", value: "a" })
  const config1Output = ClassNameAttribute({ selector: "className", value: "b" })
  const appliedConfig1 = configuration.make({
    id: ConfigurationId.unsafeMake(crypto.randomUUID()),
    outputChange: config1Output,
    path: NonEmptyImmutableArray.make<PathSelector[]>(config1Input)
  })
  const config2Output = ClassNameAttribute({ selector: "className", value: "c" })
  const appliedConfig2 = configuration.make({
    id: ConfigurationId.unsafeMake(crypto.randomUUID()),
    outputChange: config2Output,
    path: NonEmptyImmutableArray.make<PathSelector[]>(ClassNameAttribute({ selector: "className", value: "f" }))
  })
  const newDomNode = document.createElement("div") as unknown as Element

  it("adds a new host", () => {
    const configurations: Configurations = Chunk(
      appliedConfig1,
      appliedConfig2
    )
    const currenState: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropChecked>>> = Map.from([
      Tuple(
        someDomNode,
        Map.from([Tuple(
          "className",
          Chunk(
            Applied({ instance: { ...appliedConfig1, inputChange: Maybe.some(config1Input) } })
          )
        )])
      )
    ])
    const program = App
      .mergeNewNodeMatchesToState(configurations, currenState)
      .provideService(AccessDOM, {
        getAttribute: () => Maybe.none,
        getByHasAttribute: () => Effect.succeedWith(() => Chunk(newDomNode)),
        getParent: () => Maybe.none
      })
    const subject = program.unsafeRunSync()
    const result = Maybe.fromNullable(subject.get(newDomNode)).flatMap(a => Maybe.fromNullable(a.get("className")))
      .flatMap(a => a.last).getOrElse(() => null)
    assert.deepEqual(
      result,
      Apply({ instance: { ...appliedConfig2, inputChange: Maybe.none } }),
      "new Apply instance has been added to host"
    )
  })

  it("adds a new target for an existing host", () => {
    const INPUT_DOM_ATTRIBUTE = DomAttribute({ selector: "className", value: "c" })
    const configurations: Configurations = Chunk(
      appliedConfig1,
      appliedConfig2
    )
    const currenState: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropChecked>>> = Map.from([
      Tuple(
        someDomNode,
        Map.from([Tuple(
          "id",
          Chunk(
            Applied({ instance: { ...appliedConfig1, inputChange: Maybe.some(config1Input) } })
          )
        )])
      )
    ])
    const program = App
      .mergeNewNodeMatchesToState(configurations, currenState)
      .provideService(AccessDOM, {
        getAttribute: () => Maybe.some(INPUT_DOM_ATTRIBUTE),
        getByHasAttribute: () => Effect.succeedWith(() => Chunk(someDomNode)),
        getParent: () => Maybe.none
      })
    const subject = program.unsafeRunSync()
    const result = Maybe.fromNullable(subject.get(someDomNode)).flatMap(a => Maybe.fromNullable(a.get("className")))
      .flatMap(a => a.last).getOrElse(() => null)
    assert.deepEqual(
      result,
      Apply({ instance: { ...appliedConfig2, inputChange: Maybe.some(INPUT_DOM_ATTRIBUTE) } }),
      "new Apply instance has been added to existing host, className attribute"
    )
  })
})

describe("matching a path selector against DOM and App state", () => {
  const config1Input = ClassNameAttribute({ selector: "className", value: "a" })
  const config1Output = ClassNameAttribute({ selector: "className", value: "b" })
  const appliedConfig1 = configuration.make({
    id: ConfigurationId.unsafeMake(crypto.randomUUID()),
    outputChange: config1Output,
    path: NonEmptyImmutableArray.make<PathSelector[]>(config1Input)
  })
  const config2Output = ClassNameAttribute({ selector: "className", value: "c" })
  const appliedConfig2 = configuration.make({
    id: ConfigurationId.unsafeMake(crypto.randomUUID()),
    outputChange: config2Output,
    path: NonEmptyImmutableArray.make<PathSelector[]>(config1Output)
  })
  const config3Output = ClassNameAttribute({ selector: "className", value: "d" })
  const subjectConfigTargetSelector = ClassNameAttribute({ selector: "className", value: "c" })
  const subjectConfig3 = configuration.make({
    id: ConfigurationId.unsafeMake(crypto.randomUUID()),
    outputChange: config3Output,
    path: NonEmptyImmutableArray.make<PathSelector[]>(
      subjectConfigTargetSelector,
      ClassNameAttribute({ selector: "className", value: "z" })
    )
  })
  const configurations: Configurations = Chunk(
    appliedConfig1,
    appliedConfig2,
    subjectConfig3
  )

  it("matches dom attribute when no modification is active", () => {
    const program = App.validateSelector(
      configurations,
      subjectConfig3,
      subjectConfigTargetSelector
    )(Either.left(Maybe(config2Output)))
    assert.isTrue(program, "simple compare of current DOM attribute value")
  })

  it("matches selector based on attached instances stack", () => {
    const instances = Chunk(
      Applied({ instance: { ...appliedConfig1, inputChange: Maybe.some(config1Input) } }),
      Applied({ instance: { ...appliedConfig2, inputChange: Maybe.some(config1Output) } })
    )

    const program = App.validateSelector(
      configurations,
      subjectConfig3,
      subjectConfigTargetSelector
    )(Either.right(instances))
    assert.isTrue(program)
  })

  it("does not match selector based on attached instances stack", () => {
    const Config1 = configuration.make({
      id: ConfigurationId.unsafeMake(crypto.randomUUID()),
      outputChange: config1Output,
      path: NonEmptyImmutableArray.make<PathSelector[]>(config1Input)
    })
    const config2Output = ClassNameAttribute({ selector: "className", value: "NOT_MATCH" })
    const Config2 = configuration.make({
      id: ConfigurationId.unsafeMake(crypto.randomUUID()),
      outputChange: config2Output,
      path: NonEmptyImmutableArray.make<PathSelector[]>(config1Output)
    })
    const instances = Chunk(
      Applied({ instance: { ...Config1, inputChange: Maybe.some(config1Input) } }),
      Applied({ instance: { ...Config2, inputChange: Maybe.some(config1Output) } })
    )
    const configurations2: Configurations = Chunk(
      Config1,
      Config2,
      subjectConfig3
    )

    const program = App.validateSelector(
      configurations2,
      subjectConfig3,
      subjectConfigTargetSelector
    )(Either.right(instances))
    assert.isFalse(program)
  })
})

describe("validating an instance", () => {
  const tree = (new DOMParser()).parseFromString(
    `<html>
  <body>
    <div class="1a">
      <div class="2a">
        <div class="3a" id="target">
        </div
      </div>
    </div>
  </body>
  </html>`,
    "text/html"
  )
  const node = tree.getElementById("target") as unknown as Element
  const subjectId = ConfigurationId.unsafeMake(crypto.randomUUID())
  it("validates instance when path matches", () => {
    const subjectConfigPath = NonEmptyImmutableArray.make<PathSelector[]>(
      ClassNameAttribute({ "selector": "className", "value": "2a" }),
      ClassNameAttribute({ "selector": "className", "value": "3a" })
    )
    const subjectConfig: Configuration = configuration.make({
      id: subjectId,
      path: subjectConfigPath,
      outputChange: ClassNameAttribute({ selector: "className", value: "3b" })
    })
    const subjectInstance = Apply({
      instance: { ...subjectConfig, inputChange: Maybe(ClassNameAttribute({ selector: "className", value: "3a" })) }
    })
    const configurations: Configurations = Chunk(subjectConfig)
    const currenState: Map<ChildNode, Map<AttributeNames, Chunk<OrphanedDropApply>>> = Map.from([
      Tuple(
        node,
        Map.from([Tuple(
          "className",
          Chunk(subjectInstance)
        )])
      )
    ])

    const program = App
      .validateInstancePath(configurations, subjectInstance, node, currenState)
      .provideService(AccessDOM, {
        getAttribute: (node: ChildNode) => {
          const elem = node as unknown as Element
          return Maybe.fromNullable(elem.getAttribute("class")).map(a =>
            ClassNameAttribute({ selector: "className", value: a })
          )
        },
        getByHasAttribute: () => Effect.succeedWith(() => Chunk.empty()),
        getParent: (node: ChildNode) => Maybe.fromNullable(node.parentNode as unknown as Element)
      })
      .unsafeRunSync()
    assert.isTrue(program)
  })
})
