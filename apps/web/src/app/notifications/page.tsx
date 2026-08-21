"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Briefcase,
  Building2,
  Shield,
  Lock,
  Loader2,
} from "lucide-react"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { notificationApi, type Notification, ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return "indi"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} dəq əvvəl`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} saat əvvəl`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay} gün əvvəl`
  const diffMonth = Math.floor(diffDay / 30)
  return `${diffMonth} ay əvvəl`
}

function notificationIcon(type: string) {
  switch (type) {
    case "APPLICATION_STATUS":
      return <Briefcase className="h-5 w-5 text-blue-500" />
    case "JOB_APPROVED":
    case "JOB_REJECTED":
      return <Briefcase className="h-5 w-5 text-blue-500" />
    case "COMPANY_APPROVED":
    case "COMPANY_REJECTED":
      return <Building2 className="h-5 w-5 text-purple-500" />
    case "ACCOUNT_SUSPENDED":
    case "ACCOUNT_BLOCKED":
      return <Shield className="h-5 w-5 text-red-500" />
    case "PASSWORD_CHANGED":
    case "PASSWORD_RESET":
      return <Lock className="h-5 w-5 text-yellow-500" />
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [total, setTotal] = React.useState(0)
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(true)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(true)

  React.useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await notificationApi.list(1, 20)
        setNotifications(res.items)
        setTotal(res.total)
        setUnreadCount(res.unread_count)
        setHasMore(res.items.length < res.total)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/auth/login")
        }
      } finally {
        setLoading(false)
      }
    }
    fetchInitial()
  }, [router])

  const loadMore = async () => {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const res = await notificationApi.list(nextPage, 20)
      setNotifications((prev) => [...prev, ...res.items])
      setPage(nextPage)
      setHasMore(notifications.length + res.items.length < res.total)
    } catch {
      // ignore
    } finally {
      setLoadingMore(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await notificationApi.markAllRead()
      setUnreadCount(res.unread_count)
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
    } catch {
      // ignore
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        const res = await notificationApi.markRead(notification.id)
        setUnreadCount(res.unread_count)
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        )
      } catch {
        // ignore
      }
    }
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Bildirişlər</h1>
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} oxunmamış</Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                Hamısını oxunmuş et
              </Button>
            )}
          </div>

          <Separator className="mb-6" />

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">Bildiriş yoxdur</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Hələlik heç bir bildirişiniz yoxdur. Yeni bildirişlər burada görünəcək.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full flex items-start gap-4 p-4 rounded-lg border text-left transition-colors hover:bg-accent/50",
                    !notification.is_read && "bg-accent/30 border-primary/20"
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {notificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        !notification.is_read && "font-semibold"
                      )}
                    >
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    {(notification.entity_type || notification.entity_id) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.entity_type}
                        {notification.entity_id && ` #${notification.entity_id}`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeAgo(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="shrink-0 mt-1">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Yüklənir...
                  </>
                ) : (
                  "Daha çox yüklə"
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
