"use client"

import { useState, useRef, useEffect } from "react"
import { Search, MapPin, Briefcase, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  defaultKeyword?: string
  defaultLocation?: string
  onSearch?: (keyword: string, location: string) => void
  className?: string
}

const popularSearches = [
  "Mühasib",
  "Satış meneceri",
  "Proqramçı",
  "SOC Analyst",
  "HR",
  "Sürücü",
  "Mühəndis",
  "Marketinq",
]

export function SearchBar({ defaultKeyword = "", defaultLocation = "", onSearch, className }: SearchBarProps) {
  const [keyword, setKeyword] = useState(defaultKeyword)
  const [location, setLocation] = useState(defaultLocation)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch?.(keyword.trim(), location.trim())
    setShowSuggestions(false)
  }

  const handlePopularClick = (term: string) => {
    setKeyword(term)
    onSearch?.(term, location.trim())
    setShowSuggestions(false)
  }

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    setShowSuggestions(value.length > 0)
  }

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <label htmlFor="keyword" className="sr-only">Peşə, vəzifə, bacarıq və ya şirkət</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <Input
                ref={inputRef}
                id="keyword"
                type="search"
                placeholder="Peşə, vəzifə, bacarıq və ya şirkət"
                value={keyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="pl-10 pr-4"
                autoComplete="off"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Axtarışı təmizlə"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="relative flex-1 max-w-xs">
            <label htmlFor="location" className="sr-only">Şəhər / Region</label>
            <Select>
              <SelectTrigger className="w-full" aria-label="Şəhər seçin">
                <SelectValue placeholder="Bakı / Məkan" />
                <ChevronDown className="h-4 w-4 opacity-50" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baki">Bakı</SelectItem>
                <SelectItem value="gence">Gəncə</SelectItem>
                <SelectItem value="sumqayit">Sumqayıt</SelectItem>
                <SelectItem value="mingecevir">Mingəçevir</SelectItem>
                <SelectItem value="lenkeran">Lənkəran</SelectItem>
                <SelectItem value="sheki">Şəki</SelectItem>
                <SelectItem value="nakchivan">Naxçıvan</SelectItem>
                <SelectItem value="remote">Uzaqdan iş</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" size="lg" className="h-12 px-6 min-w-[140px] whitespace-nowrap">
            <span className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
              <span>İş tap</span>
            </span>
          </Button>
        </div>

        {showSuggestions && keyword.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border bg-popover p-2 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="space-y-1">
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Populyar axtarışlar
              </p>
              {popularSearches
                .filter((term) => term.toLowerCase().includes(keyword.toLowerCase()))
                .slice(0, 5)
                .map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handlePopularClick(term)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent rounded-md transition-colors"
                  >
                    <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {term}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </form>
  )
}