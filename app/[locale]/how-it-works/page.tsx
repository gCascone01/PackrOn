import type { Metadata } from "next"
import { HowItWorksPage } from "@/components/how-it-works-page"
import { isLocale, translate } from "@/lib/i18n"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: localeParam } = await params
  const locale = isLocale(localeParam) ? localeParam : "en"

  return {
    title: translate(locale, "navHow"),
    description: translate(locale, "howIntro"),
  }
}

export default function Page() {
  return <HowItWorksPage />
}
