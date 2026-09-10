import type { Metadata } from "next"
import { ExamplesPage } from "@/components/examples-page"

export const metadata: Metadata = {
  title: "Esempi — PackrOn",
  description: "Apri itinerari di esempio: un road trip in Europa centrale e un city trip a Siviglia.",
}

export default function Page() {
  return <ExamplesPage />
}
