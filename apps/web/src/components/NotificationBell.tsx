"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { notificationApi, type Notification } from "@/lib/api"
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

export function NotificationBell() {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [authenticated, setAuthenticated] = React.useState(true)

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const count = await notificationApi.unreadCount()
      setUnreadCount(count)
    } catch {
      setAuthenticated(false)
    }
  }, [])

  React.useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await notificationApi.list(1, 10)
      setNotifications(res.items)
      setUnreadCount(res.unread_count)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

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
      setOpen(false)
      router.push(notification.action_url)
    }
  }

  if (!authenticated) return null

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Bildirişlər">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] rounded-full"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Bildirişlər</span>
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleMarkAllRead()
              }}
              className="text-xs text-primary hover:underline font-normal"
            >
              Hamısını oxunmuş et
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-3 w-full rounded bg-muted animate-pulse" />
                <div className="h-2 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Bildiriş yoxdur
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer",
                  !notification.is_read && "bg-accent/50"
                )}
                onSelect={(e) => {
                  e.preventDefault()
                  handleNotificationClick(notification)
                }}
              >
                <p
                  className={cn(
                    "text-sm leading-snug",
                    !notification.is_read && "font-semibold"
                  )}
                >
                  {notification.title}
                </p>
                {notification.message && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message.length > 100
                      ? notification.message.slice(0, 100) + "…"
                      : notification.message}
                  </p>
                )}
                <span className="text-xs text-muted-foreground">
                  {timeAgo(notification.created_at)}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center cursor-pointer">
          <Link href="/notifications" className="w-full text-center text-sm text-primary">
            Bütün bildirişlərə bax
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
