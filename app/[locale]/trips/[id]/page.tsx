import { SavedTripView } from "@/components/trips/saved-trip-view"

export default async function SavedTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SavedTripView tripId={id} />
}
