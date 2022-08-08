import type { DOMNodeOpaque, PathSelector } from "@org/modification/models/modification"

export interface AccessDOM {
  getByHasAttribute: (selector: PathSelector) => Effect.UIO<Chunk<DOMNodeOpaque>>
}

export const AccessDOM = Service.Tag<AccessDOM>()
