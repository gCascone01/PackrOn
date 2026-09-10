import { NextResponse } from "next/server"
import { loadShare } from "@/lib/share-store"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const itinerary = await loadShare(id)
  if (!itinerary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ itinerary })
}
