export type DOMNodeOpaque = {} & Brand<"DOMNode">
export const DOMNodeOpaque = Derive<Make<DOMNodeOpaque>>()

export type ModificationId = String & Brand<"ModificationId">
export const ModificationId = Derive<Make<ModificationId>>()

export interface HasClassName {
  readonly className: string
}
export const HasClassName = Derive<Codec<HasClassName>>()

export type HasAttribute = HasClassName

export interface IsNthChild {
  readonly position: Int
}
export const IsNthChild = Derive<Codec<IsNthChild>>()

export type HasPosition = IsNthChild

export type PathSelector = HasAttribute | HasPosition

export interface ModificationDefinition {
  readonly id: string
  // readonly path: HashSet<PathSelector>
}

export type ModificationDefinitions = Chunk<ModificationDefinition>

export type AppliedModifElement = string

export type CurrentState = HashMap<AppliedModifElement, ModificationDefinition>
