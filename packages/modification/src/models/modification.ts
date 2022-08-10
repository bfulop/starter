export type Host = {} & Brand<"Host">
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

export const INITIAL = "initial" as const
export const APPLIED = "applied" as const
export const TOVALIDATE = "toValidate" as const

export type InstanceState = typeof INITIAL | typeof APPLIED | typeof TOVALIDATE

export interface Instance extends Configuration {
  readonly state: InstanceState
}
export const Instance = Derive<Make<Instance>>()

export type Configurations = Chunk<Configuration>

export type HostInstances = HashMap<ConfigurationId, Instance>

export type CurrentState = HashMap<Host, HostInstances>
