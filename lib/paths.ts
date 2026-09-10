import { isLocale, type Locale } from "./i18n"

export function localizedPath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`
  return `/${locale}${clean === "/" ? "" : clean}`
}

export function swapLocaleInPath(pathname: string, locale: Locale): string {
  const parts = pathname.split("/")
  if (isLocale(parts[1])) {
    parts[1] = locale
    const next = parts.join("/")
    return next.startsWith("/") ? next : `/${next}`
  }
  return localizedPath(locale, pathname || "/")
}
