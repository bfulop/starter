import type { DOMNode } from "@org/modification/adapters/dom"
import type { ClassNameAttribute } from "@org/modification/models/dom"
import type { ChangeDefinition } from "@org/modification/models/modification"

export type Host = {} & DOMNode & Brand<"Host">
export const Host = Derive<Make<Host>>()

export interface IsNthChild {
  readonly position: Int
}
export const IsNthChild = Derive<Make<IsNthChild>>()

export type HasPosition = IsNthChild

export type PathSelector = ClassNameAttribute

export type ConfigurationId = UUID
export const ConfigurationId = Derive<Make<ConfigurationId>>()

export type TargetPath = NonEmptyImmutableArray<PathSelector>

export interface Configuration {
  readonly id: ConfigurationId
  readonly path: TargetPath
  readonly change: ChangeDefinition
}
export const Configuration = Derive<Make<Configuration>>()

export type Configurations = Chunk<Configuration>
