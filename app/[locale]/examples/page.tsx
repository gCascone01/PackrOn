import type { Metadata } from "next"
import { ExamplesPage } from "@/components/examples-page"
import { isLocale, translate } from "@/lib/i18n"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: localeParam } = await params
  const locale = isLocale(localeParam) ? localeParam : "en"

  return {
    title: translate(locale, "examplesTitle"),
    description: translate(locale, "examplesIntro"),
  }
}

export default function Page() {
  return <ExamplesPage />
}
