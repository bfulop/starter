import type { AttributeNames, DomAttribute } from "@org/modification/models/dom"

export interface AccessDOM {
  getByHasAttribute: (selector: DomAttribute) => Effect.UIO<Chunk<ChildNode>>
  getAttribute: (node: ChildNode, attributeName: AttributeNames) => Maybe<DomAttribute>
}

export const AccessDOM = Service.Tag<AccessDOM>()
