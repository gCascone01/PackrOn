import { describe, expect, it } from "vitest"
import { isOverloadedError } from "./gemini"

describe("isOverloadedError", () => {
  it("detects the SDK 503 high-demand blob", () => {
    const sdkError = new Error(
      '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}',
    )
    expect(isOverloadedError(sdkError)).toBe(true)
  })

  it("detects structured status fields", () => {
    expect(isOverloadedError({ status: 503 })).toBe(true)
    expect(isOverloadedError({ error: { code: 503, status: "UNAVAILABLE" } })).toBe(true)
    expect(isOverloadedError(new Error("The model is overloaded, please retry"))).toBe(true)
  })

  it("ignores unrelated failures", () => {
    expect(isOverloadedError(new Error("MISSING_KEY"))).toBe(false)
    expect(isOverloadedError(new Error("Invalid JSON body"))).toBe(false)
    expect(isOverloadedError({ status: 400 })).toBe(false)
    expect(isOverloadedError(null)).toBe(false)
    expect(isOverloadedError("503")).toBe(false)
  })
})
