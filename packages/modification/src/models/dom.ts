const classNameAttribute = "className" as const
const idAttribute = "id" as const

export type AttributeNames = typeof classNameAttribute | typeof idAttribute
export type AttributeValue = string

export interface DomAttribute extends Case {
  readonly _tag: "DomAttribute"
  value: AttributeValue
  selector: AttributeNames
}
export const DomAttribute = Case.tagged<DomAttribute>("DomAttribute")

export interface ClassNameAttribute extends Case {
  readonly _tag: "ClassName"
  readonly selector: "className"
  readonly value: AttributeValue
}

export const ClassNameAttribute = Case.tagged<ClassNameAttribute>("ClassName")
