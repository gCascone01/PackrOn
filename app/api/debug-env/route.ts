import { NextResponse } from "next/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"

// TEMPORARY DEBUG ENDPOINT — DELETE AFTER USE.
// Reports *presence/metadata* only. Never dumps secret values.
export const dynamic = "force-dynamic"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  const activeKey = pub || anon

  // Names only for NEXT_PUBLIC_* — catches typos like SUPABASE_URL
  // without NEXT_PUBLIC_ prefix without leaking values.
  const nextPublicNames = Object.keys(process.env)
    .filter((k) => k.startsWith("NEXT_PUBLIC_"))
    .sort()

  return NextResponse.json({
    temp: "DELETE THIS ROUTE AFTER DEBUGGING",
    timestamp: new Date().toISOString(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    configured: isSupabaseConfigured(),
    supabase: {
      urlPresent: url.length > 0,
      // URL is public by design, safe to show.
      url,
      keySource: pub ? "PUBLISHABLE" : anon ? "ANON_FALLBACK" : "MISSING",
      keyLength: activeKey.length,
      // First few chars only (e.g. "sb_publ...") to verify shape without leaking.
      keyPrefix: activeKey ? `${activeKey.slice(0, 8)}...` : null,
    },
    nextPublicNames,
    siteUrlPresent: (process.env.NEXT_PUBLIC_SITE_URL ?? "").length > 0,
  })
}
