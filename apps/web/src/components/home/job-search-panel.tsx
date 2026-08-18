"use client"

import * as React from "react"
import { Search, MapPin, ChevronDown } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface JobSearchPanelProps {
  placeholder?: string
  secondaryPlaceholder?: string
  primaryButtonText?: string
  secondaryButtonText?: string
  secondaryButtonHref?: string
}

export default function JobSearchPanel({
  placeholder = "Vəzifə, bacarıq vəya şirkət",
  secondaryPlaceholder = "Şəhər və ya region",
  primaryButtonText = "İş tap",
  secondaryButtonText = "Əlavə filtrlər",
  secondaryButtonHref = "/jobs",
}: JobSearchPanelProps) {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="absolute inset-0">
        <svg className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0m0-10a7 7 0 1014 0 7 7 0 01-14 0m6.364-6.364l-.707-.707L18.636 13.9a1.998 1.998 0 01.03-.125l.07.07a1.995 1.995 0 01-.124.03L21 12l-3.364 3.363a.997.997 0 01-.078.068l-.009.008-.07.07a1.996 1.996 0 01-.123.03L14.073 16.923a1.996 1.996 0 01-.108.026L11 21l6 6m0-10l6 6m-6-6l-6 6m6.364 6.364l.707.707L5.364 10.9a1.997 1.997 0 01-.03-.125l-.07-.07a1.995 1.995 0 01.124-.03L3 12l3.364-3.363a.997.997 0 01.068-.078l.008-.009.07-.07a1.996 1.996 0 01.03-.123l7.96-7.96z"/></svg>
      </div>

      <form className="relative flex w-full gap-2 px-4 py-3 rounded-2xl bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2" onSubmit={e => e.preventDefault()}>

        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0m0-10a7 7 0 1014 0 7 7 0 01-14 0"/></svg>
          <input
            type="text"
            name="q"
            placeholder={placeholder}
            className="pl-10 w-full rounded-xl bg-transparent outline-none placeholder-text-muted-foreground transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>

        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.8m0 4h.9a7 7 0 111.4 0l-.5-3.1a3.5 3.5 0 00-.9-3.5 3.5 3.5 0 00-3.5 3.5 0 003.4 2.1m8.5 0a3 3 0 01-3.5 3.5 3 3 0 003.5 3.5 3 3 0 00-3.5-3.5M5.5 11.5a3 3 0 001.8 3.08l.1.22.1-.22A4.5 4.5 0 008 18.5h.6a3.5 3.5 0 003.3-2.13l-.1-.22.1.22a4.5 4.5 0 011.5 1.6l.1.22.1-.22a4.5 4.5 0 011.5-1.6l-.1-.22-.1.22A4.5 4.5 0 0112 15.5a4.5 4.5 0 00-3.8-1.06l-.1-.22-.1.22a3 3 0 00-1.8 3.08l-.1.22-.1-.22a3 3 0 00-1.8-3.08A4.5 4.5 0 006.5 8.5H5a2.5 2.5 0 01-2.5-2.5z"/></svg>
          <select
            name="city"
            className="pl-8 w-full rounded-xl bg-transparent outline-none appearance-none cursor-pointer text-sm focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="Bakı" className="text-muted-foreground">
              Şəhər və ya region
            </option>
            <option value="Gəncə" className="ml-2">Gəncə</option>
            <option value="Sumqayıt" className="ml-2">Sumqayıt</option>
            <option value="Lənkəran" className="ml-2">Lənkəran</option>
            <option value="Mingəçevir" className="ml-2">Mingəçevir</option>
          </select>
        </div>

        <button
          type="submit"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {primaryButtonText}
        </button>
      </form>
    </div>
  )
}