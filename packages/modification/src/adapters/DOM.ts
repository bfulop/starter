import type { DOMNodeOpaque } from "@org/modification/models/modification"

export interface AccessDOM {
  getByHasAttribute: (selector: string) => Effect.UIO<DOMNodeOpaque>
}

export const AccessDOM = Service.Tag<AccessDOM>()
