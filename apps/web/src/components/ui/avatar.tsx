import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"
import { AvatarRootProps, AvatarImageProps, AvatarFallbackProps } from "./avatar.types"

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

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
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

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
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
