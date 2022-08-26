const classNameAttribute = "className" as const
const idAttribute = "id" as const

export type AttributeNames = typeof classNameAttribute | typeof idAttribute
export type AttributeValue = string

export interface DomAttribute extends Case {
  readonly _tag: "DomAttribute"
  readonly value: AttributeValue
  readonly selector: AttributeNames
}
export const DomAttribute = Case.tagged<DomAttribute>("DomAttribute")

export interface ClassNameAttribute extends DomAttribute {
  readonly selector: "className"
}

export const ClassNameAttribute = Case.tagged<ClassNameAttribute>("DomAttribute")
