"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import type { PasskeyListItem } from "@supabase/supabase-js"
import { AlertTriangle, Check, KeyRound, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { useI18n } from "@/components/locale-provider"
import { localizedPath } from "@/lib/paths"
import { getPasskeyErrorCode, isPasskeyCancelled } from "@/lib/passkeys"
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
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([])
  const [passkeysLoading, setPasskeysLoading] = useState(false)
  const [registeringPasskey, setRegisteringPasskey] = useState(false)
  const [removingPasskeyId, setRemovingPasskeyId] = useState<string | null>(null)
  const [passkeyError, setPasskeyError] = useState<string | null>(null)
  const [passkeyNotice, setPasskeyNotice] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setUsername(displayName(user))
      setSaved(false)
    }
  }, [user])

  useEffect(() => {
    if (!user || !configured) return
    let cancelled = false
    setPasskeysLoading(true)
    setPasskeyError(null)
    createClient()
      .auth.passkey.list()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          if (!isPasskeyCancelled(error)) setPasskeyError(t("accountPasskeyFail"))
        } else {
          setPasskeys(data ?? [])
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && !isPasskeyCancelled(err)) setPasskeyError(t("accountPasskeyFail"))
      })
      .finally(() => {
        if (!cancelled) setPasskeysLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, configured])

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

  const mapPasskeyError = (error: unknown): string | null => {
    // A dismissed browser prompt is not an error — stay silent.
    if (isPasskeyCancelled(error)) return null
    const code = getPasskeyErrorCode(error)
    if (code === "passkey_disabled") return t("authPasskeyUnavailable")
    if (code === "email_not_confirmed") return t("accountPasskeyConfirmEmail")
    if (code === "webauthn_credential_exists") return t("accountPasskeyExists")
    const raw = error instanceof Error ? error.message : ""
    if (raw.toLowerCase().includes("does not support webauthn")) return t("authPasskeyUnsupported")
    return t("accountPasskeyFail")
  }

  const registerPasskey = async () => {
    setPasskeyError(null)
    setPasskeyNotice(null)
    setRegisteringPasskey(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.registerPasskey()
      if (error) {
        const mapped = mapPasskeyError(error)
        if (mapped) setPasskeyError(mapped)
        return
      }
      if (data) {
        const { data: list } = await supabase.auth.passkey.list()
        setPasskeys(list ?? [])
        setPasskeyNotice(t("accountPasskeyAdded"))
      }
    } catch (err) {
      const mapped = mapPasskeyError(err)
      if (mapped) setPasskeyError(mapped)
    } finally {
      setRegisteringPasskey(false)
    }
  }

  const removePasskey = async (passkeyId: string) => {
    setPasskeyError(null)
    setPasskeyNotice(null)
    setRemovingPasskeyId(passkeyId)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.passkey.delete({ passkeyId })
      if (error) {
        setPasskeyError(t("accountPasskeyFail"))
        return
      }
      setPasskeys((prev) => prev.filter((item) => item.id !== passkeyId))
      setPasskeyNotice(t("accountPasskeyRemoved"))
    } catch {
      setPasskeyError(t("accountPasskeyFail"))
    } finally {
      setRemovingPasskeyId(null)
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

        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-foreground">
            <KeyRound className="size-5" />
            {t("accountPasskeysTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("accountPasskeysBody")}</p>
          <div className="mt-4 flex flex-col gap-3">
            {passkeysLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {t("authWorking")}
              </p>
            ) : passkeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("accountPasskeyEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {passkeys.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.friendly_name || "Passkey"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={removingPasskeyId !== null || registeringPasskey}
                      onClick={() => removePasskey(item.id)}
                    >
                      {removingPasskeyId === item.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      {removingPasskeyId === item.id ? t("accountPasskeyRemoving") : t("accountPasskeyRemove")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {passkeyError ? (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {passkeyError}
              </p>
            ) : null}
            {passkeyNotice ? (
              <p role="status" className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-foreground">
                <Check className="size-4 text-brand" /> {passkeyNotice}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={registeringPasskey || removingPasskeyId !== null}
              onClick={registerPasskey}
            >
              {registeringPasskey ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              {registeringPasskey ? t("accountPasskeyAdding") : t("accountPasskeyAdd")}
            </Button>
          </div>
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
                          data?.error === "account_setup_required" || data?.error === "setup_required"
                            ? t("accountSetupRequired")
                            : t("accountDeleteFail"),
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
