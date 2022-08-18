import type { PathSelector } from "@org/modification/models/configuration"
import type { AttributeNames, DomAttribute } from "@org/modification/models/dom"

export type DOMNode = {} & Brand<"DOMNode">
export const DOMNode = Derive<Make<DOMNode>>()

export interface AccessDOM {
  getByHasAttribute: (selector: PathSelector) => Effect.UIO<Chunk<ChildNode>>
  getAttribute: (node: ChildNode, attributeName: AttributeNames) => Effect.UIO<DomAttribute>
}

export const AccessDOM = Service.Tag<AccessDOM>()
