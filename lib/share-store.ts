import { randomBytes } from "crypto"
import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import { isItinerary } from "./share"
import type { Itinerary } from "./types"

const ID_PATTERN = /^[A-Za-z0-9_-]{6,16}$/

function sharesDir() {
  if (process.env.PACKRON_SHARE_DIR) return process.env.PACKRON_SHARE_DIR
  if (process.env.VERCEL) return path.join("/tmp", "packron-shares")
  return path.join(process.cwd(), ".data", "shares")
}

export function isShareId(value: string): boolean {
  return ID_PATTERN.test(value)
}

export async function saveShare(itinerary: Itinerary): Promise<string> {
  if (!isItinerary(itinerary)) {
    throw new Error("Invalid itinerary")
  }
  const id = randomBytes(6).toString("base64url")
  const dir = sharesDir()
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, `${id}.json`), JSON.stringify(itinerary), "utf8")
  return id
}

export async function loadShare(id: string): Promise<Itinerary | null> {
  if (!isShareId(id)) return null
  try {
    const raw = await readFile(path.join(sharesDir(), `${id}.json`), "utf8")
    const parsed: unknown = JSON.parse(raw)
    return isItinerary(parsed) ? parsed : null
  } catch {
    return null
  }
}
