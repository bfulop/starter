import type { DOMNode } from "@org/modification/adapters/DOM"
import type { ConfigurationOrder, PathSelector, TargetPath } from "@org/modification/models/configuration"

export interface TestSelector {
  (selector: PathSelector, node: DOMNode): Effect<ConfigurationOrder, never, Maybe<DOMNode>>
}

export const TestSelector = Service.Tag<TestSelector>()

export interface TestPath {
  (targetPath: TargetPath, node: DOMNode): Effect<TestSelector, never, Maybe<DOMNode>>
}

export const TestPath = Service.Tag<TestPath>()
