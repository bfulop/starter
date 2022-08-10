import type { Host, PathSelector } from "@org/modification/models/modification"

export interface AccessDOM {
  getByHasAttribute: (selector: PathSelector) => Effect.UIO<Chunk<Host>>
}

export const AccessDOM = Service.Tag<AccessDOM>()
