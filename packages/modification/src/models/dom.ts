const classNameAttribute = "className" as const
const idAttribute = "id" as const

export type AttributeNames = typeof classNameAttribute | typeof idAttribute
export type AttributeValue = string

export interface DomAttribute extends Case {
  value: AttributeValue
  selector: AttributeNames
}
export interface ClassNameAttribute extends DomAttribute {
  readonly _tag: "ClassName"
  readonly selector: "className"
}

export const ClassNameAttribute = Case.tagged<ClassNameAttribute>("ClassName")

export interface IdAttributed extends DomAttribute {
  readonly _tag: "Id"
  readonly selector: "id"
}
