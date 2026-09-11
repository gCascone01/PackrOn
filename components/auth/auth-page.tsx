"use client"

import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { AuthForm } from "@/components/auth/auth-form"
import { useAuth } from "@/components/auth/auth-provider"
import { useI18n } from "@/components/locale-provider"
import { localizedPath } from "@/lib/paths"

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { t, locale } = useI18n()
  const { configured } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            {t("authTitle")}
          </h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">{t("authSubtitle")}</p>
          {configured === false ? (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t("authNotConfigured")}
            </p>
          ) : (
            <AuthForm initialMode={mode} />
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {t("authSignup")} ·{" "}
                <Link href={localizedPath(locale, "/signup")} className="font-semibold text-brand hover:underline">
                  {t("authSignupAction")}
                </Link>
              </>
            ) : (
              <>
                {t("authLogin")} ·{" "}
                <Link href={localizedPath(locale, "/login")} className="font-semibold text-brand hover:underline">
                  {t("authLoginAction")}
                </Link>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  )
}
