import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

export type AvatarRootProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
export type AvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
export type AvatarFallbackProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
export type AvatarRootRef = React.Ref<HTMLDivElement>
export type AvatarImageRef = React.Ref<HTMLImageElement>
export type AvatarFallbackRef = React.Ref<HTMLDivElement>
