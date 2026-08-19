import * as React from "react"
import { cn } from "@/lib/utils"

const Card = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const { className, ...rest } = props
  return (
    <div
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...rest}
    />
  )
}

Card.displayName = "Card"

const CardHeader = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const { className, ...rest } = props
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...rest} />
  )
}
CardHeader.displayName = "CardHeader"

const CardTitle = (props: React.HTMLAttributes<HTMLHeadingElement>) => {
  const { className, ...rest } = props
  return <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...rest} />
}
CardTitle.displayName = "CardTitle"

const CardDescription = (props: React.HTMLAttributes<HTMLParagraphElement>) => {
  const { className, ...rest } = props
  return <p className={cn("text-sm text-muted-foreground", className)} {...rest} />
}
CardDescription.displayName = "CardDescription"

const CardContent = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const { className, ...rest } = props
  return (
    <div className={cn("p-6 pt-0", className)} {...rest} />
  )
}
CardContent.displayName = "CardContent"

const CardFooter = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const { className, ...rest } = props
  return (
    <div className={cn("flex items-center p-6 pt-0", className)} {...rest} />
  )
}
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }