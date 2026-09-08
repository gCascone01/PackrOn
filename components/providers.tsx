"use client"

import type { ReactNode } from "react"
import { LocaleProvider } from "@/components/locale-provider"

export function Providers({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>
}
