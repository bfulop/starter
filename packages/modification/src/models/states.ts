import type { Configuration } from "@org/modification/models/configuration"
import type { AttributeNames } from "@org/modification/models/dom"
import type { ChangeDefinition } from "@org/modification/models/modification"

export interface Instance extends Configuration {
  readonly inputChange: Maybe<ChangeDefinition>
}

export type Instances = Chunk<Applied>

export type InstanceTargets = Map<AttributeNames, Instances>

export type InstancesState = Map<ChildNode, InstanceTargets>

/**
 * Orphaned
 * Instances from configurations that
 * are no longer present on the "page"
 */
export interface Orphaned extends Case {
  readonly _tag: "Orphaned"
  readonly instance: Instance
}
export const Orphaned = Case.tagged<Orphaned>("Orphaned")

/**
 * Drop
 * Instances that can be ignored
 * (no rollback, no effect on results)
 */
export interface Drop extends Case {
  readonly _tag: "Drop"
  readonly instance: Instance
}
export const Drop = Case.tagged<Drop>("Drop")

export interface Applied extends Case {
  readonly _tag: "Applied"
  readonly instance: Instance
}

export const Applied = Case.tagged<Applied>("Applied")

export type OrphanedChecked = Applied | Orphaned
