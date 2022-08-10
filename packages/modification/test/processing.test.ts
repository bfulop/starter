import { AccessDOM } from "@org/modification/adapters/DOM"
import type { CurrentState, PathSelector } from "@org/modification/models/modification"
import {
  APPLIED,
  Configuration,
  ConfigurationId,
  HasClassName,
  Host as DomNodeOpaque,
  INITIAL,
  Instance,
  TOVALIDATE
} from "@org/modification/models/modification"
import * as App from "@org/modification/program"
import crypto from "node:crypto"

const targetDOMNode = DomNodeOpaque.make({})

export const makeLiveAccessDOM = (): AccessDOM => ({
  getByHasAttribute: (selector: PathSelector) =>
    Effect.succeedWith(() =>
      HasClassName.is(selector) ?
        selector.className === ".lastElement" ? Chunk.make(targetDOMNode, targetDOMNode) : Chunk.empty() :
        Chunk.empty()
    )
})

describe("process modifications", () => {
  // it("identity", () => {
  //   const currentState: CurrentState = HashMap.from<AppliedModifElement, Configuration>(
  //     Collection.make(Tuple.make("what", modification))
  //   )
  //   const result = App.processModifications(Chunk.empty(), currentState)
  //   assert.equal(result, currentState)
  // })

  it("expands modifications", () => {
    const id = ConfigurationId.unsafeMake(crypto.randomUUID())
    const modification = Configuration.make({
      id,
      path: NonEmptyImmutableArray.make<PathSelector[]>({ className: ".someClassName" }, { className: ".lastElement" })
    })
    const modifications = Ref.unsafeMake(
      Chunk.from<Configuration>([modification, modification])
    )
    const AccessDOMLive = Layer.fromValue(AccessDOM, makeLiveAccessDOM)
    const program = App.mapModificationsToTargets(modifications).provideSomeLayer(AccessDOMLive)
    const res = program.unsafeRunSync()
    assert.deepEqual(res.head.flatMap(x => x.head), Maybe(targetDOMNode))
    assert.equal(res.size, 2)
  })
})

describe("updating state with modifications", () => {
  const targetClassname = "Classname"
  const existingTargetedElement = DomNodeOpaque.make({})
  const newTargetedElement = DomNodeOpaque.make({})
  const oldModifId = ConfigurationId.unsafeMake(crypto.randomUUID())
  const targetModifId = ConfigurationId.unsafeMake(crypto.randomUUID())
  const targetModification = Configuration.make({
    id: targetModifId,
    path: NonEmptyImmutableArray.make<PathSelector[]>({ className: targetClassname })
  })

  describe("found target node already exists in state", () => {
    const currentstate: CurrentState = HashMap(
      Tuple(
        existingTargetedElement,
        HashMap(Tuple(
          oldModifId,
          Instance.make({
            id: oldModifId,
            path: NonEmptyImmutableArray.make<PathSelector[]>({ className: targetClassname }),
            state: APPLIED
          })
        ))
      ),
      Tuple(
        newTargetedElement,
        HashMap(Tuple(
          targetModifId,
          Instance.make({
            id: targetModifId,
            path: NonEmptyImmutableArray.make<PathSelector[]>({ className: targetClassname }),
            state: APPLIED
          })
        ))
      )
    )

    const program = App.mergeModifTargetsToState(currentstate, targetModification).provideSomeLayer(
      Layer.fromValue(AccessDOM, () => ({
        getByHasAttribute: () => Effect.succeedWith(() => Chunk.make(existingTargetedElement, newTargetedElement))
      }))
    )
    const result = program.unsafeRunSync()
    it("existing element from different modification untouched", () => {
      assert.deepEqual(
        result
          .get(existingTargetedElement)
          .flatMap(x => x.get(oldModifId))
          .map(x => x.state),
        Maybe(APPLIED)
      )
    })
    it("new modification on existing element added to state", () => {
      assert.deepEqual(
        result
          .get(existingTargetedElement)
          .flatMap(x => x.get(targetModifId))
          .map(x => x.state),
        Maybe(INITIAL)
      )
    })
    it("existing element on targeted modification is updated", () => {
      assert.deepEqual(
        result
          .get(newTargetedElement)
          .flatMap(x => x.get(targetModifId))
          .map(x => x.state),
        Maybe(TOVALIDATE)
      )
    })
  })

  describe("found target node does not exist in state", () => {
    const currentState: CurrentState = HashMap.empty()
    const program = App.mergeModifTargetsToState(currentState, targetModification).provideSomeLayer(
      Layer.fromValue(AccessDOM, () => ({
        getByHasAttribute: () => Effect.succeedWith(() => Chunk.make(newTargetedElement))
      }))
    )
    const result = program.unsafeRunSync()
    it("new found target node added to state", () => {
      assert.deepEqual(
        result
          .get(newTargetedElement)
          .flatMap(x => x.get(targetModifId))
          .map(x => x.state),
        Maybe(INITIAL)
      )
    })
  })

  it("not matched elements in current state are preserved", () => {
    const currentState: CurrentState = HashMap(
      Tuple(
        existingTargetedElement,
        HashMap(Tuple(
          oldModifId,
          Instance.make({
            id: oldModifId,
            path: NonEmptyImmutableArray.make<PathSelector[]>({ className: targetClassname }),
            state: APPLIED
          })
        ))
      )
    )

    const program = App.mergeModifTargetsToState(currentState, targetModification).provideSomeLayer(
      Layer.fromValue(AccessDOM, () => ({
        getByHasAttribute: () => Effect.succeedWith(() => Chunk.make(existingTargetedElement))
      }))
    )
    const result = program.unsafeRunSync()
    assert.deepEqual(
      result
        .get(existingTargetedElement)
        .flatMap(x => x.get(oldModifId))
        .map(x => x.state),
      Maybe(APPLIED)
    )
  })
  it.todo("target is to remove or move")
})
