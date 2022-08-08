export type DOMNodeOpaque = {} & Brand<"DOMNode">
export const DOMNodeOpaque = Derive<Make<DOMNodeOpaque>>()

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

export type ModificationId = UUID
export const ModificationId = Derive<Make<ModificationId>>()

export interface ModificationDefinition {
  readonly id: ModificationId
  readonly path: NonEmptyImmutableArray<PathSelector>
}
export const ModificationDefinition = Derive<Make<ModificationDefinition>>()

export const INITIAL = "initial" as const
export const APPLIED = "applied" as const
export const VERIFIED = "verified" as const

export type ModificationState = typeof INITIAL | typeof APPLIED | typeof VERIFIED

export interface AppliedModification extends ModificationDefinition {
  readonly state: ModificationState
}
export const AppliedModification = Derive<Make<AppliedModification>>()

export type ModificationDefinitions = Chunk<ModificationDefinition>

export type AppliedModifElement = string

export type CurrentState = HashMap<DOMNodeOpaque, HashMap<ModificationId, AppliedModification>>
