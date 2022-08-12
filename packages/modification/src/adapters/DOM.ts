import type { Host, PathSelector } from "@org/modification/models/configuration"

export type DOMNode = {} & Brand<"DOMNode">
export const DOMNode = Derive<Make<DOMNode>>()

export interface AccessDOM {
  getByHasAttribute: (selector: PathSelector) => Effect.UIO<Chunk<Host>>
}

export const AccessDOM = Service.Tag<AccessDOM>()
