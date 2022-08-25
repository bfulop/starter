import type { ClassNameAttribute } from "@org/modification/models/dom"
import type { ChangeDefinition } from "@org/modification/models/modification"

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
  readonly outputChange: ChangeDefinition
}
export const configuration = Derive<Make<Configuration>>()

export type Configurations = Chunk<Configuration>

export type ActiveConfigurations = Ref<Configurations>

export interface LiveConfigurations {
  configurations: Configurations
}
export const LiveConfigurations = Service.Tag<LiveConfigurations>()
