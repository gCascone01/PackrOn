import { NextResponse, type NextRequest } from "next/server"
import { isLocale, type Locale } from "@/lib/i18n"
import { updateSession } from "@/lib/supabase/middleware"

function preferredLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get("packron-locale")?.value
  if (isLocale(cookie)) return cookie
  const header = request.headers.get("accept-language")?.toLowerCase() ?? ""
  return header.startsWith("it") ? "it" : "en"
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api") || pathname.startsWith("/auth") || pathname.startsWith("/_next") || pathname.includes(".")) {
    // Keep Supabase session cookies fresh on API/auth calls too.
    return updateSession(request)
  }

  // Legacy route redirects
  if (pathname.includes("/come-funziona")) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace("/come-funziona", "/how-it-works")
    return NextResponse.redirect(url)
  }
  if (pathname.includes("/esempi")) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace("/esempi", "/examples")
    return NextResponse.redirect(url)
  }

  const first = pathname.split("/")[1]
  if (isLocale(first)) {
    const supabaseResponse = await updateSession(request)
    supabaseResponse.cookies.set("packron-locale", first, { path: "/", maxAge: 60 * 60 * 24 * 365 })
    return supabaseResponse
  }

  const locale = preferredLocale(request)
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`
  const response = NextResponse.redirect(url)
  response.cookies.set("packron-locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 })
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

