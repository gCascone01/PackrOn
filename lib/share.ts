import type { Locale } from "./i18n"
import type { Itinerary } from "./types"
import { localizedPath } from "./paths"

const PREFIX = "v1."
const QUERY_SAFE_LENGTH = 6000

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlToBytes(token: string): Uint8Array {
  const padded = token.replace(/-/g, "+").replace(/_/g, "/")
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function gzipEncode(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gzipDecode(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))
  return new Response(stream).text()
}

export function isItinerary(value: unknown): value is Itinerary {
  if (!value || typeof value !== "object") return false
  const v = value as Itinerary
  return (
    (v.mode === "road" || v.mode === "city") &&
    typeof v.title === "string" &&
    typeof v.origin === "string" &&
    Array.isArray(v.days) &&
    Array.isArray(v.tollNotices) &&
    v.vehicle != null &&
    typeof v.vehicle === "object"
  )
}

export async function encodeItinerary(itinerary: Itinerary): Promise<string> {
  const bytes = await gzipEncode(JSON.stringify(itinerary))
  return PREFIX + bytesToBase64Url(bytes)
}

export async function decodeItinerary(token: string): Promise<Itinerary | null> {
  const raw = token.trim()
  if (!raw.startsWith(PREFIX)) return null
  try {
    const json = await gzipDecode(base64UrlToBytes(raw.slice(PREFIX.length)))
    const parsed: unknown = JSON.parse(json)
    return isItinerary(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function readShareTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null
  const query = new URLSearchParams(window.location.search).get("d")
  if (query) return query
  const hash = window.location.hash.replace(/^#/, "")
  if (!hash) return null
  return hash.startsWith("d=") ? hash.slice(2) : hash
}

export function buildShareUrl(origin: string, token: string, locale: Locale = "en"): string {
  const base = `${origin}${localizedPath(locale, "/i")}`
  if (token.length <= QUERY_SAFE_LENGTH) {
    return `${base}?d=${encodeURIComponent(token)}`
  }
  return `${base}#${token}`
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const input = document.createElement("textarea")
    input.value = text
    input.setAttribute("readonly", "")
    input.style.position = "fixed"
    input.style.left = "-9999px"
    document.body.appendChild(input)
    input.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(input)
    if (!ok) throw new Error("copy failed")
  }
}
