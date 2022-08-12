import type { Configuration, Host } from "@org/modification/models/configuration"

export interface Instance extends Configuration {
  readonly host: Host
}
export const Instance = Derive<Make<Instance>>()

// unvalidated
// - initial
// - applied

// validated
// - ignore
// - remove
// - apply

// validated.remove | validated.remove →  forget
// validated.apply → applied

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

export type MatchedInstances = Initial | Stale | ToRemove

export interface ToIgnore extends Case {
  readonly _tag: "ToIgnore"
}
export const ToIgnore = Case.tagged<ToIgnore>("ToIgnore")

export interface Stale extends Case {
  readonly _tag: "Stale"
  readonly instance: Instance
}
export const Stale = Case.tagged<Stale>("Stale")

export interface ToRemove extends Case {
  readonly _tag: "ToRemove"
  readonly instance: Instance
}
export const ToRemove = Case.tagged<ToRemove>("ToRemove")

export interface ToApply extends Case {
  readonly _tag: "ToApply"
  readonly instance: Instance
}
export const ToApply = Case.tagged<ToApply>("ToApply")

export interface ToForget extends Case {
  readonly _tag: "ToForget"
  readonly instance: Instance
}
export const ToForget = Case.tagged<ToForget>("ToForget")

export type CheckedInitial = ToIgnore | ToApply
export type CheckedStale = ToApply | Rollback
export type CheckedToRemove = ToIgnore | Rollback

export type Validated = ToIgnore | ToRemove | ToApply

export interface Rollback extends Case {
  readonly _tag: "Rollback"
  readonly instance: Instance
}
export const Rollback = Case.tagged<Rollback>("Rollback")
