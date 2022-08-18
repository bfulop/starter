import type { ClassNameAttribute } from "./dom"

export interface PositionChange extends Case {
  _tag: "PositionChange"
}

export type ChangeDefinition = ClassNameAttribute
