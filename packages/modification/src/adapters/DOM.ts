import type { AppliedModifElement } from "@org/modification/models/modification"

export interface AccessDOM {
  getByHasAttribute: (selector: string) => Effect.UIO<AppliedModifElement>
}

export const AccessDOM = Service.Tag<AccessDOM>()
