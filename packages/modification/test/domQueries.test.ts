import { AccessDOM } from "@org/modification/adapters/dom"
import { matchNodeAttribute } from "@org/modification/domQueries"
import type { PathSelector } from "@org/modification/models/configuration"
import { ConfigurationId } from "@org/modification/models/configuration"
import { ClassNameAttribute } from "@org/modification/models/dom"
import { Applied, Drop, Initial, Orphaned, Rollback, Stale, ToApply } from "@org/modification/models/states"
import { DOMParser } from "linkedom"
import crypto from "node:crypto"

const document = (new DOMParser()).parseFromString("<html />", "text/html")
const someDomNode = document.createElement("div") as unknown as Element

const accessDomImplementation = {
  getByHasAttribute: () => Effect.succeedWith(() => Chunk.from([someDomNode])),
  getAttribute: () => Effect.succeedWith(() => ClassNameAttribute({ selector: "className", value: "currentClassName" }))
}
export const makeLiveAccessDOM = (): AccessDOM => (accessDomImplementation)

describe.only("matching DOM state against app state", () => {
  let testCounter = 0
  const targetSelector = "targetSelector"
  const targetPath = ClassNameAttribute({ selector: "className", value: targetSelector })
  const subjectConfigPath = NonEmptyImmutableArray.make<PathSelector[]>(
    targetPath
  )
  const precedingConfigId = ConfigurationId.unsafeMake(crypto.randomUUID())
  const followingConfigId = ConfigurationId.unsafeMake(crypto.randomUUID())
  // 1: preceding instance state
  // 2: following instance state
  // 3: preceding input attribute value
  // 4: preceding output attribute value
  // 5: following input attribute value
  // 6: following output attribute value
  // 7: current attribute value on DOM node

  it("check all cases", () => {
    const expectedResults = (assertionId: string) => {
      const trueCases = List(
        /1(Drop|noPrecedingInstance)_2(Stale|Orphaned).*5targetSelector/,
        /1(Drop|noPrecedingInstance)_2(noFollowingInstance|Initial).*_7targetSelector/,
        /1Rollback_2(noFollowingInstance|Initial)_3targetSelector/,
        /1Rollback_2(Stale|Orphaned)_3targetSelector/,
        /1Apply.*_4targetSelector/,
        /1Applied.*_7targetSelector/
      )
      const falseCases = List(
        /1(Drop|noPrecedingInstance)_2(noFollowingInstance|Initial).*_7differentCurrentValue/,
        /1(Drop|noPrecedingInstance)_2(Stale|Orphaned).*5(differentFollowingInputValue|noFollowingAttribute)/,
        /1Drop_2noFollowingInstance.*_7differentCurrentValue/,
        /1Rollback_.*3(noPrecedingAttribute|differentPrecedingInputValue)/,
        /1Apply.*_4differentPrecedingOutputValue/,
        /1Applied.*_7differentCurrentValue/,
        /1(noPrecedingInstance)_2(Stale|Orphaned).*5noFollowingAttribute_6targetSelector/
      )
      const examples = {}
      return trueCases
        .find(p => p.test(assertionId))
        .map(() => true)
        .getOrElse(() =>
          falseCases
            .find(p => p.test(assertionId))
            .map(() => false)
            .getOrElse(() => examples[assertionId])
        )
    }
    const precedingTypes = List(Drop, Rollback, ToApply, Applied)
    const followingTypes = List(Stale, Orphaned, Initial)
    const sameInput = List(true, false)
    const sameOutput = List(true, false)
    const targetSameAsCurrent = List(true, false)
    precedingTypes.forEach(preceding =>
      followingTypes.forEach(following =>
        sameInput.forEach(isSameInput =>
          sameOutput.forEach(isSameOutput =>
            List(true, false).forEach(precedingExists =>
              List(true, false).forEach(followingExists =>
                List(true, false).forEach(precedingInputMaybe =>
                  List(true, false).forEach(followingInputMaybe =>
                    targetSameAsCurrent.forEach(isTargetSameAsCurrent => {
                      const currentValue = isTargetSameAsCurrent ? targetSelector : "differentCurrentValue"
                      const precedingInputValue = isSameInput ? targetSelector : "differentPrecedingInputValue"
                      const precedingOutputValue = isSameInput ?
                        targetSelector :
                        "differentPrecedingOutputValue"
                      const precedingOutputChange = ClassNameAttribute({
                        selector: "className",
                        value: precedingOutputValue
                      })
                      const precedingInputChange = precedingInputMaybe ?
                        Maybe.some(ClassNameAttribute({ selector: "className", value: precedingInputValue })) :
                        Maybe.none
                      const precedingInstance = precedingExists ?
                        Maybe.some(preceding({
                          instance: {
                            host: someDomNode,
                            id: precedingConfigId,
                            path: subjectConfigPath,
                            outputChange: precedingOutputChange,
                            inputChange: precedingInputChange
                          }
                        })) :
                        Maybe.none
                      const followingInputValue = isSameOutput ? targetSelector : "differentFollowingInputValue"
                      const followingOutputValue = isSameOutput ? targetSelector : "differentFollowingOutputValue"
                      const followingOutputChange = ClassNameAttribute({
                        selector: "className",
                        value: followingOutputValue
                      })
                      const followingInputChange = followingInputMaybe ?
                        Maybe.some(ClassNameAttribute({ selector: "className", value: followingInputValue })) :
                        Maybe.none
                      const followingInstance = followingExists ?
                        Maybe.some(following({
                          instance: {
                            host: someDomNode,
                            id: followingConfigId,
                            path: subjectConfigPath,
                            outputChange: followingOutputChange,
                            inputChange: followingInputChange
                          }
                        })) :
                        Maybe.none
                      const subject = matchNodeAttribute(
                        targetPath,
                        someDomNode,
                        precedingInstance,
                        followingInstance
                      ).provideService(
                        AccessDOM,
                        {
                          ...accessDomImplementation,
                          getAttribute: () =>
                            Effect.succeedWith(() => ClassNameAttribute({ selector: "className", value: currentValue }))
                        }
                      )
                      const assertionId = `1${
                        precedingInstance.map(x => x._tag).getOrElse(() => "noPrecedingInstance")
                      }_2${followingInstance.map(x => x._tag).getOrElse(() => "noFollowingInstance")}_3${
                        precedingInputMaybe ? precedingInputValue : "noPrecedingAttribute"
                      }_4${precedingOutputValue}_5${
                        followingInputMaybe ? followingInputValue : "noFollowingAttribute"
                      }_6${followingOutputValue}_7${currentValue}`
                      const result = subject.unsafeRunSync()
                      if (precedingInstance === Maybe.none && followingInstance === Maybe.none) {
                        return
                      }
                      const expectedResult = expectedResults(assertionId)
                      testCounter += 1
                      assert.exists(expectedResult, `${assertionId} case not defined`)
                      assert.equal(result, expectedResult, `${assertionId} did not match`)
                    })
                  )
                )
              )
            )
          )
        )
      )
    )
    console.log(`run ${testCounter} assertions`)
  })
})
