import { describe, expect, it } from "vitest"
import { getPasskeyErrorCode, isPasskeyCancelled } from "./passkeys"

describe("getPasskeyErrorCode", () => {
  it("returns the lowercased code", () => {
    expect(getPasskeyErrorCode({ code: "passkey_disabled" })).toBe("passkey_disabled")
    expect(getPasskeyErrorCode({ code: "Over_Email_Send_Rate_Limit" })).toBe("over_email_send_rate_limit")
  })

  it("returns empty string for missing code or non-objects", () => {
    expect(getPasskeyErrorCode({})).toBe("")
    expect(getPasskeyErrorCode(null)).toBe("")
    expect(getPasskeyErrorCode(undefined)).toBe("")
    expect(getPasskeyErrorCode("passkey_disabled")).toBe("")
    expect(getPasskeyErrorCode(new Error("boom"))).toBe("")
  })
})

describe("isPasskeyCancelled", () => {
  it("detects direct DOMException names", () => {
    expect(isPasskeyCancelled({ name: "NotAllowedError" })).toBe(true)
    expect(isPasskeyCancelled({ name: "AbortError" })).toBe(true)
  })

  it("detects WebAuthnError wrapping a DOMException in cause", () => {
    expect(
      isPasskeyCancelled({
        name: "NotAllowedError",
        code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
        cause: { name: "NotAllowedError", message: "operation timed out" },
      }),
    ).toBe(true)
  })

  it("detects deeply nested causes", () => {
    expect(isPasskeyCancelled({ cause: { cause: { name: "AbortError" } } })).toBe(true)
  })

  it("detects aborted ceremonies by code", () => {
    expect(isPasskeyCancelled({ code: "ERROR_CEREMONY_ABORTED" })).toBe(true)
  })

  it("ignores server and unrelated errors", () => {
    expect(isPasskeyCancelled({ code: "passkey_disabled" })).toBe(false)
    expect(isPasskeyCancelled({ code: "webauthn_credential_not_found" })).toBe(false)
    expect(isPasskeyCancelled({ name: "SecurityError", code: "ERROR_RP_ID_MISMATCH" })).toBe(false)
    expect(isPasskeyCancelled(new Error("boom"))).toBe(false)
    expect(isPasskeyCancelled(null)).toBe(false)
    expect(isPasskeyCancelled(undefined)).toBe(false)
  })

  it("terminates on circular cause chains", () => {
    const circular: { cause?: unknown } = {}
    circular.cause = circular
    expect(isPasskeyCancelled(circular)).toBe(false)
  })
})
