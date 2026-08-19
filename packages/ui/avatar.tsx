"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@joblane/utils"

type AvatarRootProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
type AvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
type AvatarFallbackProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>

const Avatar = React.forwardRef<HTMLDivElement, AvatarRootProps>(
  (props, ref) => {
    const { className, ...rest } = props
    return React.createElement(AvatarPrimitive.Root, {
      ref,
      className: cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      ),
      ...rest
    })
  }
)
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<HTMLImageElement, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>>(
  (props, ref) => {
    const { className, ...rest } = props
    return React.createElement(AvatarPrimitive.Image, {
      ref,
      className: cn("aspect-square h-full w-full", className),
      ...rest
    })
  }
)
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>>(
  (props, ref) => {
    const { className, ...rest } = props
    return React.createElement(AvatarPrimitive.Fallback, {
      ref,
      className: cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      ),
      ...rest
    })
  }
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
