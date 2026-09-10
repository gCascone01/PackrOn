import { describe, expect, it } from "vitest"
import { localizedPath, swapLocaleInPath } from "./paths"

describe("paths", () => {
  it("prefixes locale onto app paths", () => {
    expect(localizedPath("it", "/")).toBe("/it")
    expect(localizedPath("en", "/come-funziona")).toBe("/en/come-funziona")
  })

  it("swaps the locale segment in place", () => {
    expect(swapLocaleInPath("/it/esempi", "en")).toBe("/en/esempi")
    expect(swapLocaleInPath("/come-funziona", "en")).toBe("/en/come-funziona")
  })
})
