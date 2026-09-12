import { describe, expect, it } from "vitest"
import { defaultUsername, displayName, isValidUsername } from "./username"
import type { User } from "@supabase/supabase-js"

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
    ...overrides,
  } as User
}

describe("defaultUsername", () => {
  it("trims the domain off the email", () => {
    expect(defaultUsername("Mario.Rossi@example.com")).toBe("Mario.Rossi")
  })

  it("strips invalid characters and caps length", () => {
    expect(defaultUsername("a+b@c.com")).toBe("traveler")
    expect(defaultUsername("x".repeat(50) + "@e.com")).toBe("x".repeat(30))
  })

  it("falls back when nothing usable remains", () => {
    expect(defaultUsername("@@")).toBe("traveler")
    expect(defaultUsername("ab@e.com")).toBe("traveler")
  })
})

describe("isValidUsername", () => {
  it("accepts 3-30 chars of letters, digits, ._-", () => {
    expect(isValidUsername("mario_99")).toBe(true)
    expect(isValidUsername("ab")).toBe(false)
    expect(isValidUsername("a b")).toBe(false)
    expect(isValidUsername("x".repeat(31))).toBe(false)
  })
})

describe("displayName", () => {
  it("prefers stored metadata, then email prefix, then email", () => {
    expect(displayName(fakeUser({ email: "a@e.com", user_metadata: { username: "custom" } }))).toBe("custom")
    expect(displayName(fakeUser({ email: "Mario@example.com" }))).toBe("Mario")
    expect(displayName(fakeUser({}))).toBe("Account")
  })

  it("ignores invalid stored usernames", () => {
    expect(displayName(fakeUser({ email: "Mario@example.com", user_metadata: { username: "x" } }))).toBe("Mario")
  })
})
