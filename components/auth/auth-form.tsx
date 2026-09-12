"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { LogIn, UserPlus, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { defaultUsername } from "@/lib/username"
import { localizedPath } from "@/lib/paths"
import { useI18n } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Mode = "login" | "signup"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function AuthForm({
  initialMode = "login",
  onSuccess,
  compact = false,
}: {
  initialMode?: Mode
  onSuccess?: () => void
  compact?: boolean
}) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const configured = isSupabaseConfigured()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setFieldError(null)
    setServerError(null)
    setInfo(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!EMAIL_RE.test(cleanEmail)) {
      setFieldError(t("authInvalidEmail"))
      return
    }
    if (password.length < 8) {
      setFieldError(t("authPasswordShort"))
      return
    }
    if (!configured) {
      setServerError(t("authNotConfigured"))
      return
    }

    setPending(true)
    try {
      const supabase = createClient()
      if (mode === "signup") {
        const siteUrl =
          typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL ?? ""
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { username: defaultUsername(cleanEmail) },
            ...(siteUrl
              ? { emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(localizedPath(locale, "/trips"))}` }
              : {}),
          },
        })
        if (error) throw error
        // When email confirmation is on, there is no session yet.
        if (data.session) {
          onSuccess?.()
          router.push(localizedPath(locale, "/trips"))
          router.refresh()
        } else {
          setInfo(t("authCheckEmail"))
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })
        if (error) throw error
        onSuccess?.()
        router.push(localizedPath(locale, "/trips"))
        router.refresh()
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : t("authGenericError")
      const low = raw.toLowerCase()
      if (low.includes("invalid login credentials")) setServerError(t("authWrongCredentials"))
      else if (low.includes("already registered") || low.includes("user already")) setServerError(t("authAlreadyRegistered"))
      else if (low.includes("rate limit") || low.includes("too many requests")) setServerError(t("authRateLimited"))
      else setServerError(raw.length > 200 ? t("authGenericError") : raw)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-5", compact ? "" : "mx-auto w-full max-w-md")}>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/60 p-1" role="tablist" aria-label={t("authTitle")}>
        {(["login", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m)
              setServerError(null)
              setInfo(null)
              setFieldError(null)
            }}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
              mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "login" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
            {m === "login" ? t("authLogin") : t("authSignup")}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-sm font-medium text-foreground">
            {t("authEmail")}
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className="text-sm font-medium text-foreground">
            {t("authPassword")}
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
          <p className="text-xs text-muted-foreground">{t("authPasswordHint")}</p>
        </div>

        {fieldError ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {fieldError}
          </p>
        ) : null}
        {serverError ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </p>
        ) : null}
        {info ? (
          <p role="status" className="rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-foreground">
            {info}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? <Loader2 className="size-4 animate-spin" /> : mode === "login" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
          {pending ? t("authWorking") : mode === "login" ? t("authLoginAction") : t("authSignupAction")}
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">{t("authSecurityNote")}</p>
      </form>
    </div>
  )
}
