import { NextResponse } from "next/server"
import { isItinerary } from "@/lib/share"
import { saveShare } from "@/lib/share-store"

export async function POST(request: Request) {
  try {
    const itinerary = (await request.json()) as unknown
    if (!isItinerary(itinerary)) {
      return NextResponse.json({ error: "Invalid itinerary" }, { status: 400 })
    }
    const id = await saveShare(itinerary)
    return NextResponse.json({ id })
  } catch {
    return NextResponse.json({ error: "Could not store itinerary" }, { status: 500 })
  }
}
