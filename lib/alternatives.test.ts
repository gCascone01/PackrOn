import { describe, expect, it } from "vitest"
import { withPreviousStop } from "./alternatives"
import type { Stop } from "./types"

function stop(id: string, name: string): Stop {
  return { id, name, description: "", category: "cultura", time: "10:00", duration: "1h", lat: 0, lng: 0 }
}

describe("withPreviousStop", () => {
  it("returns alternatives unchanged when there is no previous stop", () => {
    const alts = [stop("b", "B")]
    expect(withPreviousStop(alts, null)).toBe(alts)
  })

  it("prepends the previous stop on top", () => {
    const result = withPreviousStop([stop("b", "B"), stop("c", "C")], stop("a", "A"))
    expect(result.map((s) => s.id)).toEqual(["a", "b", "c"])
  })

  it("does not duplicate when the previous stop is already listed", () => {
    const alts = [stop("b", "B"), stop("a", "A")]
    expect(withPreviousStop(alts, stop("a", "A"))).toBe(alts)
  })
})
