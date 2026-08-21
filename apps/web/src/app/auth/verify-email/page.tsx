"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authApi } from "@/lib/api"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error")
        setMessage("Təsdiq tokeni tapılmadı")
        return
      }

      try {
        await authApi.verifyEmail(token)
        setStatus("success")
        setMessage("E-poçtunuz uğurla təsdiqləndi!")
      } catch (err) {
        setStatus("error")
        setMessage("Təsdiq uğursuz oldu. Linkin müddəti bitib və ya artıq istifadə olunub.")
      }
    }

    verifyEmail()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 lg:py-20 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6" aria-label="Joblane - Ana səhifə">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                J
              </div>
              <span className="font-bold text-xl">Joblane</span>
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-border/50 p-8">
            {status === "loading" && (
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <svg className="h-8 w-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                </div>
                <h1 className="text-2xl font-bold">E-poçt təsdiqlənir...</h1>
                <p className="text-muted-foreground mt-2">Zəhmət olmasa gözləyin, yönləndirilirsiniz</p>
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span>Bu proses bir neçə saniyə vaxt apara bilər</span>
                </div>
              </div>
            )}

            {status === "success" && (
              <div className="text-center">
                <h1 className="text-2xl font-bold text-green-600">Uğurla təsdiqləndi!</h1>
                <p className="text-muted-foreground mt-2">E-poçtunuz uğurla təsdiqləndi. Hesabınız artıq aktivdir.</p>
                <div className="mt-8 text-center">
                  <Link href="/auth/login">
                    <Button className="w-full sm:w-auto" size="lg">
                      Daxil ol
                    </Button>
                  </Link>
                  <Link href="/jobs">
                    <Button variant="outline" className="w-full sm:w-auto">
                      Vakansiyaları araşdır
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="text-center">
                <h1 className="text-2xl font-bold text-red-600">Təsdiq uğursuz</h1>
                <p className="text-muted-foreground mt-2">{message || "Linkin müddəti bitib vəya artıq istifadə olunub."}</p>
                <div className="mt-8 text-center">
                  <Link href="/auth/resend-verification">
                    <Button className="w-full sm:w-auto" size="lg">
                      Yenidən link göndər
                    </Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button variant="outline" className="w-full sm:w-auto">
                      Daxil ol
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  )
}
