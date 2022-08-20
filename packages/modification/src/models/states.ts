import type { Configuration } from "@org/modification/models/configuration"
import type { ChangeDefinition } from "@org/modification/models/modification"

export interface Instance extends Configuration {
  readonly host: ChildNode
  readonly inputChange: Maybe<ChangeDefinition>
}
export const Instance = Derive<Make<Instance>>()

export const candidateInstancesEq: Equivalence<Candidates> = Equivalence.struct({
  instance: Equivalence.struct({
    id: Equivalence.string,
    host: Equivalence.strict<ChildNode>()
  })
})

export interface Initial extends Case {
  readonly _tag: "Initial"
  readonly instance: Instance
}
export const Initial = Case.tagged<Initial>("Initial")

export interface Applied extends Case {
  readonly _tag: "Applied"
  readonly instance: Instance
}
export const Applied = Case.tagged<Applied>("Applied")

export type AppliedInstances = Chunk<Applied>
export type Candidates = Initial | Applied

export type MatchedInstances = Initial | Stale | Orphaned

export interface Stale extends Case {
  readonly _tag: "Stale"
  readonly instance: Instance
}
export const Stale = Case.tagged<Stale>("Stale")

export interface Orphaned extends Case {
  readonly _tag: "Orphaned"
  readonly instance: Instance
}
export const Orphaned = Case.tagged<Orphaned>("Orphaned")

export interface ToApply extends Case {
  readonly _tag: "Apply"
  readonly instance: Instance
}
export const ToApply = Case.tagged<ToApply>("Apply")

export interface Drop extends Case {
  readonly _tag: "Drop"
  readonly instance: Instance
}
export const Drop = Case.tagged<Drop>("Drop")

export type CheckedInitial = Drop | ToApply
export type CheckedStale = ToApply | Rollback | Applied
export type CheckedToRemove = Drop | Rollback
export type CheckedPrecedingInstance = Drop | Rollback | ToApply | Applied
export type UnCheckedNextInstance = Stale | Orphaned | Initial

export type Validated = Drop | Orphaned | ToApply
export type ApplyAble = ToApply | Rollback | Applied

export interface Rollback extends Case {
  readonly _tag: "Rollback"
  readonly instance: Instance
}
export const Rollback = Case.tagged<Rollback>("Rollback")
