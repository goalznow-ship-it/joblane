"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) =>
  React.createElement(SelectPrimitive.Trigger, {
    ref,
    className: "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
    ...props,
    children: React.createElement(React.Fragment, null,
      children,
      React.createElement(SelectPrimitive.Icon, { asChild: true },
        React.createElement(ChevronDown, { className: "h-4 w-4 opacity-50" })
      )
    )
  })
)
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) =>
  React.createElement(SelectPrimitive.ScrollUpButton, {
    ref,
    className: "flex cursor-default items-center justify-center py-1",
    ...props,
    children: React.createElement(ChevronUp, { className: "h-4 w-4" })
  })
)
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) =>
  React.createElement(SelectPrimitive.ScrollDownButton, {
    ref,
    className: "flex cursor-default items-center justify-center py-1",
    ...props,
    children: React.createElement(ChevronDown, { className: "h-4 w-4" })
  })
)
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => {
  const viewportClassName = position === "popper" ? "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]" : "p-1"
  return React.createElement(SelectPrimitive.Portal, null,
    React.createElement(SelectPrimitive.Content, {
      ref,
      className: "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      position,
      children: React.createElement(React.Fragment, null,
        React.createElement(SelectPrimitive.ScrollUpButton, null),
        React.createElement(SelectPrimitive.Viewport, {
          className: position === "popper" ? "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]" : "p-1"
        }, children),
        React.createElement(SelectPrimitive.ScrollDownButton, null)
      )
    })
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) =>
  React.createElement(SelectPrimitive.Label, {
    ref,
    className: "py-1.5 pl-8 pr-2 text-sm font-semibold",
    ...props
  })
)
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) =>
  React.createElement(SelectPrimitive.Item, {
    ref,
    className: "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    ...props,
    children: React.createElement(React.Fragment, null,
      React.createElement("span", {
        className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center"
      }, React.createElement(SelectPrimitive.ItemIndicator, null,
        React.createElement("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
          React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" })
        )
      )),
      React.createElement(SelectPrimitive.ItemText, null, children)
    )
  })
)
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) =>
  React.createElement(SelectPrimitive.Separator, {
    ref,
    className: "-mx-1 my-1 h-px bg-muted",
    ...props
  })
)
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
