import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Itinerario condiviso — PackrOn",
  description: "Itinerario PackrOn condiviso: tappe, mappa e dettagli del viaggio.",
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  redirect(`/${locale}/trip/${encodeURIComponent(id)}`)
}
