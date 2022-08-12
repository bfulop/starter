import type { DOMNode } from "@org/modification/adapters/DOM"

export type Host = {} & DOMNode & Brand<"Host">
export const Host = Derive<Make<Host>>()

export interface HasClassName {
  readonly className: string
}
export const HasClassName = Derive<Guard<HasClassName>>()

export type HasAttribute = HasClassName

export interface IsNthChild {
  readonly position: Int
}
export const IsNthChild = Derive<Make<IsNthChild>>()

export type HasPosition = IsNthChild

export type PathSelector = HasAttribute | HasPosition
export const PathSelector = Derive<Guard<PathSelector>>()

export type ConfigurationId = UUID
export const ConfigurationId = Derive<Make<ConfigurationId>>()

export type TargetPath = NonEmptyImmutableArray<PathSelector>

export interface Configuration {
  readonly id: ConfigurationId
  readonly path: TargetPath
}
export const Configuration = Derive<Make<Configuration>>()

export type Configurations = Chunk<Configuration>

export interface ConfigurationOrder {
  (id: ConfigurationId): number
}
export const ConfigurationOrder = Service.Tag<ConfigurationOrder>()
