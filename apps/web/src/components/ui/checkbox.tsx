"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends React.ComponentPropsWithoutRef<"input"> {
  label?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, checked: checkedProp, onCheckedChange, ...props }, ref) => {
  const [localChecked, setLocalChecked] = React.useState(checkedProp)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked
    setLocalChecked(value)
    onCheckedChange?.(value)
  }
  return <input
    type="checkbox"
    checked={localChecked}
    onChange={handleChange}
    className={cn("rounded border border-border px-4 py-2 bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer dark:bg-gray-900", className)}
    {...props}
    ref={ref}
  />
})

Checkbox.displayName = "Checkbox"

