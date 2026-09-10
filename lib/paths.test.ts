import { describe, expect, it } from "vitest"
import { localizedPath, swapLocaleInPath } from "./paths"

describe("paths", () => {
  it("prefixes locale onto app paths", () => {
    expect(localizedPath("en", "/")).toBe("/en")
    expect(localizedPath("it", "/how-it-works")).toBe("/it/how-it-works")
  })

  it("swaps the locale segment in place", () => {
    expect(swapLocaleInPath("/it/examples", "en")).toBe("/en/examples")
    expect(swapLocaleInPath("/how-it-works", "en")).toBe("/en/how-it-works")
  })
})
