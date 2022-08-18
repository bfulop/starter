import type { DOMNode } from "@org/modification/adapters/dom"
import type {
  Configuration,
  ConfigurationId,
  Configurations,
  PathSelector
} from "@org/modification/models/configuration"
import type { AppliedInstances } from "@org/modification/models/states"

export interface TargetConfigurations {
  confugrations: Configurations
  configurationPosition: (a: ConfigurationId) => Maybe<number>
}
export const TargetConfigurations = Service.Tag<TargetConfigurations>()

/**
 * Given a configuration and other applied instances,
 * calculate a new selector to test on the current DOM
 */
export interface AppliedSelectorCorrect {
  (
    configuration: Configuration,
    domNode: DOMNode,
    instances: AppliedInstances
  ): Effect<TargetConfigurations, never, PathSelector>
}
export declare const selectorCorrect: AppliedSelectorCorrect

/**
 * Calculate how previous configurations affect
 * the current configuration selector
 */
export interface ExtendSelectors {
  (
    configuration: Configuration
  ): Effect<TargetConfigurations, never, List<PathSelector>>
}
export declare const extendSelectors: ExtendSelectors
