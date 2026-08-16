"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = SelectPrimitive.Trigger
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = SelectPrimitive.ScrollUpButton
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = SelectPrimitive.ScrollDownButton
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = SelectPrimitive.Content
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = SelectPrimitive.Label
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = SelectPrimitive.Item
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = SelectPrimitive.Separator
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
