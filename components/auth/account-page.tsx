"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Check, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { useI18n } from "@/components/locale-provider"
import { localizedPath } from "@/lib/paths"
import { createClient } from "@/lib/supabase/client"
import { displayName, isValidUsername } from "@/lib/username"
import { Button } from "@/components/ui/button"

export function AccountPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { user, loading: authLoading, configured, signOut } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(displayName(user))
      setSaved(false)
    }
  }, [user])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto flex max-w-md items-center gap-2 px-4 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("authWorking")}
        </main>
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-16">
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t("authNotConfigured")}
          </p>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t("tripsSignInPrompt")}</p>
          <Button size="lg" className="mt-4" onClick={() => setDialogOpen(true)}>
            {t("authLogin")}
          </Button>
          <AuthDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
        </main>
      </div>
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaved(false)

    const cleanUsername = username.trim()
    if (!isValidUsername(cleanUsername)) {
      setError(t("accountInvalidUsername"))
      return
    }
    if (password.length > 0) {
      if (password.length < 8) {
        setError(t("authPasswordShort"))
        return
      }
      if (password !== confirm) {
        setError(t("accountPasswordMismatch"))
        return
      }
    }

    setPending(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        ...(password.length > 0 ? { password } : {}),
        data: { username: cleanUsername },
      })
      if (updateError) throw updateError
      setPassword("")
      setConfirm("")
      setSaved(true)
    } catch (err) {
      const raw = err instanceof Error ? err.message : t("accountSaveFail")
      setError(raw.length > 200 ? t("accountSaveFail") : raw)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">{t("accountTitle")}</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">{t("accountSubtitle")}</p>
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="account-email" className="text-sm font-medium text-foreground">
                {t("accountEmail")}
              </label>
              <input
                id="account-email"
                type="email"
                value={user.email ?? ""}
                disabled
                className="h-10 rounded-xl border border-border bg-muted px-3 text-sm text-muted-foreground outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="account-username" className="text-sm font-medium text-foreground">
                {t("accountUsername")}
              </label>
              <input
                id="account-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
              <p className="text-xs text-muted-foreground">{t("accountUsernameHint")}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="account-password" className="text-sm font-medium text-foreground">
                {t("accountNewPassword")}
              </label>
              <input
                id="account-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
              <p className="text-xs text-muted-foreground">{t("accountNewPasswordHint")}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="account-confirm" className="text-sm font-medium text-foreground">
                {t("accountConfirmPassword")}
              </label>
              <input
                id="account-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
            </div>

            {error ? (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {saved ? (
              <p role="status" className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-foreground">
                <Check className="size-4 text-brand" /> {t("accountSaved")}
              </p>
            ) : null}

            <Button type="submit" size="lg" disabled={pending} className="w-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {pending ? t("accountSaving") : t("accountSave")}
            </Button>
          </form>
        </div>

        <div className="mt-6 rounded-3xl border border-destructive/30 bg-card p-6 shadow-xl sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-destructive">
            <AlertTriangle className="size-5" />
            {t("accountDangerTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("accountDeleteWarning")}</p>
          {!confirmingDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="mt-4 w-full"
              onClick={() => {
                setConfirmingDelete(true)
                setDeleteInput("")
                setDeleteError(null)
              }}
            >
              {t("accountDelete")}
            </Button>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <label htmlFor="account-delete-confirm" className="text-sm font-medium text-foreground">
                {t("accountDeleteConfirmLabel")} (<span className="font-bold">{displayName(user)}</span>)
              </label>
              <input
                id="account-delete-confirm"
                type="text"
                autoComplete="off"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={displayName(user)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-destructive focus:ring-2 focus:ring-destructive/25"
              />
              {deleteError ? (
                <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {deleteError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  disabled={deleting}
                  onClick={() => {
                    setConfirmingDelete(false)
                    setDeleteInput("")
                    setDeleteError(null)
                  }}
                >
                  {t("back")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  className="flex-1"
                  disabled={deleting || deleteInput.trim() !== displayName(user)}
                  onClick={async () => {
                    setDeleting(true)
                    setDeleteError(null)
                    try {
                      const res = await fetch("/api/account", { method: "DELETE" })
                      const data = (await res.json().catch(() => null)) as { error?: string } | null
                      if (!res.ok) {
                        throw new Error(
                          data?.error === "setup_required" ? t("tripsSetupRequired") : t("accountDeleteFail"),
                        )
                      }
                      await signOut()
                      router.push(localizedPath(locale, "/"))
                      router.refresh()
                    } catch (err) {
                      setDeleteError(err instanceof Error ? err.message : t("accountDeleteFail"))
                    } finally {
                      setDeleting(false)
                    }
                  }}
                >
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {deleting ? t("accountDeleting") : t("accountDelete")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
